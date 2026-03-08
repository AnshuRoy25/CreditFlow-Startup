import Notification from '../models/Notification.js';

const createNotification = async (userId, title, message, type, applicationId = null) => {
  try {
    await Notification.create({
      userId,
      title,
      message,
      type,
      applicationId
    });
  } catch (error) {
    // Notification failure should never crash the main route
    // So we just log the error and move on
    console.error('Failed to create notification:', error);
  }
};

export default createNotification;