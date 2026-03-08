import mongoose from 'mongoose';

const lenderSchema = new mongoose.Schema(
  {
    lenderId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ['NBFC', 'bank'],
      required: true
    },

    rbiRegistrationNumber: {
      type: String,
      required: true,
      trim: true
    },

    logo: {
      type: String,
      default: null
    },

    tagline: {
      type: String,
      trim: true
    },

    establishedYear: {
      type: Number
    },

    // ─────────────────────────────
    // Loan Offering
    // ─────────────────────────────
    loanOffering: {

      minLoanAmount: { type: Number, required: true },
      maxLoanAmount: { type: Number, required: true },

      interestRateRange: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
      },

      tenureRange: {
        minMonths: { type: Number, required: true },
        maxMonths: { type: Number, required: true }
      },

      processingFeePercentage: { type: Number, required: true }

    },

    // ─────────────────────────────
    // NTC Policy
    // What kind of NTC borrowers this lender accepts
    // ─────────────────────────────
    ntcPolicy: {

      acceptsNTC: {
        type: Boolean,
        default: true
      },

      minimumNtcScore: {
        type: Number,
        required: true
      },

      acceptedRiskTiers: {
        type: [String],
        enum: ['tier-1', 'tier-2', 'tier-3'],
        required: true
      }

    },

    // ─────────────────────────────
    // Disbursal
    // ─────────────────────────────
    disbursal: {

      averageDisbursalHours: { type: Number },
      disbursalMode: {
        type: String,
        default: 'direct_bank_transfer'
      }

    },

    // ─────────────────────────────
    // Reputation
    // ─────────────────────────────
    reputation: {

      rating: { type: Number },
      totalLoansDisbursed: { type: Number }

    },

    // ─────────────────────────────
    // Contact
    // ─────────────────────────────
    contact: {

      website: { type: String },
      supportEmail: { type: String }

    },

    // ─────────────────────────────
    // Status
    // inactive lenders never shown to borrowers
    // ─────────────────────────────
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }

  },
  { timestamps: true }
);

export default mongoose.model('Lender', lenderSchema, 'lenders');