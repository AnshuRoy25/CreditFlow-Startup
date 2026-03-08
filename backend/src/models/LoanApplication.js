import mongoose from 'mongoose';

const personalDetailsSchema = new mongoose.Schema({

  // PAN details
  pan: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },

  // These four come from Aadhaar autofetch
  // We never store Aadhaar number itself
  name: {
    type: String,
    required: true,
    trim: true
  },

  dob: {
    type: String,
    required: true
  },

  gender: {
    type: String,
    required: true,
    enum: ['M', 'F', 'T']
  },

  address: {
    type: String,
    required: true,
    trim: true
  },

  // Manual inputs
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  mobile: {
    type: String,
    required: true,
    trim: true
  },

  // Verification flags
  // We store only status not the actual Aadhaar number
  // As per Aadhaar Act 2016 and RBI Section 13
  panVerified: {
    type: Boolean,
    default: false
  },

  aadhaarVerified: {
    type: Boolean,
    default: false
  },

  submittedAt: {
    type: Date,
    default: null
  }

});

const employmentDetailsSchema = new mongoose.Schema({

  // Salaried or Self Employed
  employmentType: {
    type: String,
    enum: ['salaried', 'self-employed'],
    required: true
  },

  // ─────────────────────────────
  // Salaried Fields
  // Only filled if employmentType is salaried
  // ─────────────────────────────
  salaried: {

    employer: {
      type: String,
      trim: true
    },

    designation: {
      type: String,
      trim: true
    },

    employmentCategory: {
      type: String,
      enum: ['permanent', 'contractual']
    },

    // How long with current employer
    // Storing as number of months for easy calculation
    tenureMonths: {
      type: Number
    },

    monthlySalary: {
      type: Number
    },

    // Cash, Bank Transfer, Cheque
    modeOfSalary: {
      type: String,
      enum: ['bank-transfer', 'cash', 'cheque']
    }

  },

  // ─────────────────────────────
  // Self Employed Fields
  // Only filled if employmentType is self-employed
  // ─────────────────────────────
  selfEmployed: {

    businessNature: {
      type: String,
      trim: true
    },

    // How long business has been running in months
    vintageMonths: {
      type: Number
    },

    monthlyIncome: {
      type: Number
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true
    },

    gstVerified: {
      type: Boolean,
      default: false
    }

  },

  submittedAt: {
    type: Date,
    default: null
  }

});


const bankStatementSchema = new mongoose.Schema({

  uploadedAt: {
    type: Date,
    default: null
  },

  employmentVerification: {

    // Shown to user
    declaredEmployer: { type: String },
    detectedEmployer: { type: String },
    employerMatch: {
      type: String,
      enum: ['full_match', 'partial_match', 'no_match']
    },
    declaredSalary: { type: Number },
    actualAverageSalary: { type: Number },
    salaryMatch: { type: Boolean },
    salaryMonthsFound: { type: Number },
    tenureDetectedMonths: { type: Number },
    declaredTenureMonths: { type: Number },
    tenureVerification: {
      type: String,
      enum: ['full', 'partial', 'none']
    },
    salaryModeConfirmed: { type: String },

    // Internal only — never sent to frontend
    employerCategory: { type: String },
    discrepancyPercentage: { type: Number },
    salaryRegularityScore: { type: Number },
    employmentVerificationScore: { type: Number }

  }

  // loanRanges and ntcResults added later

});

const loanDetailsSchema = new mongoose.Schema({

  loanAmount: {
    type: Number,
    required: true
  },

  purpose: {
    type: String,
    enum: [
      'emergency',
      'medical',
      'education',
      'gadget',
      'travel',
      'rent',
      'business',
      'other'
    ],
    required: true
  },

  // EMI calculated from loanAmount, interestRate, tenureMonths
  // Not taken as input from user
  calculatedEmi: {
    type: Number,
    required: true
  },

  // User preferences — 2 inputs now not 3
  // EMI removed since it is derived
  preferred: {

    interestRate: {
      type: Number,
      required: true
    },

    tenureMonths: {
      type: Number,
      required: true
    }

  },

  submittedAt: {
    type: Date,
    default: null
  }

});

const lenderSelectionSchema = new mongoose.Schema({

  lenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lender',
    default: null
  },

  lenderCode: { type: String, default: null },
  name:       { type: String, default: null },
  selectedAt: { type: Date,   default: null },

  lenderStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  approvedLoanAmount: { type: Number, default: null },
  approvedRate:       { type: Number, default: null },
  approvedTenure:     { type: Number, default: null },
  approvedEmi:        { type: Number, default: null },
  lenderRemarks:      { type: String, default: null },
  lenderRespondedAt:  { type: Date,   default: null },
  

});

const loanApplicationSchema = new mongoose.Schema(
  {

    // This is the link between LoanApplications
    // collection and Users collection
    // Every application belongs to one specific user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Unique application reference number
    // Shown to borrower and lender for tracking
    applicationId: {
      type: String,
      unique: true
    },

    // Tracks which step user is currently on
    // So if they leave and come back we know where to resume
    currentStep: {
      type: String,
      enum: [
        'personal-details',
        'employment-details',
        'bank-statement',
        'loan-details',
        'report-generated',
        'lender-selected',
        'submitted'
      ],
      default: 'personal-details'
    },

    // Overall application status
    status: {
      type: String,
      enum: [
        'draft',       // user still filling form
        'submitted',   // sent to lender
        'approved',    // lender approved
        'rejected',    // lender rejected
        'disbursed',   // loan disbursed
        'withdrawn',    // user withdrew application
        'offer-review',   // ← add this
        'rejected'
      ],
      default: 'draft'
    },

    // When this application reached a terminal state
    // Used to calculate cooldown for next application
    cooldownEndsAt: {
      type: Date,
      default: null
    },

    // Why the application ended
    terminalState: {
      type: String,
      enum: ['rejected', 'withdrawn', 'disbursed', 'completed'],
      default: null
    },

    // Personal details section
    // Will add employmentDetails, bankStatement,
    // loanDetails, reportData sections later
    personalDetails: personalDetailsSchema,
    employmentDetails: employmentDetailsSchema,
    bankStatement: bankStatementSchema,
    loanDetails: loanDetailsSchema,  

    reportId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Report',
      default: null
    },

    lenderSelection: lenderSelectionSchema 


  },
  {
    timestamps: true
    // This auto adds createdAt and updatedAt fields
    // No need to define them manually
  }
);


// Auto generate applicationId before saving
// Format will be CF followed by timestamp
// Example CF1741234567890
loanApplicationSchema.pre('save', async function () {
  if (!this.applicationId) {
    this.applicationId = 'CF' + Date.now();
  }
});




export default mongoose.model('LoanApplication', loanApplicationSchema);