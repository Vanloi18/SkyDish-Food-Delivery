import express from 'express';
import Restaurant from '../models/Restaurant.js';
import FoodItem from '../models/FoodItem.js';

const router = express.Router();

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Whitelist of supported sort options
const ALLOWED_SORT_OPTIONS = ['relevance', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest'];

// Advanced Search & Autocomplete across Restaurants, Foods, and Categories with Pagination
router.get('/', async (req, res) => {
  try {
    let { q = '', category, minPrice, maxPrice, sortBy = 'relevance', isAvailable, page = 1, limit = 20 } = req.query;
    
    // Prevent regex abuse / Denial of Service by capping search string length
    let queryStr = (typeof q === 'string' ? q.trim() : '');
    if (queryStr.length > 100) {
      queryStr = queryStr.substring(0, 100);
    }
    const safeRegex = escapeRegex(queryStr);

    // 1. Restaurant Search Filter
    const restaurantFilter = {};
    if (queryStr) {
      restaurantFilter.$or = [
        { name: { $regex: safeRegex, $options: 'i' } },
        { location: { $regex: safeRegex, $options: 'i' } },
        { ownerName: { $regex: safeRegex, $options: 'i' } },
      ];
    }
    if (isAvailable === 'true') {
      restaurantFilter.availability = true;
    }

    // 2. Food Items Search Filter
    const foodFilter = {};
    if (queryStr) {
      foodFilter.$or = [
        { name: { $regex: safeRegex, $options: 'i' } },
        { description: { $regex: safeRegex, $options: 'i' } },
        { category: { $regex: safeRegex, $options: 'i' } },
      ];
    }
    if (category && category !== 'ALL') {
      foodFilter.category = String(category).trim();
    }
    
    // Validate numeric range for price filters
    if (minPrice !== undefined && !isNaN(Number(minPrice)) && Number(minPrice) >= 0) {
      foodFilter.price = foodFilter.price || {};
      foodFilter.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice)) && Number(maxPrice) >= 0) {
      foodFilter.price = foodFilter.price || {};
      foodFilter.price.$lte = Number(maxPrice);
    }
    if (isAvailable === 'true') {
      foodFilter.availability = true;
    }

    // 3. Whitelisted Sorting logic
    const sanitizedSortBy = ALLOWED_SORT_OPTIONS.includes(sortBy) ? sortBy : 'relevance';
    let sortOptions = {};
    if (sanitizedSortBy === 'price_asc') sortOptions = { price: 1 };
    else if (sanitizedSortBy === 'price_desc') sortOptions = { price: -1 };
    else if (sanitizedSortBy === 'name_asc') sortOptions = { name: 1 };
    else if (sanitizedSortBy === 'name_desc') sortOptions = { name: -1 };
    else sortOptions = { createdAt: -1 };

    // 4. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skipNum = (pageNum - 1) * limitNum;

    // Execute count and query
    const [totalRestaurants, totalFoods, restaurants, foods] = await Promise.all([
      Restaurant.countDocuments(restaurantFilter),
      FoodItem.countDocuments(foodFilter),
      Restaurant.find(restaurantFilter)
        .select('-admin.password')
        .skip(skipNum)
        .limit(limitNum),
      FoodItem.find(foodFilter)
        .populate('restaurant', 'name location availability profilePicture')
        .sort(sortOptions)
        .skip(skipNum)
        .limit(limitNum),
    ]);

    // Extract unique categories matching the query
    const categoriesSet = new Set();
    foods.forEach((f) => {
      if (f.category) categoriesSet.add(f.category);
    });

    const totalResults = totalRestaurants + totalFoods;
    const totalPages = Math.ceil(totalResults / limitNum) || 1;

    res.status(200).json({
      query: queryStr,
      totalResults,
      restaurants,
      foods,
      categories: Array.from(categoriesSet),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalResults,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error('Error during search:', err);
    res.status(500).json({ message: 'Lỗi thực hiện tìm kiếm.' });
  }
});

// Autocomplete suggestions (quick search suggestions)
router.get('/suggest', async (req, res) => {
  try {
    let { q = '' } = req.query;
    q = typeof q === 'string' ? q.trim() : '';
    if (!q) {
      return res.status(200).json({ suggestions: [] });
    }
    if (q.length > 50) q = q.substring(0, 50);

    const regex = new RegExp(escapeRegex(q), 'i');
    const [restaurants, foods] = await Promise.all([
      Restaurant.find({ name: regex }).select('name _id').limit(5),
      FoodItem.find({ name: regex }).select('name category _id price').limit(5),
    ]);

    const suggestions = [
      ...restaurants.map((r) => ({ type: 'restaurant', label: r.name, id: r._id })),
      ...foods.map((f) => ({ type: 'food', label: `${f.name} (${Number(f.price).toLocaleString('vi-VN')} ₫)`, id: f._id })),
    ];

    res.status(200).json({ suggestions });
  } catch (err) {
    console.error('Error getting suggestions:', err);
    res.status(500).json({ suggestions: [] });
  }
});

export default router;
