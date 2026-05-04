const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Catch process errors to prevent silent crashes
process.on('uncaughtException', (err) => console.error('🔥 UNCAUGHT EXCEPTION:', err.message, err.stack));
process.on('unhandledRejection', (reason) => console.error('🔥 UNHANDLED REJECTION:', reason));

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');


const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

const MONGODB_URI = process.env.MONGODB_URI;

// Database connection management for Serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables!');
    throw new Error('Database configuration missing');
  }

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    throw err;
  }
};

// Middleware to ensure DB connection for API routes
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await connectDB();
      next();
    } catch (err) {
      console.error('API Error (DB Connection):', err.message);
      res.status(500).json({ 
        success: false, 
        message: 'Database connection failed. Please check Atlas IP whitelist.',
      });
    }
  } else {
    next();
  }
});



// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);

// Serve frontend for any non-API route
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server if not on Vercel

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Export the app for Vercel
module.exports = app;


