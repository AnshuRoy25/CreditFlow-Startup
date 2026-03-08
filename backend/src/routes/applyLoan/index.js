import express from 'express';
import personalRoutes from './personal.js';
import employmentRoutes from './employment.js';
import loanDetailsRoutes from './loanDetails.js';
import reportRoutes from './report.js';
import lenderSelectionRoutes from './lenderSelection.js';
import confirmationRoutes from './confirmation.js';

const router = express.Router();

router.use('/personal', personalRoutes);
router.use('/employment', employmentRoutes);
router.use('/loan-details', loanDetailsRoutes);
router.use('/report', reportRoutes);
router.use('/lender-selection', lenderSelectionRoutes);
router.use('/confirmation', confirmationRoutes);

export default router;