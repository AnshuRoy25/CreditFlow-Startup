// models/Report.js

import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    applicationId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'LoanApplication',
      required: true
    },

    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true
    },

    ntcScore: {
      type:     Number,
      required: true
    },

    riskTier: {
      type:     String,
      enum:     ['low', 'medium', 'high', 'very-high'],
      required: true
    },

    inputSnapshot: {
      feature1:  { type: Number, default: null },
      feature2:  { type: Number, default: null },
      feature3:  { type: Number, default: null },
      feature4:  { type: Number, default: null },
      feature5:  { type: Number, default: null },
      feature6:  { type: Number, default: null },
      feature7:  { type: Number, default: null },
      feature8:  { type: Number, default: null },
      feature9:  { type: Number, default: null },
      feature10: { type: Number, default: null }
    },

    modelVersion: {
      type:    String,
      default: 'ntc-v1'
    }

  },
  {
    timestamps: true
  }
);

export default mongoose.model('Report', reportSchema);