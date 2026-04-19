'use strict';

const DEFAULT_JWT_SECRET = 'explain-my-code-dev-secret';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && String(secret).trim()) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return DEFAULT_JWT_SECRET;
}

module.exports = { getJwtSecret, DEFAULT_JWT_SECRET };
