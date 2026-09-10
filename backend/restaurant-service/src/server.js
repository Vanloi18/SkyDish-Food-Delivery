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
import Restaurant from './models/Restaurant.js';
import { seedAll } from '../seed-all.mjs';


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

// MongoDB connection & auto-seed if database is clean
mongoose.connect(process.env.MONGO_URI, {})
  .then(async () => {
    console.log('✅ MongoDB Connected');
    try {
      const count = await Restaurant.countDocuments();
      if (count === 0) {
        console.log('🌱 Empty database detected. Running initial SkyDish idempotent seed...');
        await seedAll();
      } else {
        console.log(`ℹ️ Database initialized (${count} restaurants found).`);
      }
    } catch (seedErr) {
      console.warn('Auto-seed check notice:', seedErr.message);
    }
  })
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
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
