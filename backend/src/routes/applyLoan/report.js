// routes/applyLoan/report.js

import express from 'express';
import multer from 'multer';
import LoanApplication from '../../models/LoanApplication.js';
import Report from '../../models/Report.js';
import createNotification from '../../helpers/createNotification.js';

const router = express.Router();

// TEMPORARY — remove when JWT middleware is added
router.use((req, res, next) => {
  req.user = { id: '69a9b6658994ecc2507764fb' };
  next();
});

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
// Route 1 — Generate Report
// POST /api/apply-loan/report/generate
//
// Upload PDF → python service does everything →
// returns ntc_score, risk_tier, feature1–feature10
// We save Report document and advance the step
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
          message: 'Application not found or not ready. Please complete loan details first.'
        });
      }

      // ── Send PDF + loan details to python service ───────
      const formData = new FormData();
      const pdfBlob  = new Blob([req.file.buffer], { type: 'application/pdf' });
      formData.append('bank_statement', pdfBlob, 'statement.pdf');

      const pythonResponse = await fetch(
        `${process.env.PYTHON_SERVICE_URL}/generate-report`,
        {
          method:  'POST',
          headers: { 'X-Internal-Secret': process.env.INTERNAL_SECRET },
          body:    formData
        }
      );

      if (!pythonResponse.ok) {
        const errorText = await pythonResponse.text();
        console.error('Python service error:', errorText);
        return res.status(500).json({
          success: false,
          message: 'Report generation failed. Please try again.'
        });
      }

      const pythonData = await pythonResponse.json();

      // ── Save Report document ────────────────────────────
      const report = await Report.create({
        applicationId: application._id,
        userId:        req.user.id,
        ntcScore:      pythonData.ntc_score,
        riskTier:      pythonData.risk_tier,
        inputSnapshot: {
          feature1:  pythonData.feature1,
          feature2:  pythonData.feature2,
          feature3:  pythonData.feature3,
          feature4:  pythonData.feature4,
          feature5:  pythonData.feature5,
          feature6:  pythonData.feature6,
          feature7:  pythonData.feature7,
          feature8:  pythonData.feature8,
          feature9:  pythonData.feature9,
          feature10: pythonData.feature10
        },
        modelVersion: pythonData.model_version || 'ntc-v1'
      });

      // ── Update application ──────────────────────────────
      application.reportId    = report._id;
      application.currentStep = 'report-generated';
      await application.save();

      // ── Notify user ─────────────────────────────────────
      await createNotification(
        req.user.id,
        'Your Credit Report is Ready',
        `Your NTC score is ${pythonData.ntc_score}. You can now view eligible lenders and choose the best offer.`,
        'application',
        application.applicationId
      );

      return res.status(200).json({
        success: true,
        message: 'Report generated successfully',
        data: {
          applicationId: application.applicationId,
          nextStep:      'report-generated',
          ntcScore:      pythonData.ntc_score,
          riskTier:      pythonData.risk_tier
        }
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.'
      });
    }
  }
);


// ─────────────────────────────────────────────────────────
// Route 2 — Get Report Details
// GET /api/apply-loan/report/details
// ─────────────────────────────────────────────────────────
router.get('/details', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'draft',
      currentStep: { $in: ['report-generated', 'lender-selected', 'confirmation'] }
    }).populate('reportId');

    if (!application || !application.reportId) {
      return res.status(404).json({
        success: false,
        message: 'Report not found. Please generate your report first.'
      });
    }

    const report = application.reportId;

    return res.status(200).json({
      success: true,
      data: {
        applicationId: application.applicationId,
        ntcScore:      report.ntcScore,
        riskTier:      report.riskTier,
        generatedAt:   report.createdAt
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