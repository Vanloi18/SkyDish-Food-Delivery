require('dotenv').config();
const express = require('express');
const cors = require('cors');  
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

// Connect DB then start
connectDB().then(() => {
  app.use('/api/auth', authRoutes);

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Auth Service running on port ${PORT}`);
  });
});
