import express from 'express';
import LoanApplication from '../../models/LoanApplication.js';

const router = express.Router();


// ─────────────────────────────────────────
// Route 1 — Get Current Application Status
// GET /api/apply-loan/status/current
// Called every time user lands on apply loan page
// Frontend uses response to decide what to show
// ─────────────────────────────────────────
router.get('/current', async (req, res) => {

  try {

    // Check for any active non terminal application
    const activeApplication = await LoanApplication.findOne({
      userId: req.user.id,
      status: { $in: ['draft', 'submitted', 'approved'] }
    });

    if (activeApplication) {
      return res.status(200).json({
        success: true,
        data: {
          hasActiveApplication: true,
          status: activeApplication.status,
          currentStep: activeApplication.currentStep,
          applicationId: activeApplication.applicationId
        }
      });
    }

    // No active application found
    // Check if user is in cooldown from last terminal application
    const lastApplication = await LoanApplication.findOne({
      userId: req.user.id,
      cooldownEndsAt: { $ne: null }
    }).sort({ updatedAt: -1 });

    if (lastApplication && lastApplication.cooldownEndsAt > new Date()) {

      // Calculate days remaining in cooldown
      const daysRemaining = Math.ceil(
        (lastApplication.cooldownEndsAt - new Date()) / (1000 * 60 * 60 * 24)
      );

      return res.status(200).json({
        success: true,
        data: {
          hasActiveApplication: false,
          inCooldown: true,
          daysRemaining,
          cooldownEndsAt: lastApplication.cooldownEndsAt,
          terminalState: lastApplication.terminalState
        }
      });
    }

    // Free to apply
    return res.status(200).json({
      success: true,
      data: {
        hasActiveApplication: false,
        inCooldown: false
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
// Route 2 — Start Fresh Application
// POST /api/apply-loan/status/start-fresh
// Only works if existing application is a draft
// Deletes old draft so user can start new one
// ─────────────────────────────────────────
router.post('/start-fresh', async (req, res) => {

  try {

    // Check if user is in cooldown first
    const lastApplication = await LoanApplication.findOne({
      userId: req.user.id,
      cooldownEndsAt: { $ne: null }
    }).sort({ updatedAt: -1 });

    if (lastApplication && lastApplication.cooldownEndsAt > new Date()) {
      const daysRemaining = Math.ceil(
        (lastApplication.cooldownEndsAt - new Date()) / (1000 * 60 * 60 * 24)
      );
      return res.status(403).json({
        success: false,
        message: `You can apply again in ${daysRemaining} days.`,
        data: {
          cooldownEndsAt: lastApplication.cooldownEndsAt
        }
      });
    }

    // Check if submitted or approved application exists
    // Cannot start fresh if application is already with lender
    const activeNonDraft = await LoanApplication.findOne({
      userId: req.user.id,
      status: { $in: ['submitted', 'approved'] }
    });

    if (activeNonDraft) {
      return res.status(403).json({
        success: false,
        message: 'You cannot start a new application while your current application is under review.'
      });
    }

    // Delete existing draft if any
    const existingDraft = await LoanApplication.findOne({
      userId: req.user.id,
      status: 'draft'
    });

    if (existingDraft) {
      await LoanApplication.deleteOne({ _id: existingDraft._id });
    }

    return res.status(200).json({
      success: true,
      message: 'Previous draft cleared. You can start a fresh application.'
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
// Route 3 — Withdraw Submitted Application
// POST /api/apply-loan/status/withdraw
// Only works on submitted applications
// Drafts do not need withdrawal — just edit them
// Approved and disbursed cannot be withdrawn
// ─────────────────────────────────────────
router.post('/withdraw', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId: req.user.id,
      status: 'submitted'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No submitted application found to withdraw.'
      });
    }

    application.status = 'withdrawn';
    application.terminalState = 'withdrawn';

    // 7 day cooldown after withdrawal
    application.cooldownEndsAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully. You can apply again after 7 days.',
      data: {
        cooldownEndsAt: application.cooldownEndsAt
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