import express from 'express';
import personalRoutes from './personal.js';
import employmentRoutes from './employment.js';
import bankStatementRoutes from './bankStatement.js';
import loanDetailsRoutes from './loanDetails.js';

const router = express.Router();

router.use('/personal', personalRoutes);
router.use('/employment', employmentRoutes);
router.use('/bank-statement', bankStatementRoutes);
router.use('/loan-details', loanDetailsRoutes);

export default router;