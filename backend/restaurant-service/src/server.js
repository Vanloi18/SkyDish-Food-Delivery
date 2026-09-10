import 'dotenv/config.js';
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';

import restaurantRoutes from './routes/restaurantRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import foodItemRoutes from './routes/foodItemRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import cors from 'cors';


const app = express();

app.use(cors());
// Middleware to parse JSON data
app.use(express.json());



// Routes
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/superAdmin', superAdminRoutes);
app.use('/api/food-items', foodItemRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/search', searchRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'restaurant-service', timestamp: new Date().toISOString() });
});

// Test route
app.get('/', (req, res) => {
  res.send('Restaurant Service Running...');
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Error handling middleware
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    message: error.message || 'Lỗi hệ thống',
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
});

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
