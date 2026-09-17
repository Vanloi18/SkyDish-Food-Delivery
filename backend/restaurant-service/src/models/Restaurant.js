import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Restaurant Schema
const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    location: {
      type: String,
      required: true, 
      trim: true,
      maxlength: 300,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^\+?[0-9]{9,15}$/,
    },
    profilePicture: {
      type: String, 
      default: '',
    },
    admin: {
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      password: {
        type: String,
        required: true,
        minlength: 8,
      },
    },
    availability: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash the password before saving the restaurant document
restaurantSchema.pre('save', async function (next) {
  if (this.isModified('admin.password')) {
    const salt = await bcrypt.genSalt(10);
    this.admin.password = await bcrypt.hash(this.admin.password, salt);
  }
  next();
});

// Method to compare password for login
restaurantSchema.methods.compareAdminPassword = async function (password) {
  return await bcrypt.compare(password, this.admin.password);
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;
