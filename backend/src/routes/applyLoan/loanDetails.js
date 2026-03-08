// routes/applyLoan/loanDetails.js

import express from 'express';
import LoanApplication from '../../models/LoanApplication.js';

const router = express.Router();


// Route 8 — Submit Loan Details
// POST /api/apply-loan/loan-details/submit
router.post('/submit', async (req, res) => {

  const { loanAmount, purpose, preferredInterestRate, preferredTenureMonths } = req.body;

  if (!loanAmount || !purpose || !preferredInterestRate || !preferredTenureMonths) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
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

    const P = Number(loanAmount);
    const r = Number(preferredInterestRate) / 12 / 100;
    const n = Number(preferredTenureMonths);
    const calculatedEmi = Math.round(
      (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    );

    application.loanDetails = {
      loanAmount: P,
      purpose,
      calculatedEmi,
      preferred: {
        interestRate: Number(preferredInterestRate),
        tenureMonths: Number(preferredTenureMonths)
      },
      submittedAt: new Date()
    };

    if (application.currentStep === 'loan-details') {
      application.currentStep = 'report-pending';
      // bank-statement step now means: upload PDF + generate report
    }

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Loan details saved successfully',
      data: {
        applicationId: application.applicationId,
        nextStep: application.currentStep,
        calculatedEmi
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save loan details. Please try again.'
    });
  }
});


export default router;