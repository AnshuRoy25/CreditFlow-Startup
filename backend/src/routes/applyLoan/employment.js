// routes/applyLoan/employment.js

import express from 'express';
import LoanApplication from '../../models/LoanApplication.js';

const router = express.Router();


// Route 5 — Verify GST
// POST /api/apply-loan/employment/verify-gst
router.post('/verify-gst', async (req, res) => {
  const { gst } = req.body;

  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gst || !gstRegex.test(gst.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid GST number format'
    });
  }

  try {
    const response = await fetch(
      'https://your-gst-verification-api.com/verify',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GST_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gstin: gst.toUpperCase() })
      }
    );

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: 'GST verification failed. Please check your GST number.'
      });
    }

    const data = await response.json();

    return res.status(200).json({
      success: true,
      message: 'GST verified successfully',
      data: {
        businessName: data.business_name,
        businessStatus: data.status,
        gst: gst.toUpperCase()
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


// Route 6 — Submit Employment Details
// POST /api/apply-loan/employment/submit
router.post('/submit', async (req, res) => {
  const { employmentType } = req.body;

  if (!employmentType) {
    return res.status(400).json({
      success: false,
      message: 'Employment type is required'
    });
  }

  let employmentDetails = {};

  if (employmentType === 'salaried') {

    const { employer, designation, employmentCategory, tenureMonths, monthlySalary, modeOfSalary } = req.body;

    if (!employer || !designation || !employmentCategory || !tenureMonths || !monthlySalary || !modeOfSalary) {
      return res.status(400).json({
        success: false,
        message: 'All salaried employment fields are required'
      });
    }

    employmentDetails = {
      employmentType: 'salaried',
      salaried: {
        employer, designation, employmentCategory,
        tenureMonths: Number(tenureMonths),
        monthlySalary: Number(monthlySalary),
        modeOfSalary
      },
      submittedAt: new Date()
    };

  } else if (employmentType === 'self-employed') {

    const { businessNature, vintageMonths, monthlyIncome, gstNumber, gstVerified } = req.body;

    if (!businessNature || !vintageMonths || !monthlyIncome) {
      return res.status(400).json({
        success: false,
        message: 'All self employment fields are required'
      });
    }

    employmentDetails = {
      employmentType: 'self-employed',
      selfEmployed: {
        businessNature,
        vintageMonths: Number(vintageMonths),
        monthlyIncome: Number(monthlyIncome),
        gstNumber: gstNumber ? gstNumber.toUpperCase() : null,
        gstVerified: gstVerified === true
      },
      submittedAt: new Date()
    };

  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid employment type'
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

    application.employmentDetails = employmentDetails;

    if (application.currentStep === 'employment-details') {
      application.currentStep = 'loan-details';
    }
    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Employment details saved successfully',
      data: {
        applicationId: application.applicationId,
        nextStep: application.currentStep
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save employment details. Please try again.'
    });
  }
});


export default router;