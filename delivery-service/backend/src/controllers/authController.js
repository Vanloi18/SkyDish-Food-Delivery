import Driver from "../models/Driver.js";
import jwt from "jsonwebtoken";
import validator from "validator";
import dotenv from "dotenv";

dotenv.config();

// Token Generation
const generateToken = (driverOrId) => {
  const secret = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';
  const id = (driverOrId && driverOrId._id) ? driverOrId._id.toString() : (driverOrId ? driverOrId.toString() : '');
  const name = driverOrId && driverOrId.name ? driverOrId.name : undefined;
  return jwt.sign({ id, role: 'driver', name }, secret, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
  });
};

// Input Validation
const validateLoginInput = (email, password) => {
  const errors = {};
  
  if (typeof email !== 'string' || !validator.isEmail(email)) {
    errors.email = 'Invalid email format';
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

// Driver Login
export const loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input Validation
    const { errors, isValid } = validateLoginInput(email, password);
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        errors 
      });
    }

    // Find Driver
    const normalizedEmail = email.trim().toLowerCase();
    const driver = await Driver.findOne({ email: normalizedEmail }).select('+password');
    if (!driver) {
      console.log(`Login attempt failed - driver not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Password Comparison
    const isMatch = await driver.comparePassword(password);
    if (!isMatch) {
      console.log(`Login attempt failed - password mismatch for: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Token Generation
    const token = generateToken(driver);

    // Response Data
    const driverData = {
      id: driver._id,
      name: driver.name,
      email: driver.email,
      vehicleType: driver.vehicleType,
      status: driver.status
    };

    console.log(`Successful login for driver: ${driver.email}`);
    res.status(200).json({
      success: true,
      token,
      data: driverData
    });

  } catch (err) {
    console.error('Login Controller Error:', err);
    res.status(500).json({
      success: false,
      message: 'Authentication server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Driver Registration
export const registerDriver = async (req, res) => {
  try {
    const { name, email, password, phone, vehicleType, vehicleNumber } = req.body;

    // Validate Input
    if (!name || !email || !password || !phone || !vehicleType || !vehicleNumber) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const errors = {};
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();
    const normalizedVehicleNumber = String(vehicleNumber).trim().toUpperCase();
    if (!validator.isEmail(normalizedEmail)) errors.email = 'Invalid email format';
    if (typeof password !== 'string' || password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!/^[0-9]{10,15}$/.test(normalizedPhone)) errors.phone = 'Phone number must contain 10-15 digits';
    if (!['bike', 'car', 'truck'].includes(vehicleType)) errors.vehicleType = 'Vehicle type must be bike, car, or truck';
    if (!/^[A-Z0-9-]{3,15}$/.test(normalizedVehicleNumber)) errors.vehicleNumber = 'Invalid vehicle number format';
    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, message: 'Invalid driver registration data', errors });
    }

    // Check for Existing Driver
    const existingDriver = await Driver.findOne({ 
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }, { vehicleNumber: normalizedVehicleNumber }]
    });
    
    if (existingDriver) {
      let conflictField = existingDriver.email === email ? 'email' : 
                        existingDriver.phone === phone ? 'phone' : 'vehicleNumber';
      return res.status(409).json({ 
        success: false, 
        message: `${conflictField} already registered` 
      });
    }

    // Create New Driver
    const driver = await Driver.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
      vehicleType,
      vehicleNumber: normalizedVehicleNumber
    });

    // Generate Token
    const token = generateToken(driver);

    // Prepare Response
    const driverData = {
      id: driver._id,
      name: driver.name,
      email: driver.email,
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      status: driver.status
    };

    console.log(`New driver registered: ${driver.email}`);
    res.status(201).json({
      success: true,
      token,
      data: driverData
    });

  } catch (err) {
    console.error('Registration Error:', err);
    const status = err?.code === 11000 ? 409 : err?.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({
      success: false, 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get Driver Profile
export const getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      data: driver,
      driver
    });
    
  } catch (err) {
    console.error('Profile Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile'
    });
  }
};
