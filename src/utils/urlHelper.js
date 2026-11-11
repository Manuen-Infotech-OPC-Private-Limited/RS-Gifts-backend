/**
 * Normalizes store logo and media URLs into globally accessible, protocol-safe HTTPS URLs.
 * Handles relative paths (/uploads/...), localhost URLs, and converts insecure HTTP to HTTPS.
 */
export const normalizeLogoUrl = (logo, req) => {
  if (!logo || typeof logo !== 'string' || !logo.trim()) return '';
  const clean = logo.trim();

  // Preserved as-is: Data URLs or modern HTTPS Cloudinary URLs
  if (clean.startsWith('data:') || clean.startsWith('blob:') || clean.startsWith('https://res.cloudinary.com')) {
    return clean;
  }

  // Cloudinary HTTP -> HTTPS
  if (clean.startsWith('http://res.cloudinary.com')) {
    return clean.replace(/^http:\/\//i, 'https://');
  }

  const proto = (req && (req.headers['x-forwarded-proto'] || req.protocol)) || 'https';
  const rawHost = (req && req.get && req.get('host')) || 'rs-gifts-backend.onrender.com';
  const host = rawHost.includes('localhost') ? rawHost : 'rs-gifts-backend.onrender.com';

  // Relative /uploads/ or uploads/
  if (clean.startsWith('/uploads/') || clean.startsWith('uploads/')) {
    const p = clean.startsWith('/') ? clean : `/${clean}`;
    return `${proto}://${host}${p}`;
  }

  // Localhost or 127.0.0.1 references
  if (clean.includes('localhost:5000') || clean.includes('127.0.0.1:5000')) {
    return clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1):5000/, `${proto}://${host}`);
  }

  // Upgrade standard HTTP to HTTPS (prevents Mixed Content block on GitHub Pages)
  if (clean.startsWith('http://') && !clean.includes('localhost')) {
    return clean.replace(/^http:\/\//i, 'https://');
  }

  return clean;
};

export default normalizeLogoUrl;

