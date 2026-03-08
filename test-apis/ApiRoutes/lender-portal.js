// test-apis/ApiRoutes/lender-portal.js
// ─────────────────────────────────────────────────────────
// Simulates a lender's internal portal.
// The lender (you, during testing) can:
//   - See all applications submitted to them
//   - Approve with final loan terms
//   - Reject with a reason
//
// This server calls back CreditFlow's /api/lender-callback/decision
// with the decision. CreditFlow updates the DB and notifies the user.
//
// Run this as part of the test-apis server (port 7777).
// ─────────────────────────────────────────────────────────

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LoanApplication from '../models/lenderloanapplication.js';

dotenv.config();

const router = express.Router();

// ─── Inline LoanApplication model ────────────────────────
// We read directly from the same MongoDB as CreditFlow backend.
// Same DB URI in test-apis/.env
// We only define the fields we need to display.
// ─────────────────────────────────────────────────────────


// ─── Helper: call back CreditFlow ────────────────────────
const CREDITFLOW_URL      = process.env.CREDITFLOW_URL || 'http://localhost:4000';
const LENDER_SECRET       = process.env.LENDER_CALLBACK_SECRET;

async function notifyCreditFlow(applicationId, decision, payload) {
  const response = await fetch(`${CREDITFLOW_URL}/api/lender-callback/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-lender-secret': LENDER_SECRET
    },
    body: JSON.stringify({ applicationId, decision, ...payload })
  });
  return response;
}


// ─────────────────────────────────────────
// Route 1 — List all submitted applications
// GET /api/lender/applications
// Shows all applications that are in 'submitted' state
// ─────────────────────────────────────────
router.get('/applications', async (req, res) => {

  try {

    // Optional filter by lenderCode e.g. ?lenderId=LND001
    const { lenderId } = req.query;

    const query = { status: 'submitted' };
    if (lenderId) {
      query['lenderSelection.lenderCode'] = lenderId;
    }

    const applications = await LenderPortalApp.find(query).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications.map(app => ({
        applicationId:    app.applicationId,
        status:           app.status,
        submittedAt:      app.updatedAt,
        selectedLender:   app.lenderSelection?.lenderCode,
        lenderName:       app.lenderSelection?.name,

        // Borrower summary
        borrower: {
          name:             app.personalDetails?.name,
          pan:              app.personalDetails?.pan,
          mobile:           app.personalDetails?.mobile,
          email:            app.personalDetails?.email
        },

        // Employment summary
        employment: {
          type:             app.employmentDetails?.employmentType,
          employer:         app.employmentDetails?.salaried?.employer || app.employmentDetails?.selfEmployed?.businessNature,
          monthlyIncome:    app.employmentDetails?.salaried?.monthlySalary || app.employmentDetails?.selfEmployed?.monthlyIncome,
          tenureMonths:     app.employmentDetails?.salaried?.tenureMonths || app.employmentDetails?.selfEmployed?.vintageMonths
        },

        // Bank statement verification summary
        verification: {
          salaryMatch:       app.bankStatement?.employmentVerification?.salaryMatch,
          employerMatch:     app.bankStatement?.employmentVerification?.employerMatch,
          tenureVerification: app.bankStatement?.employmentVerification?.tenureVerification,
          actualAvgSalary:   app.bankStatement?.employmentVerification?.actualAverageSalary
        },

        // What borrower asked for
        loanRequest: {
          amount:            app.loanDetails?.loanAmount,
          purpose:           app.loanDetails?.purpose,
          preferredRate:     app.loanDetails?.preferred?.interestRate,
          preferredTenure:   app.loanDetails?.preferred?.tenureMonths,
          calculatedEmi:     app.loanDetails?.calculatedEmi
        },

        // What CreditFlow offered this borrower
        offeredTerms: {
          rate:              app.lenderSelection?.offeredInterestRate,
          tenure:            app.lenderSelection?.selectedTenureMonths,
          emi:               app.lenderSelection?.estimatedEmi,
          processingFee:     app.lenderSelection?.processingFeeAmount
        }
      }))
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});


// ─────────────────────────────────────────
// Route 2 — Get full details of one application
// GET /api/lender/applications/:applicationId
// ─────────────────────────────────────────
router.get('/applications/:applicationId', async (req, res) => {

  try {

    const app = await LenderPortalApp.findOne({
      applicationId: req.params.applicationId
    });

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    return res.status(200).json({ success: true, data: app });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});


// ─────────────────────────────────────────
// Route 3 — Approve an application
// POST /api/lender/applications/:applicationId/approve
//
// Body: {
//   approvedAmount:  150000,
//   approvedRate:    19.5,
//   approvedTenure:  18,
//   approvedEmi:     9200,
//   processingFee:   3750,   // optional — defaults to what CreditFlow calculated
//   remarks:         "Approved with reduced amount"  // optional
// }
// ─────────────────────────────────────────
router.post('/applications/:applicationId/approve', async (req, res) => {

  const { applicationId } = req.params;
  const { approvedAmount, approvedRate, approvedTenure, approvedEmi, processingFee, remarks } = req.body;

  if (!approvedAmount || !approvedRate || !approvedTenure || !approvedEmi) {
    return res.status(400).json({
      success: false,
      message: 'approvedAmount, approvedRate, approvedTenure and approvedEmi are required'
    });
  }

  try {

    // Verify application exists and is submitted
    const app = await LenderPortalApp.findOne({
      applicationId,
      status: 'submitted'
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or not in submitted state'
      });
    }

    // Call CreditFlow callback
    const callbackResponse = await notifyCreditFlow(applicationId, 'approved', {
      approvedAmount:  Number(approvedAmount),
      approvedRate:    Number(approvedRate),
      approvedTenure:  Number(approvedTenure),
      approvedEmi:     Number(approvedEmi),
      processingFee:   processingFee ? Number(processingFee) : undefined,
      remarks:         remarks || null
    });

    if (!callbackResponse.ok) {
      const errorText = await callbackResponse.text();
      console.error('CreditFlow callback failed:', errorText);
      return res.status(500).json({
        success: false,
        message: 'Failed to notify CreditFlow. Approval not saved.',
        detail: errorText
      });
    }

    const callbackData = await callbackResponse.json();

    return res.status(200).json({
      success: true,
      message: `Application ${applicationId} approved successfully. CreditFlow has been notified.`,
      creditflowResponse: callbackData
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});


// ─────────────────────────────────────────
// Route 4 — Reject an application
// POST /api/lender/applications/:applicationId/reject
//
// Body: {
//   remarks: "Income insufficient for requested amount"
// }
// ─────────────────────────────────────────
router.post('/applications/:applicationId/reject', async (req, res) => {

  const { applicationId } = req.params;
  const { remarks } = req.body;

  try {

    const app = await LenderPortalApp.findOne({
      applicationId,
      status: 'submitted'
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or not in submitted state'
      });
    }

    const callbackResponse = await notifyCreditFlow(applicationId, 'rejected', {
      remarks: remarks || 'Application does not meet our current lending criteria.'
    });

    if (!callbackResponse.ok) {
      const errorText = await callbackResponse.text();
      console.error('CreditFlow callback failed:', errorText);
      return res.status(500).json({
        success: false,
        message: 'Failed to notify CreditFlow. Rejection not saved.',
        detail: errorText
      });
    }

    const callbackData = await callbackResponse.json();

    return res.status(200).json({
      success: true,
      message: `Application ${applicationId} rejected. CreditFlow has been notified.`,
      creditflowResponse: callbackData
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
});

// POST /api/lender/receive
// Called by CreditFlow main backend when user submits application
router.post('/receive', async (req, res) => {

  const secret = req.headers['x-lender-secret'];

  if (secret !== process.env.LENDER_CALLBACK_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorised.' });
  }

  try {

    const existing = await LoanApplication.findOne({
      applicationId: req.body.applicationId
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Application already received.' });
    }

    const application = new LoanApplication(req.body);
    await application.save();

    return res.status(201).json({
      success: true,
      message: 'Application received.',
      applicationId: req.body.applicationId
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

export default router;