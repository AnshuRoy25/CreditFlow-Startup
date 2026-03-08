// routes/applyLoan/report.js

import express from 'express';
import multer from 'multer';
import LoanApplication from '../../models/LoanApplication.js';
import Report from '../../models/Report.js';
import createNotification from '../../helpers/createNotification.js';

const router = express.Router();

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});


// ─────────────────────────────────────────────────────────
// Scoring function — mock NTC model
// Replace this with real ML model call later
// Takes python service results + loan details
// Returns ntcScore and riskTier
// ─────────────────────────────────────────────────────────
function runNtcModel(pythonData, loanDetails) {

  const verificationScore = pythonData.employment_verification_score || 0;
  const regularityScore   = pythonData.salary_regularity_score || 0;
  const salaryMatch       = pythonData.salary_match ? 1 : 0;
  const discrepancy       = pythonData.discrepancy_percentage || 0;

  const monthlySalary = pythonData.actual_average_salary || 1;
  const loanAmount    = loanDetails.loanAmount || 0;
  const tenure        = loanDetails.preferred.tenureMonths || 12;
  const rate          = loanDetails.preferred.interestRate || 15;

  // Rough EMI calculation
  const r   = rate / 12 / 100;
  const emi = (loanAmount * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
  const emiToIncomeRatio = (emi / monthlySalary) * 100;

  // Simple weighted score — replace with real model
  let score = 0;
  score += verificationScore * 3;     // 0–300
  score += regularityScore * 2;       // 0–200
  score += salaryMatch * 150;         // 0 or 150
  score -= discrepancy * 5;           // penalty
  score -= Math.max(0, emiToIncomeRatio - 30) * 3; // penalty if EMI > 30% income

  // Clamp to 300–850
  const ntcScore = Math.min(850, Math.max(300, Math.round(score)));

  let riskTier;
  if      (ntcScore >= 750) riskTier = 'low';
  else if (ntcScore >= 650) riskTier = 'medium';
  else if (ntcScore >= 550) riskTier = 'high';
  else                      riskTier = 'very-high';

  return { ntcScore, riskTier, emiToIncomeRatio: Math.round(emiToIncomeRatio * 10) / 10 };
}


// ─────────────────────────────────────────────────────────
// Route 1 — Generate Report
// POST /api/apply-loan/report/generate
// User uploads bank statement PDF here
// Python service runs, NTC model runs, report saved
// ─────────────────────────────────────────────────────────
router.post('/generate',
  upload.single('bankStatement'),
  async (req, res) => {

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a PDF bank statement'
    });
  }

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'draft',
      currentStep: 'report-pending'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or not ready for report generation.'
      });
    }

    // ── Step 1: Call python service ───────────────────────
    const formData = new FormData();
    const pdfBlob  = new Blob([req.file.buffer], { type: 'application/pdf' });
    formData.append('bank_statement', pdfBlob, 'statement.pdf');
    formData.append('declared_employment', JSON.stringify(application.employmentDetails));

    const pythonResponse = await fetch(
      `${process.env.PYTHON_SERVICE_URL}/verify-employment`,
      {
        method: 'POST',
        headers: { 'X-Internal-Secret': process.env.INTERNAL_SECRET },
        body: formData
      }
    );

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('Python service error:', errorText);
      return res.status(500).json({
        success: false,
        message: 'Bank statement processing failed. Please try again.'
      });
    }

    const pythonData = await pythonResponse.json();

    // ── Step 2: Save bank statement results on application ─
    application.bankStatement = {
      uploadedAt: new Date(),
      employmentVerification: {
        declaredEmployer:             pythonData.declared_employer,
        detectedEmployer:             pythonData.detected_employer,
        employerMatch:                pythonData.employer_match,
        declaredSalary:               pythonData.declared_salary,
        actualAverageSalary:          pythonData.actual_average_salary,
        salaryMatch:                  pythonData.salary_match,
        salaryMonthsFound:            pythonData.salary_months_found,
        tenureDetectedMonths:         pythonData.tenure_detected_months,
        declaredTenureMonths:         pythonData.declared_tenure_months,
        tenureVerification:           pythonData.tenure_verification,
        salaryModeConfirmed:          pythonData.salary_mode_confirmed,
        employerCategory:             pythonData.employer_category,
        discrepancyPercentage:        pythonData.discrepancy_percentage,
        salaryRegularityScore:        pythonData.salary_regularity_score,
        employmentVerificationScore:  pythonData.employment_verification_score
      }
    };

    // ── Step 3: Run NTC model ─────────────────────────────
    const { ntcScore, riskTier, emiToIncomeRatio } = runNtcModel(pythonData, application.loanDetails);

    // ── Step 4: Save Report document ─────────────────────
    const report = await Report.create({
      applicationId: application._id,
      userId:        req.user.id,
      ntcScore,
      riskTier,
      inputSnapshot: {
        feature1:  pythonData.employment_verification_score,
        feature2:  pythonData.salary_regularity_score,
        feature3:  pythonData.salary_match ? 1 : 0,
        feature4:  pythonData.discrepancy_percentage,
        feature5:  pythonData.actual_average_salary,
        feature6:  emiToIncomeRatio,
        feature7:  application.loanDetails.loanAmount,
        feature8:  application.loanDetails.preferred.tenureMonths,
        feature9:  application.loanDetails.preferred.interestRate,
        feature10: pythonData.salary_months_found
      },
      modelVersion: 'ntc-v1'
    });

    // ── Step 5: Update application ────────────────────────
    application.reportId    = report._id;
    application.currentStep = 'report-generated';
    await application.save();

    // ── Step 6: Notify user ───────────────────────────────
    await createNotification(
      req.user.id,
      'Your Credit Report is Ready',
      `Your NTC score is ${ntcScore}. You can now view your report and choose a lender.`,
      'application',
      application.applicationId
    );

    return res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: {
        applicationId: application.applicationId,
        nextStep:      'report-generated',
        ntcScore,
        riskTier,
        employmentVerification: {
          declaredEmployer:    pythonData.declared_employer,
          detectedEmployer:    pythonData.detected_employer,
          employerMatch:       pythonData.employer_match,
          declaredSalary:      pythonData.declared_salary,
          actualAverageSalary: pythonData.actual_average_salary,
          salaryMatch:         pythonData.salary_match,
          tenureVerification:  pythonData.tenure_verification
        }
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


// ─────────────────────────────────────────────────────────
// Route 2 — Get Report Details
// GET /api/apply-loan/report/details
// Returns saved report for display on report screen
// ─────────────────────────────────────────────────────────
router.get('/details', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId: req.user.id,
      status: 'draft',
      currentStep: 'report-generated'
    }).populate('reportId');

    if (!application || !application.reportId) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.'
      });
    }

    const report = application.reportId;

    return res.status(200).json({
      success: true,
      data: {
        applicationId: application.applicationId,
        ntcScore:      report.ntcScore,
        riskTier:      report.riskTier,
        generatedAt:   report.createdAt,
        employmentVerification: {
          declaredEmployer:    application.bankStatement.employmentVerification.declaredEmployer,
          detectedEmployer:    application.bankStatement.employmentVerification.detectedEmployer,
          employerMatch:       application.bankStatement.employmentVerification.employerMatch,
          declaredSalary:      application.bankStatement.employmentVerification.declaredSalary,
          actualAverageSalary: application.bankStatement.employmentVerification.actualAverageSalary,
          salaryMatch:         application.bankStatement.employmentVerification.salaryMatch,
          tenureVerification:  application.bankStatement.employmentVerification.tenureVerification
        }
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


export default router;