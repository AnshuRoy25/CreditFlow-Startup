// routes/myLoans.js

import express from 'express';
import LoanApplication from '../models/LoanApplication.js';
import Lender from '../models/Lender.js';

const router = express.Router();


// ─────────────────────────────────────────────────────────
// Route 1 — Get All Loans
// GET /api/my-loans
// Only applications where user accepted the offer
// i.e. pre-disbursement, disbursed, completed
// ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {

  try {

    const loans = await LoanApplication.find({
      userId: req.user.id,
      status: { $in: ['pre-disbursement', 'disbursed'] }
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: loans.map(loan => ({
        applicationId:      loan.applicationId,
        status:             loan.status,
        lenderName:         loan.lenderSelection?.name,
        approvedLoanAmount: loan.lenderSelection?.approvedLoanAmount,
        approvedRate:       loan.lenderSelection?.approvedRate,
        approvedTenure:     loan.lenderSelection?.approvedTenure,
        approvedEmi:        loan.lenderSelection?.approvedEmi,
        createdAt:          loan.createdAt
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
// Route 2 — Get Single Loan Details
// GET /api/my-loans/:applicationId
// Full details of a specific active loan
// ─────────────────────────────────────────────────────────
router.get('/:applicationId', async (req, res) => {

  try {

    const loan = await LoanApplication.findOne({
      userId:        req.user.id,
      applicationId: req.params.applicationId,
      status:        { $in: ['pre-disbursement', 'disbursed'] }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found.'
      });
    }

    const lender = await Lender.findById(loan.lenderSelection?.lenderId);
    const ls     = loan.lenderSelection;

    const totalRepayment = Math.round(ls.approvedEmi * ls.approvedTenure);
    const totalInterest  = Math.round(totalRepayment - ls.approvedLoanAmount);

    return res.status(200).json({
      success: true,
      data: {

        applicationId: loan.applicationId,
        status:        loan.status,

        lenderDetails: {
          name:                  lender?.name    || ls.name,
          logo:                  lender?.logo    || null,
          rating:                lender?.reputation?.rating || null,
          averageDisbursalHours: lender?.disbursal?.averageDisbursalHours || null,
          disbursalMode:         lender?.disbursal?.disbursalMode || null,
          supportEmail:          lender?.contact?.supportEmail || null,
          website:               lender?.contact?.website || null
        },

        loanDetails: {
          approvedLoanAmount: ls.approvedLoanAmount,
          approvedRate:       ls.approvedRate,
          approvedTenure:     ls.approvedTenure,
          approvedEmi:        ls.approvedEmi,
          totalRepayment,
          totalInterest,
          purpose:            loan.loanDetails?.purpose
        },

        disbursalInfo: {
          status:      loan.status,
          disbursedAt: loan.status === 'disbursed' ? loan.updatedAt : null
        },

        borrowerDetails: {
          name:   loan.personalDetails?.name,
          pan:    loan.personalDetails?.pan,
          mobile: loan.personalDetails?.mobile,
          email:  loan.personalDetails?.email
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


export default router;