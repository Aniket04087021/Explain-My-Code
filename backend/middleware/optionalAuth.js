const jwt = require('jsonwebtoken');

/**
 * Attaches req.user when a valid Bearer token is present; otherwise continues without user.
 * Safe for stateless sandbox endpoints that do not touch private data.
 */
function optionalAuth(req, res, next) {
  req.user = null;
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return next();

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch {
    /* invalid/expired token — still allow sandbox visualize */
  }
  next();
}

module.exports = optionalAuth;
