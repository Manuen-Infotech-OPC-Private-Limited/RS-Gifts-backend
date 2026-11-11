import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwtConfig.js';

const generateToken = (id, role = 'customer') => {
  return jwt.sign(
    { id, role },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export default generateToken;
