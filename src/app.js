import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';

const app = express();

// Trust reverse proxy headers (Render, Cloudflare) for accurate client IP identification in rate limiting
app.set('trust proxy', 1);

// Security Headers (Configured to allow cross-origin static media loading)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration (Supporting Admin panel, Customer Storefront, and GitHub Pages production deployments)
const configuredOrigins = [
  process.env.CLIENT_ADMIN_URL,
  process.env.CLIENT_STOREFRONT_URL,
  'https://manuen-infotech-opc-private-limited.github.io',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5000',
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const isConfigured = configuredOrigins.includes(origin);
      const isLocalDev = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
      const isGithubPages = origin.endsWith('.github.io');

      if (isConfigured || isLocalDev || isGithubPages) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`Blocked by CORS policy: Origin ${origin} is not allowed access`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger (Development)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to RS-Gifts E-Commerce API',
    status: 'ACTIVE',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      adminAuth: '/api/admin/auth',
      adminProducts: '/api/admin/products',
      adminOrders: '/api/admin/orders',
      adminDashboard: '/api/admin/dashboard/stats',
      customerProducts: '/api/customer/products',
      customerOrders: '/api/customer/orders',
      upload: '/api/upload',
    },
  });
});

// Master API Router
app.use('/api', apiRoutes);

// Error Handling Pipeline
app.use(notFound);
app.use(errorHandler);

export default app;
