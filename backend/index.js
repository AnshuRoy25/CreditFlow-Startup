import express from 'express';
import connectDB from './src/config/db.js';
import config from './src/config/config.js';


import registerRoutes from './src/routes/auths/register.js';
import loginRoutes from './src/routes/auths/login.js';
import profileRoutes from './src/routes/profile.js';
import applyLoanRoutes from './src/routes/applyLoan/index.js';
import complaintRoutes from './src/routes/helpAndSupport/complaint.js';
import notificationRoutes from './src/routes/notifications.js';
import statusRoutes from './status.js';
import lenderSelectionRoutes from './lenderSelection.js';

const app = express();
app.use(express.json());

connectDB();

app.use('/api/auth', registerRoutes);
app.use('/api/auth', loginRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/apply-loan', applyLoanRoutes);
app.use('/api/complaint', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/status', statusRoutes);
app.use('/lender-selection', lenderSelectionRoutes);

app.listen(config.port || 5000, () => {
  console.log(`CreditFlow backend running on port ${config.port || 5000}`);
});