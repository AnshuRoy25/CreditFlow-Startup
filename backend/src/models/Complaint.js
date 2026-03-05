import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    applicationId: {
      type: String,
      default: null
    },

    category: {
      type: String,
      enum: [
        'verification_issue',
        'application_issue',
        'loan_disbursement',
        'interest_rate',
        'emi_issue',
        'data_privacy',
        'account_issue',
        'other'
      ],
      required: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'escalated'],
      default: 'open'
    },

    resolvedAt: {
      type: Date,
      default: null
    },

    resolutionNote: {
      type: String,
      default: null
    }

  },
  { timestamps: true }
);

export default mongoose.model('Complaint', complaintSchema);