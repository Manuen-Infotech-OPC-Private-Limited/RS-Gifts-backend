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

// Security Headers (Configured to allow cross-origin static media loading)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration (Supporting Admin panel at :3000, Storefront at :5173, etc.)
const allowedOrigins = [
  process.env.CLIENT_ADMIN_URL || 'http://localhost:3000',
  process.env.CLIENT_STOREFRONT_URL || 'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:5174',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
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
