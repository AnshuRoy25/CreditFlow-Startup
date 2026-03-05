import express from 'express';
import User from '../models/user.js';
import calculateAndSaveCompletion from '../helpers/calculateProfileCompletion.js';

const router = express.Router();

// In memory OTP store for Aadhaar verification
// Same pattern as everywhere else
const aadhaarOtpStore = {};


// ─────────────────────────────────────────
// Route 1 — Get Profile
// GET /api/profile
// Called when profile page loads
// Returns all user data and completion percentage
// ─────────────────────────────────────────
router.get('/', async (req, res) => {

  try {

    const user = await User.findById(req.user.id).select('-password');
    // select('-password') means return everything except password
    // Never send hashed MPIN to frontend

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        dob: user.dob,
        gender: user.gender,
        address: user.address,
        pan: user.pan,
        mobileVerified: user.mobileVerified,
        emailVerified: user.emailVerified,
        panVerified: user.panVerified,
        aadhaarVerified: user.aadhaarVerified,
        accountStatus: user.accountStatus,
        profileCompletionPercentage: user.profileCompletionPercentage
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


// ─────────────────────────────────────────
// Route 2 — Verify PAN from Profile Page
// POST /api/profile/verify-pan
// User clicks Verify PAN button
// Calls PAN API and saves to User model
// ─────────────────────────────────────────
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

    // Check PAN not already used by another user
    const existingPan = await User.findOne({
      pan: pan.toUpperCase(),
      _id: { $ne: req.user.id }
      // $ne means not equal
      // So we exclude current user from this check
    });

    if (existingPan) {
      return res.status(400).json({
        success: false,
        message: 'This PAN is already linked to another account.'
      });
    }

    // Call PAN verification API
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

    // Save PAN and name to User model
    // Name from PAN API cross checked later with Aadhaar
    await User.findByIdAndUpdate(req.user.id, {
      pan: pan.toUpperCase(),
      panVerified: true
    });

    // Recalculate and save completion percentage
    const profileCompletionPercentage = await calculateAndSaveCompletion(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'PAN verified successfully',
      data: {
        pan: pan.toUpperCase(),
        name: data.name,
        profileCompletionPercentage
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


// ─────────────────────────────────────────
// Route 3 — Send Aadhaar OTP from Profile Page
// POST /api/profile/verify-aadhaar
// User clicks Verify Aadhaar button
// Sends OTP to Aadhaar registered mobile
// ─────────────────────────────────────────
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

    // Call test Aadhaar API to generate OTP
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

    // Store aadhaar in memory so Route 4 knows
    // which aadhaar to verify OTP against
    aadhaarOtpStore[req.user.id] = {
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


// ─────────────────────────────────────────
// Route 4 — Verify Aadhaar OTP from Profile Page
// POST /api/profile/verify-aadhaar-otp
// User enters OTP
// On success save name dob gender address to User model
// ─────────────────────────────────────────
router.post('/verify-aadhaar-otp', async (req, res) => {

  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: 'OTP is required'
    });
  }

  // Get aadhaar from memory store using userId
  const session = aadhaarOtpStore[req.user.id];
  if (!session) {
    return res.status(400).json({
      success: false,
      message: 'OTP session not found. Please request a new OTP.'
    });
  }

  if (Date.now() > session.expiresAt) {
    delete aadhaarOtpStore[req.user.id];
    return res.status(400).json({
      success: false,
      message: 'OTP has expired. Please request a new OTP.'
    });
  }

  try {

    // Call test Aadhaar API to verify OTP
    const response = await fetch(
      'http://localhost:7777/api/verify-aadhaar-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

    const data = await response.json();

    // Save all Aadhaar autofetched details to User model
    // These fields are now locked — never editable by user
    await User.findByIdAndUpdate(req.user.id, {
      name: data.name,
      dob: data.dob,
      gender: data.gender,
      address: data.address,
      aadhaarVerified: true
    });

    // Clean up session
    delete aadhaarOtpStore[req.user.id];

    // Recalculate and save completion percentage
    const profileCompletionPercentage = await calculateAndSaveCompletion(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Aadhaar verified successfully',
      data: {
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        address: data.address,
        profileCompletionPercentage
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


// ─────────────────────────────────────────
// Route 5 — Update Email
// POST /api/profile/update-email
// User types email and clicks save
// Only manually editable field on profile page
// ─────────────────────────────────────────
router.post('/update-email', async (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  try {

    // Check email not already used by another user
    const existingEmail = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: req.user.id }
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'This email is already linked to another account.'
      });
    }

    await User.findByIdAndUpdate(req.user.id, {
      email: email.toLowerCase()
    });

    // Recalculate and save completion percentage
    const profileCompletionPercentage = await calculateAndSaveCompletion(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      data: {
        email: email.toLowerCase(),
        profileCompletionPercentage
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