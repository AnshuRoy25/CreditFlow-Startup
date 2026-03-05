import dotenv from 'dotenv'

dotenv.config();

const config = {
  mongoURI: process.env.MONGODB_URI,
  port: process.env.PORT,
  supportEmail: process.env.SUPPORT_EMAIL,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS
};
export default config;