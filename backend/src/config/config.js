import dotenv from 'dotenv'

dotenv.config();

const config = {
  mongoURI: process.env.MONGODB_URI,
  port: process.env.PORT,
  supportEmail: process.env.SUPPORT_EMAIL,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
};
export default config;