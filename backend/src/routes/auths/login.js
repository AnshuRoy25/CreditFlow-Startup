import express from 'express';
import bcrypt from 'bcrypt';
import User from '../../models/user.js';

const router = express.Router();


// POST /api/auth/login
router.post('/login', async (req, res) => {

  const { mobile, mpin } = req.body;

  if (!mobile || !mpin) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number and MPIN are required'
    });
  }

  const mobileRegex = /^[0-9]{10}$/;
  if (!mobileRegex.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid mobile number. Must be 10 digits.'
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

  try {

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid mobile number or MPIN'
      });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Compare entered MPIN against stored bcrypt hash
    const mpinMatch = await bcrypt.compare(mpin, user.password);

    if (!mpinMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid mobile number or MPIN'
      });
    }

    // No JWT for now
    // Just return user details on successful login
    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        userId: user._id,
        name: user.name,
        mobile: user.mobile,
        accountStatus: user.accountStatus
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