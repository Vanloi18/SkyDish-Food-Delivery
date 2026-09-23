import express from 'express';
import mongoose from 'mongoose';
import FoodItem from '../models/FoodItem.js';
import Restaurant from '../models/Restaurant.js';
import authMiddleware from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Create a new food item (Restaurant Admin only)
router.post('/create', authMiddleware, upload.single('image'), async (req, res) => {
  const { name, description, price, category } = req.body;

  try {
    const restaurant = await Restaurant.findById(req.user.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    let image = req.file ? `/uploads/${req.file.filename}` : (req.body.image || req.body.imageUrl || '');
    // Sanitize: Reject local Windows or desktop paths
    if (typeof image === 'string' && /^[a-zA-Z]:[\\\/]/.test(image.trim().replace(/^["']|["']$/g, ''))) {
      image = '';
    }

    const newFoodItem = new FoodItem({
      restaurant: restaurant._id,
      name: typeof name === 'string' ? name.trim() : name,
      description: typeof description === 'string' && description.trim()
        ? description.trim()
        : 'Món ngon chất lượng từ nhà hàng.',
      price: Number(price),
      image,
      category,
    });

    await newFoodItem.save();
    res.status(201).json({ message: 'Food item created successfully', newFoodItem });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dữ liệu món ăn không hợp lệ.', details: err.message });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all food items for a restaurant (Restaurant Admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const foodItems = await FoodItem.find({ restaurant: req.user.id });
    res.status(200).json(foodItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update a food item (Restaurant Admin only)
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  const { name, description, price, imageUrl, image, category, availability } = req.body;

  try {
    const foodItem = await FoodItem.findById(req.params.id);
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    if (foodItem.restaurant.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to modify this food item' });
    }

    if (name) foodItem.name = name;
    if (description !== undefined) foodItem.description = description;
    if (price !== undefined) foodItem.price = Number(price);
    if (category) foodItem.category = category;
    if (typeof availability !== 'undefined') {
      foodItem.availability = availability === true || availability === 'true';
    }

    if (req.file) {
      foodItem.image = `/uploads/${req.file.filename}`;
    } else if (image !== undefined || imageUrl !== undefined) {
      let candidate = (image !== undefined ? image : imageUrl) || '';
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim().replace(/^["']|["']$/g, '');
        if (/^[a-zA-Z]:[\\\/]/.test(trimmed)) {
          foodItem.image = '';
        } else {
          foodItem.image = trimmed;
        }
      }
    }

    await foodItem.save();
    res.status(200).json({ message: 'Food item updated successfully', foodItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete a food item (Restaurant Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const foodItem = await FoodItem.findById(req.params.id);
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    if (foodItem.restaurant.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this food item' });
    }

    await foodItem.deleteOne();
    res.status(200).json({ message: 'Food item deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update food item availability (Restaurant Admin only)
router.put('/availability/:id', authMiddleware, async (req, res) => {
  const { availability } = req.body;

  try {
    const foodItem = await FoodItem.findById(req.params.id);
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    if (foodItem.restaurant.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to modify this food item' });
    }

    if (typeof availability !== 'boolean') {
      return res.status(400).json({ message: 'Invalid value for availability. Must be true or false.' });
    }

    foodItem.availability = availability;
    await foodItem.save();

    res.status(200).json({ message: `Food item is now ${availability ? 'Available' : 'Unavailable'}`, foodItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all food items with Pagination (Public)
router.get('/all', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [totalItems, foodItems] = await Promise.all([
      FoodItem.countDocuments(),
      FoodItem.find().populate('restaurant', 'name location').skip(skip).limit(limit)
    ]);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    res.setHeader("X-Total-Count", totalItems);
    res.setHeader("X-Total-Pages", totalPages);

    if (req.query.page !== undefined || req.query.limit !== undefined) {
      return res.status(200).json({
        data: foodItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          limit
        }
      });
    }

    res.status(200).json(foodItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get a single food item with populated restaurant (Public)
router.get('/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null' || !id.trim()) {
      return res.status(400).json({ message: 'Invalid food item ID' });
    }

    let item = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await FoodItem.findById(id).populate('restaurant', 'name location profilePicture contactNumber');
    }
    if (!item) {
      item = await FoodItem.findOne({ name: id.trim() }).populate('restaurant', 'name location profilePicture contactNumber');
    }
    if (!item) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    res.status(200).json(item);
  } catch (err) {
    console.error('Error fetching food item detail:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get food items by restaurant (Public)
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Find food items for the given restaurant ID
    const foodItems = await FoodItem.find({ restaurant: restaurantId }).populate('restaurant', 'name location');

    if (!foodItems.length) {
      return res.status(404).json({ message: 'No food items found for this restaurant' });
    }

    res.status(200).json(foodItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
