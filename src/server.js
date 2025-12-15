console.log("=== 1. SERVER FILE LOADED ===");

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import roleTestRoutes from './routes/roleTest.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import commissionsRoutes from './routes/commissions.routes.js';
import agentRoutes from './routes/agent.routes.js';

console.log("=== 2. IMPORTS COMPLETED ===");

dotenv.config();
console.log("=== 3. DOTENV CONFIGURED ===");

const app = express();
console.log("=== 4. EXPRESS APP CREATED ===");

const PORT = process.env.PORT || 5001;
console.log("=== 5. PORT SET TO:", PORT, "===");

// Step 1: express.json()
app.use(express.json());
console.log("=== 6. express.json() ENABLED ===");

// Step 2: express.urlencoded()
app.use(express.urlencoded({ extended: true }));
console.log("=== 7. express.urlencoded() ENABLED ===");

// Step 3: cookie-parser
app.use(cookieParser());
console.log("=== 8. cookieParser() ENABLED ===");

// Step 4: CORS - Allow both 3000 and 3001 for flexibility
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));
console.log("=== 9. CORS ENABLED for origins:", allowedOrigins, "===");

// Test route (keep for debugging)
app.get('/__ping', (req, res) => {
  console.log("🔔 /__PING HANDLER CALLED");
  res.status(200).json({ ok: true });
});
console.log("=== 10. /__PING ROUTE REGISTERED ===");

// Base route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Soulter Backend API',
    version: '1.0.0',
  });
});
console.log("=== 11. ROOT ROUTE REGISTERED ===");

// Step 5: Auth routes
app.use('/api/auth', authRoutes);
console.log("=== 12. AUTH ROUTES REGISTERED ===");

// Step 6: Role test routes
app.use('/api', roleTestRoutes);
console.log("=== 13. ROLE TEST ROUTES REGISTERED ===");

// Step 7: Booking routes
app.use('/api/bookings', bookingRoutes);
console.log("=== 14. BOOKING ROUTES REGISTERED ===" );

// Step 8: Commission routes
app.use('/api/commissions', commissionsRoutes);
console.log("=== 15. COMMISSION ROUTES REGISTERED ===");

// Step 9: Agent routes (agent-specific endpoints)
app.use('/api/agent', agentRoutes);
console.log("=== 16. AGENT ROUTES REGISTERED ===");

// Health check
// app.get('/api', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'API is running',
//     timestamp: new Date().toISOString(),
//   });
// });

// app.get('/api/health', (req, res) => {
//   res.status(200).json({
//     success: true,
//     status: 'healthy',
//     uptime: process.uptime(),
//     timestamp: new Date().toISOString(),
//   });
// });

// API Routes (COMMENTED OUT FOR TESTING)
// app.use('/api', authRoutes);
// app.use('/api', testRoutes);
// app.use('/api', leadRoutes);
// app.use('/api', bookingRoutes);
// app.use('/api', staffRoutes);
// app.use('/api', glampRoutes);
// app.use('/api', financeRoutes);

// 404 Handler - Must be after all routes
// app.use((req, res, next) => {
//   res.status(404).json({
//     success: false,
//     error: `Route ${req.method} ${req.originalUrl} not found`,
//   });
// });

// Global error handler (COMMENTED OUT FOR TESTING)
// app.use((err, req, res, next) => {
//   // Log error for debugging
//   console.error('Error:', {
//     message: err.message,
//     stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
//     url: req.originalUrl,
//     method: req.method,
//   });

//   // Handle operational errors (known errors)
//   if (err instanceof AppError) {
//     return res.status(err.statusCode).json({
//       success: false,
//       error: err.message,
//       details: err.details,
//     });
//   }

//   // Handle Prisma errors
//   if (err.code) {
//     if (err.code === 'P2002') {
//       return res.status(409).json({
//         success: false,
//         error: 'A record with this data already exists',
//         details: err.meta,
//       });
//     }
//     if (err.code === 'P2025') {
//       return res.status(404).json({
//         success: false,
//         error: 'Record not found',
//       });
//     }
//     if (err.code === 'P2003') {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid reference. Related record not found',
//       });
//     }
//   }

//   // Handle validation errors from Joi
//   if (err.name === 'ValidationError' && err.details) {
//     return res.status(400).json({
//       success: false,
//       error: 'Validation failed',
//       details: err.details,
//     });
//   }

//   // Handle JWT errors
//   if (err.name === 'JsonWebTokenError') {
//     return res.status(401).json({
//       success: false,
//       error: 'Invalid token',
//     });
//   }

//   if (err.name === 'TokenExpiredError') {
//     return res.status(401).json({
//       success: false,
//       error: 'Token expired',
//     });
//   }

//   // Default error response (unknown errors)
//   return res.status(500).json({
//     success: false,
//     error: process.env.NODE_ENV === 'production' 
//       ? 'Internal server error' 
//       : err.message,
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
//   });
// });

console.log("=== 8. ABOUT TO START LISTENING ===");
console.log("Port:", PORT);
console.log("App listen function:", typeof app.listen);

const server = app.listen(PORT, () => {
  console.log("=== ✅ LISTENING OK ===");
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Test: http://localhost:${PORT}/__ping`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on("error", (error) => {
  console.error("=== ❌ SERVER ERROR ===");
  console.error("Error code:", error.code);
  console.error("Error message:", error.message);
  console.error("Full error:", error);
});

console.log("=== 9. SERVER OBJECT CREATED ===");
