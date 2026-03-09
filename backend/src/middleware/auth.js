import jwt from 'jsonwebtoken';
import config from '../config/config.js';

const auth = (req, res, next) => {

  // Get token from Authorization header
  // Frontend must send: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  // Extract the token part after "Bearer "
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token using our secret
    // If valid, decoded will contain { id, mobile, iat, exp }
    const decoded = jwt.verify(token, config.jwtSecret);

    // Attach user info to req so all routes can use req.user.id
    // if you remove mobile from payload, remove it here too
    req.user = { id: decoded.id };

    next();

  } catch (error) {

    // Token is invalid or expired
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.'
    });
  }
};

export default auth;