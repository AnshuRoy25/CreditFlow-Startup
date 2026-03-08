
// ─────────────────────────────────────────────────────────
// Read-only view of CreditFlow's loanapplications collection.
// This lives in test-apis because the lender portal server
// reads directly from the same MongoDB as the main backend.
// We only define fields the lender portal actually needs.
// ─────────────────────────────────────────────────────────

import mongoose from 'mongoose';

const loanApplicationSchema = new mongoose.Schema(
  {
    applicationId:  { type: String },
    status:         { type: String },
    currentStep:    { type: String },
    userId:         { type: mongoose.Schema.Types.ObjectId },

    personalDetails: {
      name:    { type: String },
      pan:     { type: String },
      email:   { type: String },
      mobile:  { type: String },
      dob:     { type: String },
      gender:  { type: String },
      address: { type: String }
    },

    employmentDetails: {
      employmentType: { type: String },
      salaried: {
        employer:        { type: String },
        designation:     { type: String },
        monthlySalary:   { type: Number },
        tenureMonths:    { type: Number },
        modeOfSalary:    { type: String }
      },
      selfEmployed: {
        businessNature:  { type: String },
        monthlyIncome:   { type: Number },
        vintageMonths:   { type: Number }
      }
    },

    bankStatement: {
      uploadedAt: { type: Date },
      employmentVerification: {
        salaryMatch:          { type: Boolean },
        employerMatch:        { type: String },
        tenureVerification:   { type: String },
        actualAverageSalary:  { type: Number },
        declaredSalary:       { type: Number },
        declaredEmployer:     { type: String },
        detectedEmployer:     { type: String }
      }
    },

    loanDetails: {
      loanAmount:    { type: Number },
      purpose:       { type: String },
      calculatedEmi: { type: Number },
      preferred: {
        interestRate: { type: Number },
        tenureMonths: { type: Number }
      }
    },

    lenderSelection: {
      lenderId:                { type: mongoose.Schema.Types.ObjectId },
      lenderCode:              { type: String },
      name:                    { type: String },
      selectedAt:              { type: Date },
      lenderStatus:            { type: String },
      offeredInterestRate:     { type: Number },
      processingFeePercentage: { type: Number },
      processingFeeAmount:     { type: Number },
      estimatedEmi:            { type: Number },
      selectedTenureMonths:    { type: Number },
      approvedLoanAmount:      { type: Number },
      approvedRate:            { type: Number },
      approvedTenure:          { type: Number },
      approvedEmi:             { type: Number },
      lenderRemarks:           { type: String },
      lenderRespondedAt:       { type: Date }
    }
  },
  {
    collection: 'loanapplications', // same collection as main backend
    timestamps: true
  }
);

export default mongoose.model('LoanApplication', loanApplicationSchema);