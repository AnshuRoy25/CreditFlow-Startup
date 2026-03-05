import nodemailer from 'nodemailer';
import config from '../config/config.js';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: config.emailUser,
    pass: config.emailPass
  }
});

const sendComplaintEmail = async (complaint, user) => {

  const mailOptions = {
    from: config.emailUser,
    to: config.supportEmail,
    subject: `New Complaint — ${complaint.category} — ${complaint._id}`,
    text: `
New complaint received on CreditFlow.

Complaint ID: ${complaint._id}
User ID: ${user._id}
Mobile: ${user.mobile}
Name: ${user.name || 'Not provided'}
Category: ${complaint.category}
Application ID: ${complaint.applicationId || 'Not linked to any application'}
Description: ${complaint.description}
Submitted At: ${complaint.createdAt}

Login to admin panel to review and respond.
    `
  };

  await transporter.sendMail(mailOptions);

};

export default sendComplaintEmail;