/**
 * Centralized JWT Secret Configuration
 * Ensures no default or insecure fallback secrets are used in production environments.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === '' || secret === 'rs_gifts_default_jwt_secret_change_me') {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing, blank, or insecure default in production!');
      throw new Error('JWT_SECRET must be explicitly configured in production environment variables.');
    }
    return 'rs_gifts_dev_local_secret_2026_key_secure';
  }

  return secret;
};

export default getJwtSecret;
