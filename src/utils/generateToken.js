const jwt = require('jsonwebtoken');

const generateToken = (id, role = 'customer') => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'rs_gifts_default_jwt_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;
