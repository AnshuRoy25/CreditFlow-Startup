// routes/applyLoan/eSign.js

import express from 'express';
import LoanApplication from '../../models/LoanApplication.js';
import createNotification from '../../helpers/createNotification.js';

const router = express.Router();

// ─── REMOVED hardcoded req.user block ───
// auth middleware in index.js now handles this

// In memory OTP store for eSign
const eSignOtpStore = {};


// ─────────────────────────────────────────────────────────
// Route 1 — Initiate eSign
// GET /api/apply-loan/esign/initiate
// ─────────────────────────────────────────────────────────
router.get('/initiate', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'approved',
      currentStep: 'esign'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application found pending eSign.'
      });
    }

    const pythonResponse = await fetch(
      `${process.env.PYTHON_SERVICE_URL}/get-loan-agreement/${application.applicationId}`,
      {
        method:  'GET',
        headers: { 'X-Internal-Secret': process.env.INTERNAL_SECRET }
      }
    );

    if (!pythonResponse.ok) {
      return res.status(404).json({
        success: false,
        message: 'Loan agreement not found. Please contact support.'
      });
    }

    const pdfBuffer = Buffer.from(await pythonResponse.arrayBuffer());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=loan_agreement_${application.applicationId}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


// ─────────────────────────────────────────────────────────
// Route 2 — Send Aadhaar OTP
// POST /api/apply-loan/esign/send-otp
// ─────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {

  const { aadhaar } = req.body;

  const aadhaarRegex = /^[0-9]{12}$/;
  if (!aadhaar || !aadhaarRegex.test(aadhaar)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Aadhaar number. Must be 12 digits.'
    });
  }

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'approved',
      currentStep: 'esign'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application found pending eSign.'
      });
    }

    const response = await fetch(
      'http://localhost:7777/api/generate-aadhaar-otp',
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ aadhaar_number: aadhaar })
      }
    );

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    eSignOtpStore[req.user.id] = {
      aadhaar,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your Aadhaar registered mobile number'
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
// Route 3 — Complete eSign
// POST /api/apply-loan/esign/complete
// ─────────────────────────────────────────────────────────
router.post('/complete', async (req, res) => {

  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: 'OTP is required'
    });
  }

  const session = eSignOtpStore[req.user.id];
  if (!session) {
    return res.status(400).json({
      success: false,
      message: 'OTP session not found. Please request a new OTP.'
    });
  }

  if (Date.now() > session.expiresAt) {
    delete eSignOtpStore[req.user.id];
    return res.status(400).json({
      success: false,
      message: 'OTP has expired. Please request a new OTP.'
    });
  }

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'approved',
      currentStep: 'esign'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application found pending eSign.'
      });
    }

    const response = await fetch(
      'http://localhost:7777/api/verify-aadhaar-otp',
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          aadhaar_number: session.aadhaar,
          otp
        })
      }
    );

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: 'Wrong OTP. Please try again.'
      });
    }

    delete eSignOtpStore[req.user.id];

    application.currentStep = 'application-track';
    application.status      = 'pre-disbursement';
    await application.save();

    await fetch(
      `${process.env.PYTHON_SERVICE_URL}/delete-loan-agreement`,
      {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SECRET
        },
        body: JSON.stringify({ applicationId: application.applicationId })
      }
    );

    await createNotification(
      req.user.id,
      'eSign Complete',
      `Your loan agreement has been signed successfully. ${application.lenderSelection.name} will disburse your loan shortly.`,
      'application',
      application.applicationId
    );

    return res.status(200).json({
      success: true,
      message: 'eSign completed successfully. Your loan will be disbursed shortly.',
      data: {
        applicationId: application.applicationId,
        nextStep:      'application-track',
        status:        'pre-disbursement'
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