// routes/applyLoan/bankStatement.js

import express from 'express';
import multer from 'multer';
import LoanApplication from '../../models/LoanApplication.js';

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});

router.use((req, res, next) => {
  req.user = { id: '69a9b6658994ecc2507764fb' };
  next();
});


// Route 7 — Submit Bank Statement
// POST /api/apply-loan/bank-statement/submit
router.post('/submit',
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
      userId: req.user.id,
      status: 'draft'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found. Please start from personal details.'
      });
    }

    const formData = new FormData();
    const pdfBlob = new Blob([req.file.buffer], { type: 'application/pdf' });
    formData.append('bank_statement', pdfBlob, 'statement.pdf');
    formData.append('declared_employment', JSON.stringify(application.employmentDetails));

    const pythonResponse = await fetch(
      `${process.env.PYTHON_SERVICE_URL}/verify-employment`,
      {
        method: 'POST',
        headers: {
          'X-Internal-Secret': process.env.INTERNAL_SECRET
        },
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

    application.bankStatement = {
      uploadedAt: new Date(),
      employmentVerification: {
        declaredEmployer:               pythonData.declared_employer,
        detectedEmployer:               pythonData.detected_employer,
        employerMatch:                  pythonData.employer_match,
        declaredSalary:                 pythonData.declared_salary,
        actualAverageSalary:            pythonData.actual_average_salary,
        salaryMatch:                    pythonData.salary_match,
        salaryMonthsFound:              pythonData.salary_months_found,
        tenureDetectedMonths:           pythonData.tenure_detected_months,
        declaredTenureMonths:           pythonData.declared_tenure_months,
        tenureVerification:             pythonData.tenure_verification,
        salaryModeConfirmed:            pythonData.salary_mode_confirmed,
        employerCategory:               pythonData.employer_category,
        discrepancyPercentage:          pythonData.discrepancy_percentage,
        salaryRegularityScore:          pythonData.salary_regularity_score,
        employmentVerificationScore:    pythonData.employment_verification_score
      }
    };

    if (application.currentStep === 'bank-statement') {
      application.currentStep = 'loan-details';
    }

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Bank statement submitted successfully',
      data: {
        applicationId: application.applicationId,
        nextStep: application.currentStep,
        employmentVerification: {
          declaredEmployer:       pythonData.declared_employer,
          detectedEmployer:       pythonData.detected_employer,
          employerMatch:          pythonData.employer_match,
          declaredSalary:         pythonData.declared_salary,
          actualAverageSalary:    pythonData.actual_average_salary,
          salaryMatch:            pythonData.salary_match,
          salaryMonthsFound:      pythonData.salary_months_found,
          tenureDetectedMonths:   pythonData.tenure_detected_months,
          declaredTenureMonths:   pythonData.declared_tenure_months,
          tenureVerification:     pythonData.tenure_verification,
          salaryModeConfirmed:    pythonData.salary_mode_confirmed
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