import mongoose from 'mongoose';

const foodItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
    },
    availability: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Reuse existing model if compiled, or compile on 'FoodItem'
const FoodItem = mongoose.models.FoodItem || mongoose.model('FoodItem', foodItemSchema);
export default FoodItem;
