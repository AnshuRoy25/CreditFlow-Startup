import express from 'express';
import connectDB from './config/db.js';
import panVerifyRoutes from './ApiRoutes/pan-verify.js';
import aadhaarVerifyRoutes from './ApiRoutes/aadhaar-verify.js';
import config from './config/config.js';

const app = express();
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', panVerifyRoutes);
app.use('/api', aadhaarVerifyRoutes);

app.listen(config.port || 4000, () => {
  console.log(`Test API server running on port ${config.port || 4000}`);
});