import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './config/prisma.js';
import authRoutes from './routes/auth.routes.js';
import roleTestRoutes from './routes/roleTest.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import commissionsRoutes from './routes/commissions.routes.js';
import agentRoutes from './routes/agent.routes.js';
import glampRoutes from './routes/glamp.routes.js';
import dbViewerRoutes from './routes/db-viewer.routes.js';
import adminRoutes from './routes/admin.routes.js';
import seedRoutes from './routes/seed.routes.js';
import { AppError } from './utils/errors.js';

dotenv.config();

console.log('🚀 Starting Soulter Backend...');
console.log('📦 Environment:', process.env.NODE_ENV);
console.log('🔌 Database URL configured:', !!process.env.DATABASE_URL);
console.log('🔑 JWT Secret configured:', !!process.env.JWT_SECRET);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration - Production-ready with explicit origin handling
// Parse FRONTEND_URLS from environment variable (comma-separated list)
const getFrontendUrls = () => {
  const frontendUrlsEnv = process.env.FRONTEND_URLS;
  
  // Debug logging
  console.log('🔍 Raw FRONTEND_URLS env var:', frontendUrlsEnv);
  console.log('🔍 Type:', typeof frontendUrlsEnv);
  
  if (!frontendUrlsEnv) {
    console.warn('⚠️  FRONTEND_URLS not set in environment variables');
    return [];
  }
  
  // Split by comma, trim whitespace, remove empty strings
  const urls = frontendUrlsEnv
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0 && !url.startsWith('='));
  
  return urls;
};

// Determine allowed origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? getFrontendUrls()
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

console.log('🌐 Environment:', process.env.NODE_ENV);
console.log('🌐 Allowed CORS Origins:', JSON.stringify(allowedOrigins, null, 2));
console.log('🌐 Total allowed origins:', allowedOrigins.length);

// CORS middleware - Production-ready configuration for cookie-based auth
app.use(cors({
  origin: [
    'https://soultersglamps.com',
    'https://soulter-glamps-frontend.vercel.app',
    'https://soulter-glamps-frontend-dltdrnwa2-ibrahim-azizs-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    /\.vercel\.app$/  // All Vercel preview deployments
  ],
  credentials: true, // CRITICAL: Must be true for cookies to work cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// The CORS middleware above already handles OPTIONS preflight requests
// No need for explicit app.options() handler

// Health check endpoint for Railway and monitoring
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Legacy ping endpoint
app.get('/__ping', (req, res) => {
  res.status(200).json({ ok: true });
});

// CORS Debug endpoint - Check CORS configuration
app.get('/api/debug/cors', (req, res) => {
  res.json({
    success: true,
    corsConfig: {
      nodeEnv: process.env.NODE_ENV,
      frontendUrlsRaw: process.env.FRONTEND_URLS,
      allowedOrigins: allowedOrigins,
      requestOrigin: req.headers.origin,
      allHeaders: req.headers
    }
  });
});

// Base route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Soulter Backend API',
    version: '1.0.0',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', roleTestRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/glamps', glampRoutes);
app.use('/api/db', dbViewerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seed', seedRoutes); // TEMPORARY - DELETE AFTER SEEDING

// 404 Handler - Must be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error for debugging
  console.error('❌ Error:', {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
  });

  // Handle operational errors (known errors)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
    });
  }

  // Handle Prisma errors with user-friendly messages
  if (err.code) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'This record already exists. Please try with different information.',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'The requested item was not found.',
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reference. Please check your selection.',
      });
    }
  }

  // Handle validation errors from Joi
  if (err.name === 'ValidationError' && err.details) {
    return res.status(400).json({
      success: false,
      error: 'Please check your input and try again.',
      details: err.details,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication. Please log in again.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Your session has expired. Please log in again.',
    });
  }

  // Default error response (unknown errors)
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong. Please try again later.' 
      : err.message,
  });
});

// Test database connection and start server
async function startServer() {
  try {
    console.log('🔄 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('\n🚀 Soulter Backend Server');
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Ready for requests\n`);
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use`);
        console.error(`💡 Run: netstat -ano | findstr :${PORT}`);
        console.error(`💡 Then: taskkill /F /PID <process_id>\n`);
      } else {
        console.error('\n❌ Server error:', error.message, '\n');
      }
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('📴 SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('💡 Check your DATABASE_URL environment variable');
    console.error('💡 Make sure the database is accessible');
    process.exit(1);
  }
}

// Start the server
startServer();
