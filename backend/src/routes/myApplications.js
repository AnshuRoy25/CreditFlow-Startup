// routes/myApplications.js

import express from 'express';
import LoanApplication from '../models/LoanApplication.js';
import Lender from '../models/Lender.js';

const router = express.Router();

// TEMPORARY — remove when JWT middleware is added
router.use((req, res, next) => {
  req.user = { id: '69a9b6658994ecc2507764fb' };
  next();
});


// ─────────────────────────────────────────────────────────
// Route 1 — Get All Applications
// GET /api/my-applications
// Returns all applications that were ever submitted
// No matter what happened after — rejected, approved,
// withdrawn, disbursed, completed etc
// ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {

  try {

    const applications = await LoanApplication.find({
      userId: req.user.id,
      status: { $in: [
        'submitted',
        'approved',
        'rejected',
        'withdrawn',
        'offer-review',
        'pre-disbursement',
        'disbursed'
      ]}
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: applications.map(app => ({
        applicationId:  app.applicationId,
        status:         app.status,
        currentStep:    app.currentStep,
        submittedAt:    app.updatedAt,
        loanAmount:     app.loanDetails?.loanAmount,
        purpose:        app.loanDetails?.purpose,
        lenderName:     app.lenderSelection?.name,
        createdAt:      app.createdAt
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


// ─────────────────────────────────────────────────────────
// Route 2 — Get Single Application Details
// GET /api/my-applications/:applicationId
// Returns full details of a specific application
// ─────────────────────────────────────────────────────────
router.get('/:applicationId', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId:        req.user.id,
      applicationId: req.params.applicationId
    }).populate('reportId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    const lender = await Lender.findById(application.lenderSelection?.lenderId);

    return res.status(200).json({
      success: true,
      data: {

        applicationId: application.applicationId,
        status:        application.status,
        currentStep:   application.currentStep,
        createdAt:     application.createdAt,

        personalDetails: {
          name:   application.personalDetails?.name,
          pan:    application.personalDetails?.pan,
          mobile: application.personalDetails?.mobile,
          email:  application.personalDetails?.email
        },

        employmentDetails: {
          employmentType: application.employmentDetails?.employmentType,
          ...(application.employmentDetails?.employmentType === 'salaried'
            ? {
                employer:      application.employmentDetails?.salaried?.employer,
                monthlySalary: application.employmentDetails?.salaried?.monthlySalary,
                tenureMonths:  application.employmentDetails?.salaried?.tenureMonths
              }
            : {
                businessNature: application.employmentDetails?.selfEmployed?.businessNature,
                monthlyIncome:  application.employmentDetails?.selfEmployed?.monthlyIncome,
                vintageMonths:  application.employmentDetails?.selfEmployed?.vintageMonths
              }
          )
        },

        loanDetails: {
          loanAmount:    application.loanDetails?.loanAmount,
          purpose:       application.loanDetails?.purpose,
          calculatedEmi: application.loanDetails?.calculatedEmi,
          preferred: {
            interestRate: application.loanDetails?.preferred?.interestRate,
            tenureMonths: application.loanDetails?.preferred?.tenureMonths
          }
        },

        ntcReport: application.reportId ? {
          ntcScore:    application.reportId.ntcScore,
          riskTier:    application.reportId.riskTier,
          generatedAt: application.reportId.createdAt
        } : null,

        lenderDetails: {
          name:    application.lenderSelection?.name,
          logo:    lender?.logo    || null,
          rating:  lender?.reputation?.rating || null,
          contact: lender?.contact || null
        },

        offerDetails: ['approved', 'offer-review', 'pre-disbursement', 'disbursed'].includes(application.status) ? {
          approvedLoanAmount: application.lenderSelection?.approvedLoanAmount,
          approvedRate:       application.lenderSelection?.approvedRate,
          approvedTenure:     application.lenderSelection?.approvedTenure,
          approvedEmi:        application.lenderSelection?.approvedEmi,
          lenderRemarks:      application.lenderSelection?.lenderRemarks,
          respondedAt:        application.lenderSelection?.lenderRespondedAt
        } : null,

        terminalInfo: application.terminalState ? {
          terminalState:  application.terminalState,
          cooldownEndsAt: application.cooldownEndsAt
        } : null

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