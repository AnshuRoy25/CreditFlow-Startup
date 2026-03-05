import express from 'express';
import bcrypt from 'bcrypt';
import User from '../../models/user.js';

const router = express.Router();

// In memory OTP store for registration
// Same pattern as Aadhaar OTP
const registrationOtpStore = {};


// ─────────────────────────────────────────
// Route 1 — Send Registration OTP
// POST /api/auth/send-otp
// User enters mobile number
// We check not already registered
// Send OTP to that number
// ─────────────────────────────────────────
router.post('/send-otp', async (req, res) => {

  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number is required'
    });
  }

  const mobileRegex = /^[0-9]{10}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid mobile number. Must be 10 digits.'
    });
  }

  try {

    // Check if mobile already registered
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered. Please login.'
      });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 5 minute expiry
    registrationOtpStore[mobile] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    // Print to terminal for now
    // Replace with real SMS service later
    console.log(`Registration OTP for ${mobile} is ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your mobile number'
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
// Route 2 — Verify Registration OTP
// POST /api/auth/verify-otp
// User enters OTP
// We verify it is correct and not expired
// ─────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {

  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number and OTP are required'
    });
  }

  const session = registrationOtpStore[mobile];
  if (!session) {
    return res.status(400).json({
      success: false,
      message: 'OTP session not found. Please request a new OTP.'
    });
  }

  if (Date.now() > session.expiresAt) {
    delete registrationOtpStore[mobile];
    return res.status(400).json({
      success: false,
      message: 'OTP has expired. Please request a new OTP.'
    });
  }

  if (session.otp !== otp) {
    return res.status(400).json({
      success: false,
      message: 'Wrong OTP. Please try again.'
    });
  }

  // OTP verified
  // Mark this mobile as otp verified in store
  // So Route 3 knows OTP was completed before setting MPIN
  registrationOtpStore[mobile].otpVerified = true;

  return res.status(200).json({
    success: true,
    message: 'OTP verified successfully. Please set your MPIN.'
  });
});


// ─────────────────────────────────────────
// Route 3 — Set MPIN and Create Account
// POST /api/auth/set-mpin
// User sets 4 digit MPIN and confirms it
// Account created here
// ─────────────────────────────────────────
router.post('/set-mpin', async (req, res) => {

  const { mobile, mpin, confirmMpin } = req.body;

  if (!mobile || !mpin || !confirmMpin) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  // MPIN must be exactly 4 digits
  const mpinRegex = /^[0-9]{4}$/;
  if (!mpinRegex.test(mpin)) {
    return res.status(400).json({
      success: false,
      message: 'MPIN must be exactly 4 digits'
    });
  }

  if (mpin !== confirmMpin) {
    return res.status(400).json({
      success: false,
      message: 'MPINs do not match'
    });
  }

  // Check OTP was actually verified before reaching here
  const session = registrationOtpStore[mobile];
  if (!session || !session.otpVerified) {
    return res.status(400).json({
      success: false,
      message: 'Please verify your mobile number first.'
    });
  }

  try {

    // Check mobile not already registered
    // Double check in case of race condition
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered. Please login.'
      });
    }

    // Hash MPIN before saving
    const saltRounds = 10;
    const hashedMpin = await bcrypt.hash(mpin, saltRounds);

    // Create user account
    const user = await User.create({
      mobile,
      password: hashedMpin,
      mobileVerified: true
    });

    // Clean up OTP store
    delete registrationOtpStore[mobile];

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        userId: user._id,
        mobile: user.mobile
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