// routes/applyLoan/confirmation.js

import express from 'express';
import LoanApplication from '../../models/LoanApplication.js';
import Lender from '../../models/Lender.js';
import createNotification from '../../helpers/createNotification.js';

const router = express.Router();


// ─────────────────────────────────────────────────────────
// Route 1 — Get all application details for confirmation page
// GET /api/apply-loan/confirmation/details
// Returns full application snapshot for the user to review
// before final submission
// ─────────────────────────────────────────────────────────
router.get('/details', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'draft',
      currentStep: 'confirmation'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application pending confirmation.'
      });
    }

    // Fetch lender details for logo, tagline, contact etc
    const lender = await Lender.findById(application.lenderSelection.lenderId);

    return res.status(200).json({
      success: true,
      data: {

        applicationId: application.applicationId,

        personalDetails: {
          name:    application.personalDetails.name,
          pan:     application.personalDetails.pan,
          dob:     application.personalDetails.dob,
          gender:  application.personalDetails.gender,
          address: application.personalDetails.address,
          email:   application.personalDetails.email,
          mobile:  application.personalDetails.mobile
        },

        employmentDetails: {
          employmentType: application.employmentDetails.employmentType,
          ...(application.employmentDetails.employmentType === 'salaried'
            ? {
                employer:            application.employmentDetails.salaried.employer,
                designation:         application.employmentDetails.salaried.designation,
                employmentCategory:  application.employmentDetails.salaried.employmentCategory,
                tenureMonths:        application.employmentDetails.salaried.tenureMonths,
                monthlySalary:       application.employmentDetails.salaried.monthlySalary,
                modeOfSalary:        application.employmentDetails.salaried.modeOfSalary
              }
            : {
                businessName:    application.employmentDetails.selfEmployed.businessName,
                businessType:    application.employmentDetails.selfEmployed.businessType,
                vintageMonths:   application.employmentDetails.selfEmployed.vintageMonths,
                monthlyIncome:   application.employmentDetails.selfEmployed.monthlyIncome
              }
          )
        },

        bankStatement: {
          uploadedAt:    application.bankStatement.uploadedAt,
          salaryMatch:   application.bankStatement.employmentVerification.salaryMatch,
          employerMatch: application.bankStatement.employmentVerification.employerMatch,
          tenureVerification: application.bankStatement.employmentVerification.tenureVerification
        },

        loanDetails: {
          loanAmount:   application.loanDetails.loanAmount,
          loanPurpose:  application.loanDetails.loanPurpose
        },

        selectedLender: {
          lenderCode:            application.lenderSelection.lenderCode,
          name:                  application.lenderSelection.name,
          logo:                  lender?.logo     || null,
          tagline:               lender?.tagline  || null,
          rating:                lender?.reputation?.rating || null,
          averageDisbursalHours: lender?.disbursal?.averageDisbursalHours || null
        }

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
// Route 2 — Confirm and Submit
// POST /api/apply-loan/confirmation/submit
// User has reviewed everything and clicked confirm
// THIS is where status becomes submitted
// ─────────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {

  try {

    const application = await LoanApplication.findOne({
      userId:      req.user.id,
      status:      'draft',
      currentStep: 'confirmation'
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application pending confirmation.'
      });
    }

    const lender = await Lender.findById(application.lenderSelection.lenderId);

    if (!lender || lender.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Selected lender is no longer available. Please go back and select a lender again.'
      });
    }

    // NOW mark as submitted
    application.status      = 'submitted';
    application.currentStep = 'submitted';

    await application.save();

    const payload = buildLenderPayload(application);

    await fetch('http://localhost:7777/api/lender/receive', {
    method:  'POST',
    headers: {
        'x-lender-secret': process.env.LENDER_CALLBACK_SECRET,
        'Content-Type':    'application/json'
    },
    body: JSON.stringify(payload)
    });

    // Notify user
    await createNotification(
      req.user.id,
      'Application Submitted',
      `Your loan application ${application.applicationId} has been submitted to ${lender.name}. You will hear back within ${lender.disbursal.averageDisbursalHours} hours.`,
      'application',
      application.applicationId
    );

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId:         application.applicationId,
        status:                'submitted',
        lenderName:            lender.name,
        averageDisbursalHours: lender.disbursal.averageDisbursalHours
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