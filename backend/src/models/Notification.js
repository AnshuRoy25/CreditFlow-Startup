import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    // Which user this notification belongs to
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Short title shown in notification list
    title: {
      type: String,
      required: true,
      trim: true
    },

    // Full notification message
    message: {
      type: String,
      required: true,
      trim: true
    },

    // Category of notification
    type: {
      type: String,
      enum: [
        'application',   // loan application updates
        'loan',          // loan and EMI updates
        'profile',       // profile completion nudges
        'general'        // announcements and system messages
      ],
      required: true
    },

    // Optional — link notification to a specific application
    applicationId: {
      type: String,
      default: null
    },

    // Whether user has seen this notification
    isRead: {
      type: Boolean,
      default: false
    },

    readAt: {
      type: Date,
      default: null
    }

  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);