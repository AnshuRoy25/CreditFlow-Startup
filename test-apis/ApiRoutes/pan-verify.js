import express from 'express';
import mongoose from 'mongoose';
import PanRecord from '../models/panrecord.js';

const router = express.Router();


// POST /api/verify-pan
router.post('/verify-pan', async (req, res) => {

  const { pan } = req.body;

  if (!pan) {
    return res.status(400).json({
      success: false,
      message: 'PAN number is required'
    });
  }

  try {

    // Search PAN collection for this pan number
    const record = await PanRecord.findOne({
      pan: pan.toUpperCase()
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'PAN not found'
      });
    }

    return res.status(200).json({
      success: true,
      name: record.name
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
