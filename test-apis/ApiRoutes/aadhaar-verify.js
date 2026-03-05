import express from 'express';
import AadhaarCard from '../models/aadhaarcard.js';

const router = express.Router();

// OTP store needed in test server too
// So Route 2 can verify OTP against what was generated
const otpStore = {};


// Route 1 — Generate OTP
// POST /api/generate-aadhaar-otp
router.post('/generate-aadhaar-otp', async (req, res) => {

  const { aadhaar_number } = req.body;

  if (!aadhaar_number) {
    return res.status(400).json({
      success: false,
      message: 'Aadhaar number is required'
    });
  }

  const aadhaarRegex = /^[0-9]{12}$/;
  if (!aadhaarRegex.test(aadhaar_number)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Aadhaar number. Must be 12 digits.'
    });
  }

  try {

    const record = await AadhaarCard.findOne({ aadhaar: aadhaar_number });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Aadhaar number not found'
      });
    }

    // Generate random 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate random transaction ID to simulate real Setu API
    const transactionId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);

    // Store OTP and transaction ID in memory with 5 minute expiry
    otpStore[aadhaar_number] = {
      otp,
      transactionId,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    // Print OTP to terminal since no SMS for now
    console.log(`OTP for Aadhaar ${aadhaar_number} is ${otp}`);
    console.log(`Transaction ID is ${transactionId}`);

    // Return transaction ID to main backend
    // Main backend stores this and sends back in Route 2
    return res.status(200).json({
      success: true,
      message: `OTP sent to mobile ending in ${record.mobile.slice(-4)}`,
      transaction_id: transactionId
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
});


// Route 2 — Verify OTP
// POST /api/verify-aadhaar-otp
router.post('/verify-aadhaar-otp', async (req, res) => {

  const { aadhaar_number, otp, transaction_id } = req.body;

  if (!aadhaar_number || !otp || !transaction_id) {
    return res.status(400).json({
      success: false,
      message: 'Aadhaar number, OTP and transaction ID are required'
    });
  }

  // Check if session exists
  const session = otpStore[aadhaar_number];
  if (!session) {
    return res.status(400).json({
      success: false,
      message: 'OTP session not found. Please request a new OTP.'
    });
  }

  // Check if session expired
  if (Date.now() > session.expiresAt) {
    delete otpStore[aadhaar_number];
    return res.status(400).json({
      success: false,
      message: 'OTP has expired. Please request a new OTP.'
    });
  }

  // Verify transaction ID matches
  if (session.transactionId !== transaction_id) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction ID.'
    });
  }

  // Verify OTP matches
  if (session.otp !== otp) {
    return res.status(400).json({
      success: false,
      message: 'Wrong OTP. Please try again.'
    });
  }

  try {

    const record = await AadhaarCard.findOne({ aadhaar: aadhaar_number });

    // Clean up session after successful verification
    delete otpStore[aadhaar_number];

    return res.status(200).json({
      success: true,
      message: 'Aadhaar verified successfully',
      name: record.name,
      dob: record.dob,
      gender: record.gender,
      address: record.address
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
});


export default router;