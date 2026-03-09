import express from 'express';
import connectDB from './src/config/db.js';
import config from './src/config/config.js';
import auth from './src/middleware/auth.js';

import registerRoutes from './src/routes/auths/register.js';
import loginRoutes from './src/routes/auths/login.js';
import profileRoutes from './src/routes/profile.js';
import applyLoanRoutes from './src/routes/applyLoan/index.js';
import complaintRoutes from './src/routes/helpAndSupport/complaint.js';
import notificationRoutes from './src/routes/notifications.js';
import statusRoutes from './src/routes/applyLoan/status.js';
import lenderCallbackRoutes from './src/routes/lenderCallback.js';
import myApplicationsRoutes from './src/routes/myApplications.js';
import myLoansRoutes from './src/routes/myLoans.js';

const app = express();
app.use(express.json());

connectDB();

// ─────────────────────────────────────────
// Public routes — NO token required
// Register and login do not need auth
// ─────────────────────────────────────────
app.use('/api/auth', registerRoutes);
app.use('/api/auth', loginRoutes);

// Lender callback is called by lender server not by user
// It uses its own x-lender-secret header for auth
app.use('/api/lender-callback', lenderCallbackRoutes);


// ─────────────────────────────────────────
// Protected routes — token required
// auth middleware runs first on all of these
// It sets req.user = { id, mobile } if token is valid
// ─────────────────────────────────────────
app.use('/api/profile',          auth, profileRoutes);
app.use('/api/apply-loan',       auth, applyLoanRoutes);
app.use('/api/complaint',        auth, complaintRoutes);
app.use('/api/notifications',    auth, notificationRoutes);
app.use('/api/apply-loan/status',auth, statusRoutes);
app.use('/api/my-applications',  auth, myApplicationsRoutes);
app.use('/api/my-loans',         auth, myLoansRoutes);


app.listen(config.port || 4000, () => {
  console.log(`CreditFlow backend running on port ${config.port || 4000}`);
});