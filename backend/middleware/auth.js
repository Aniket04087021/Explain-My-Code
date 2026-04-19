const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

/**
 * JWT Authentication Middleware
 * Extracts and verifies the JWT token from the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
const auth = (req, res, next) => {
  try {
    // Get token from the Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Support "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token and attach user data to request
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
