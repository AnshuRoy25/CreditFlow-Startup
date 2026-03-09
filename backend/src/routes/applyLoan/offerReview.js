// routes/applyLoan/offerReview.js

import express from 'express';
import LoanApplication from '../../models/LoanApplication.js';
import createNotification from '../../helpers/createNotification.js';

const router = express.Router();

// TEMPORARY — remove when JWT middleware is added
router.use((req, res, next) => {
  req.user = { id: '69a9b6658994ecc2507764fb' };
  next();
});


// ─────────────────────────────────────────────────────────
// Route 1 — Get Offer Details
// GET /api/apply-loan/offer-review/details
// Called when user lands on offer review page
// Shows the approved offer from the lender
// ─────────────────────────────────────────────────────────
router.get('/details', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'approved',
      currentStep: 'offer-review'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No approved offer found.'
      });
    }

    const ls = application.lenderSelection;

    return res.status(200).json({
      success: true,
      data: {
        applicationId:      application.applicationId,
        lenderName:         ls.name,
        approvedLoanAmount: ls.approvedLoanAmount,
        approvedRate:       ls.approvedRate,
        approvedTenure:     ls.approvedTenure,
        approvedEmi:        ls.approvedEmi,
        lenderRemarks:      ls.lenderRemarks,
        respondedAt:        ls.lenderRespondedAt
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


// ─────────────────────────────────────────────────────────
// Route 2 — Accept Offer
// POST /api/apply-loan/offer-review/accept
// User has reviewed the offer and clicked Accept
// currentStep moves to esign — nothing disbursed yet
// ─────────────────────────────────────────────────────────
router.post('/accept', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'approved',
      currentStep: 'offer-review'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No approved offer found to accept.'
      });
    }

    // ── Send data to Python service to generate loan agreement PDF ──
    const pythonResponse = await fetch(
      `${process.env.PYTHON_SERVICE_URL}/generate-loan-agreement`,
      {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SECRET
        },
        body: JSON.stringify({
          applicationId:      application.applicationId,
          borrower: {
            name:    application.personalDetails.name,
            pan:     application.personalDetails.pan,
            address: application.personalDetails.address,
            mobile:  application.personalDetails.mobile,
            email:   application.personalDetails.email
          },
          loan: {
            approvedLoanAmount: application.lenderSelection.approvedLoanAmount,
            approvedRate:       application.lenderSelection.approvedRate,
            approvedTenure:     application.lenderSelection.approvedTenure,
            approvedEmi:        application.lenderSelection.approvedEmi
          },
          lender: {
            name: application.lenderSelection.name
          }
        })
      }
    );

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('Python service error:', errorText);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate loan agreement. Please try again.'
      });
    }

    const pythonData = await pythonResponse.json();

    // ── Update application ──────────────────────────────
    application.currentStep          = 'esign';
    application.loanAgreementPath    = pythonData.file_path;
    await application.save();

    await createNotification(
      req.user.id,
      'Offer Accepted',
      `You have accepted the loan offer from ${application.lenderSelection.name}. Please complete the eSign process to finalise your loan.`,
      'application',
      application.applicationId
    );

    return res.status(200).json({
      success: true,
      message: 'Offer accepted. Please proceed to eSign.',
      data: {
        applicationId: application.applicationId,
        nextStep: 'esign'
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