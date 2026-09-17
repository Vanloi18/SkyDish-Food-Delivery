import mongoose from 'mongoose';

export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const isValidEmail = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isValidPhone = (value) =>
  typeof value === 'string' && /^\+?[0-9]{9,15}$/.test(value.trim());

export const validateRestaurantRegistration = (body = {}) => {
  const errors = {};
  for (const field of ['name', 'ownerName', 'location']) {
    if (!isNonEmptyString(body[field])) errors[field] = `${field} is required`;
  }
  if (!isValidPhone(body.contactNumber)) errors.contactNumber = 'Contact number must contain 9-15 digits';
  if (!isValidEmail(body.email)) errors.email = 'Invalid email format';
  if (typeof body.password !== 'string' || body.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return errors;
};

export const validateFoodPayload = (body = {}, { partial = false } = {}) => {
  const errors = {};
  if (!partial || body.name !== undefined) {
    if (!isNonEmptyString(body.name)) errors.name = 'Food name is required';
  }
  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (body.price === '' || !Number.isFinite(price) || price < 0) {
      errors.price = 'Price must be a non-negative number';
    }
  }
  if (!partial || body.category !== undefined) {
    if (!isNonEmptyString(body.category)) errors.category = 'Category is required';
  }
  if (body.availability !== undefined && ![true, false, 'true', 'false'].includes(body.availability)) {
    errors.availability = 'Availability must be true or false';
  }
  return errors;
};

export const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
