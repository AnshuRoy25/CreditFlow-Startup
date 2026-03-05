import express from 'express';
import Complaint from '../../models/Complaint.js';
import User from '../../models/user.js';
import sendComplaintEmail from '../../helpers/sendComplaintEmail.js';

const router = express.Router();

// TEMPORARY — remove when JWT middleware is added
router.use((req, res, next) => {
  req.user = { id: '69a9b6658994ecc2507764fb' };
  next();
});

// ─────────────────────────────────────────
// Route 1 — Submit Complaint
// POST /api/complaint/submit
// ─────────────────────────────────────────
router.post('/submit', async (req, res) => {

  const { category, description, applicationId } = req.body;

  if (!category || !description) {
    return res.status(400).json({
      success: false,
      message: 'Category and description are required'
    });
  }

  if (description.trim().length < 20) {
    return res.status(400).json({
      success: false,
      message: 'Please describe your issue in at least 20 characters'
    });
  }

  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Save complaint to MongoDB
    const complaint = await Complaint.create({
      userId: req.user.id,
      applicationId: applicationId || null,
      category,
      description: description.trim()
    });

    // Send email to CreditFlow support
    await sendComplaintEmail(complaint, user);

    return res.status(201).json({
      success: true,
      message: 'Your complaint has been submitted. Our team will get back to you within 48 hours.',
      data: {
        complaintId: complaint._id,
        status: complaint.status,
        submittedAt: complaint.createdAt
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
// Route 2 — Get My Complaints
// GET /api/complaint/my-complaints
// User can see all their past complaints and status
// ─────────────────────────────────────────
router.get('/my-complaints', async (req, res) => {

  try {

    const complaints = await Complaint.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });
    // sort by newest first

    return res.status(200).json({
      success: true,
      data: complaints.map(c => ({
        complaintId: c._id,
        category: c.category,
        description: c.description,
        applicationId: c.applicationId,
        status: c.status,
        resolvedAt: c.resolvedAt,
        resolutionNote: c.resolutionNote,
        submittedAt: c.createdAt
      }))
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