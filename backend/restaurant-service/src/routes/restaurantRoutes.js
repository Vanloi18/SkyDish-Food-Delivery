import express from 'express';
import mongoose from 'mongoose';
const router = express.Router();

router.get("/health", (req, res) => res.status(200).json({ status: "ok", service: "restaurant-service", timestamp: new Date().toISOString() }));

import jwt from 'jsonwebtoken';
import Restaurant from '../models/Restaurant.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { isValidObjectId, isValidPhone, validateRestaurantRegistration } from '../utils/validation.js';


// Register a new restaurant (with admin email and password)
router.post('/register', upload.single('profilePicture'), async (req, res) => {
  const { name, ownerName, location, contactNumber, email, password } = req.body;
  let profilePicture = req.file ? `/uploads/${req.file.filename}` : (req.body.profilePicture || '');
  if (typeof profilePicture === 'string' && /^[a-zA-Z]:[\\\/]/.test(profilePicture.trim().replace(/^["']|["']$/g, ''))) {
    profilePicture = '';
  }

  try {
    const errors = validateRestaurantRegistration(req.body);
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: 'Invalid restaurant registration data', errors });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingRestaurant = await Restaurant.findOne({
      $or: [{ name: name.trim() }, { 'admin.email': normalizedEmail }],
    });
    if (existingRestaurant) {
      return res.status(400).json({ message: 'Restaurant or Email already exists' });
    }

    const newRestaurant = new Restaurant({
      name: name.trim(),
      ownerName: ownerName.trim(),
      location: location.trim(),
      contactNumber: contactNumber.trim(),
      profilePicture,
      admin: { email: normalizedEmail, password },
    });

    await newRestaurant.save();
    res.status(201).json({ message: 'Restaurant and Admin registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Login restaurant admin
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const restaurant = await Restaurant.findOne({ 'admin.email': email.trim().toLowerCase() });
    if (!restaurant) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await restaurant.compareAdminPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: restaurant._id, role: 'restaurant', restaurantId: restaurant._id, name: restaurant.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/profile', authMiddleware, authorizeRoles('restaurant'), async (req, res) => {
  try {
    if (!isValidObjectId(req.user.id)) return res.status(400).json({ message: 'Invalid restaurant ID' });
    const restaurant = await Restaurant.findById(req.user.id).select('-admin.password');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.status(200).json(restaurant);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update restaurant details
router.put('/update', authMiddleware, authorizeRoles('restaurant'), upload.single('profilePicture'), async (req, res) => {
  const { name, ownerName, location, contactNumber } = req.body;

  try {
    if (!isValidObjectId(req.user.id)) return res.status(400).json({ message: 'Invalid restaurant ID' });
    if (contactNumber !== undefined && !isValidPhone(contactNumber)) {
      return res.status(400).json({ message: 'Invalid contact number' });
    }
    const restaurant = await Restaurant.findById(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Update fields if provided
    if (name) restaurant.name = name.trim();
    if (ownerName) restaurant.ownerName = ownerName.trim();
    if (location) restaurant.location = location.trim();
    if (contactNumber) restaurant.contactNumber = contactNumber.trim();

    // Update profile picture if a file is uploaded or url provided
    if (req.file) {
      restaurant.profilePicture = `/uploads/${req.file.filename}`;
    } else if (req.body.profilePicture !== undefined) {
      let pic = req.body.profilePicture || '';
      if (typeof pic === 'string') {
        const trimmed = pic.trim().replace(/^["']|["']$/g, '');
        restaurant.profilePicture = /^[a-zA-Z]:[\\\/]/.test(trimmed) ? '' : trimmed;
      }
    }

    await restaurant.save();
    res.status(200).json({ message: 'Profile updated successfully', restaurant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update availability
router.put('/availability', authMiddleware, authorizeRoles('restaurant'), async (req, res) => {
  const { availability } = req.body;

  try {
    if (!isValidObjectId(req.user.id)) return res.status(400).json({ message: 'Invalid restaurant ID' });
    const restaurant = await Restaurant.findById(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    if (typeof availability !== 'boolean') {
      return res.status(400).json({ message: 'Invalid value for availability. Must be true or false.' });
    }

    restaurant.availability = availability;
    await restaurant.save();

    res.status(200).json({ message: `Restaurant is now ${availability ? 'Open' : 'Closed'}`, availability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all restaurants (Public customer discovery)
router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().select('-admin');
    res.status(200).json(restaurants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get a single restaurant by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null' || !id.trim()) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }

    let restaurant = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      restaurant = await Restaurant.findById(id).select('-admin');
    }

    if (!restaurant) {
      restaurant = await Restaurant.findOne({ name: id.trim() }).select('-admin');
    }

    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.status(200).json(restaurant);
  } catch (err) {
    console.error('Error fetching restaurant:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
