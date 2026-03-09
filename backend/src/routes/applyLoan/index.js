import express from 'express';
import personalRoutes from './personal.js';
import employmentRoutes from './employment.js';
import loanDetailsRoutes from './loanDetails.js';
import reportRoutes from './report.js';
import lenderSelectionRoutes from './lenderSelection.js';
import confirmationRoutes from './confirmation.js';
import offerReviewRoutes from './offerReview.js';
import eSignRoutes from './eSign.js';
import applicationTrackRoutes from './applicationTrack.js';

const router = express.Router();

router.use('/personal', personalRoutes);
router.use('/employment', employmentRoutes);
router.use('/loan-details', loanDetailsRoutes);
router.use('/report', reportRoutes);
router.use('/lender-selection', lenderSelectionRoutes);
router.use('/confirmation', confirmationRoutes);
router.use('/offer-review', offerReviewRoutes);
router.use('/esign', eSignRoutes);
router.use('/application-track', applicationTrackRoutes);

export default router;