import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // ─────────────────────────────
    // Required at registration
    // These three fields only to sign up
    // ─────────────────────────────

    // Name as per government ID
    // Comes from Aadhaar autofetch later
    // But user types it at registration
    name: {
      type: String,
      trim: true,
      default: null
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    password: {
      type: String,
      required: true
      // Stores bcrypt hashed MPIN
      // Never plain text
    },


    // ─────────────────────────────
    // Optional — filled later
    // As user completes their profile
    // or applies for a loan
    // ─────────────────────────────

    email: {
      type: String,
      unique: true,
      sparse: true,
      // sparse allows multiple null values
      // since email is optional at registration
      lowercase: true,
      trim: true
    },

    dob: {
      type: String,
      default: null
    },

    gender: {
      type: String,
      enum: ['M', 'F', 'T'],
      default: null
    },

    address: {
      type: String,
      trim: true,
      default: null
    },

    pan: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      default: null
    },


    // ─────────────────────────────
    // Verification flags
    // All false by default
    // Updated as user verifies each thing
    // ─────────────────────────────

    mobileVerified: {
      type: Boolean,
      default: false
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    panVerified: {
      type: Boolean,
      default: false
    },

    aadhaarVerified: {
      type: Boolean,
      default: false
      // We store only this flag
      // Never the Aadhaar number itself
      // As per Aadhaar Act 2016
    },


    // ─────────────────────────────
    // Account status
    // ─────────────────────────────

    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },

    profileCompletionPercentage: {
      type: Number,
      default: 0
    },


    // ─────────────────────────────
    // Consent
    // Required by DPDP Act 2023
    // ─────────────────────────────

    consentGivenAt: {
      type: Date,
      default: null
    },

    consentVersion: {
      type: String,
      default: null
      // Store which version of privacy policy
      // user consented to
    }

  },
  {
    timestamps: true
    // Auto adds createdAt and updatedAt
  }
);

export default mongoose.model('User', userSchema);