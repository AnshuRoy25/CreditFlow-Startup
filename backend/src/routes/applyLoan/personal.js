// routes/applyLoan/personal.js

import express from 'express';
import User from '../../models/user.js';
import LoanApplication from '../../models/LoanApplication.js';
import calculateAndSaveCompletion from '../../helpers/calculateProfileCompletion.js';

const router = express.Router();

const otpStore = {};


// Route 1 — Verify PAN
// POST /api/apply-loan/personal/verify-pan
router.post('/verify-pan', async (req, res) => {
  const { pan } = req.body;

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!pan || !panRegex.test(pan.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid PAN format'
    });
  }

  try {
    const response = await fetch(
      'http://localhost:7777/api/verify-pan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan: pan.toUpperCase() })
      }
    );

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: 'PAN verification failed. Please check your PAN.'
      });
    }

    const data = await response.json();

    await User.findByIdAndUpdate(req.user.id, {
      pan: pan.toUpperCase(),
      panVerified: true
    });

    return res.status(200).json({
      success: true,
      message: 'PAN verified successfully',
      data: {
        name: data.name,
        pan: pan.toUpperCase()
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


// Route 2 — Send Aadhaar OTP
// POST /api/apply-loan/personal/verify-aadhaar
router.post('/verify-aadhaar', async (req, res) => {
  const { aadhaar } = req.body;

  const aadhaarRegex = /^[0-9]{12}$/;
  if (!aadhaar || !aadhaarRegex.test(aadhaar)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Aadhaar number. Must be 12 digits.'
    });
  }

  try {
    const response = await fetch(
      'http://localhost:7777/api/generate-aadhaar-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar_number: aadhaar })
      }
    );

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your Aadhaar registered mobile number'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


// Route 3 — Verify Aadhaar OTP
// POST /api/apply-loan/personal/verify-aadhaar-otp
router.post('/verify-aadhaar-otp', async (req, res) => {
  const { aadhaar, otp } = req.body;

  if (!aadhaar || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Aadhaar and OTP are required'
    });
  }

  try {
    const response = await fetch(
      'http://localhost:7777/api/verify-aadhaar-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaar_number: aadhaar,
          otp: otp
        })
      }
    );

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: 'Wrong OTP. Please try again.'
      });
    }

    const data = await response.json();

    await User.findByIdAndUpdate(req.user.id, {
      name: data.name,
      dob: data.dob,
      gender: data.gender,
      address: data.address,
      aadhaarVerified: true
    });

    await calculateAndSaveCompletion(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Aadhaar verified successfully',
      data: {
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        address: data.address
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


// Route 4 — Submit Personal Details
// POST /api/apply-loan/personal/submit
router.post('/submit', async (req, res) => {
  const { pan, name, dob, gender, address, email, mobile } = req.body;

  if (!pan || !name || !dob || !gender || !address || !email || !mobile) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {

    let application = await LoanApplication.findOne({
      userId: req.user.id,
      status: 'draft'
    });

    if (application) {
      application.personalDetails = {
        pan, name, dob, gender, address, email, mobile,
        panVerified: true,
        aadhaarVerified: true,
        submittedAt: new Date()
      };
      await application.save();
    } else {
      application = await LoanApplication.create({
        userId: req.user.id,
        status: 'draft',
        currentStep: 'employment-details',
        personalDetails: {
          pan, name, dob, gender, address, email, mobile,
          panVerified: true,
          aadhaarVerified: true,
          submittedAt: new Date()
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Personal details saved successfully',
      data: {
        applicationId: application.applicationId,
        nextStep: application.currentStep
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save details. Please try again.'
    });
  }
});


export default router;