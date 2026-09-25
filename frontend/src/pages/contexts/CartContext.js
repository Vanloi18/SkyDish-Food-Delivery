import React, { createContext, useState, useEffect, useContext } from "react";
import { parsePrice } from "../../utils/currency";

export const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const CART_STORAGE_KEY = "skydish_cart";
const MAX_ITEM_QUANTITY = 99;

const getFoodId = (item = {}) => item._id || item.foodId || item.id || "";

const getRestaurant = (item = {}) => ({
  id:
    item.restaurantId ||
    (typeof item.restaurant === "object" ? item.restaurant?._id : item.restaurant) ||
    "",
  name:
    item.restaurantName ||
    (typeof item.restaurant === "object" ? item.restaurant?.name : "") ||
    "",
});

// A cart key is future-proof for menu options / special instructions while keeping
// legacy cart records (which only have an item id) working as before.
const getCartKey = (item = {}) => {
  const optionKey = Array.isArray(item.selectedOptions)
    ? item.selectedOptions.map((option) => option.id || option.name || option).sort().join("|")
    : "";
  return item.cartKey || `${getFoodId(item)}:${optionKey}:${item.specialInstructions || ""}`;
};

const normalizeCartItem = (item) => {
  const restaurant = getRestaurant(item);
  const quantity = Number(item?.quantity) || 1;

  return {
    ...item,
    _id: getFoodId(item),
    cartKey: getCartKey(item),
    name: item?.name || item?.foodId || "Món ăn SkyDish",
    price: parsePrice(item?.price),
    quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, quantity)),
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
  };
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(normalizeCartItem) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cartItems]);

  const addToCart = (food, quantityToAdd = 1) => {
    const incomingRestaurant = getRestaurant(food);
    const activeRestaurant = getRestaurant(cartItems[0]);

    // An order belongs to one restaurant in the current order-service contract.
    // Do not silently send items from another restaurant to the first restaurant.
    if (
      cartItems.length > 0 &&
      activeRestaurant.id &&
      incomingRestaurant.id &&
      activeRestaurant.id !== incomingRestaurant.id
    ) {
      return {
        added: false,
        reason: "different-restaurant",
        restaurantName: activeRestaurant.name || "nhà hàng hiện tại",
      };
    }

    setCartItems((prev) => {
      const normalizedFood = normalizeCartItem({ ...food, quantity: quantityToAdd });
      const currentRestaurant = getRestaurant(prev[0]);

      if (
        prev.length > 0 &&
        currentRestaurant.id &&
        normalizedFood.restaurantId &&
        currentRestaurant.id !== normalizedFood.restaurantId
      ) {
        return prev;
      }

      const existingIndex = prev.findIndex((item) => getCartKey(item) === normalizedFood.cartKey);
      if (existingIndex > -1) {
        const updated = [...prev];
        const cur = updated[existingIndex];
        const newQty = Math.min(
          MAX_ITEM_QUANTITY,
          (Number(cur.quantity) || 1) + (Number(quantityToAdd) || 1)
        );
        updated[existingIndex] = {
          ...cur,
          quantity: newQty,
          restaurantId: cur.restaurantId || normalizedFood.restaurantId,
          restaurantName: cur.restaurantName || normalizedFood.restaurantName,
        };
        return updated;
      }
      return [...prev, normalizedFood];
    });

    return { added: true };
  };

  const updateQuantity = (itemKey, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        (item.cartKey || getFoodId(item)) === itemKey
          ? { ...item, quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Number(newQuantity) || 1)) }
          : item
      )
    );
  };

  const removeFromCart = (itemKey) => {
    setCartItems((prev) =>
      prev.filter((item) => (item.cartKey || getFoodId(item)) !== itemKey)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItemCount = cartItems.reduce(
    (acc, item) => acc + (Number(item.quantity) || 1),
    0
  );

  const subtotal = cartItems.reduce(
    (acc, item) => acc + parsePrice(item.price) * (Number(item.quantity) || 1),
    0
  );

  const deliveryFee = cartItems.length > 0 ? 15000 : 0;
  const totalAmount = subtotal + deliveryFee;
  const restaurantsInCart = Array.from(
    new Set(cartItems.map((item) => getRestaurant(item).id).filter(Boolean))
  );
  const cartRestaurant = getRestaurant(cartItems[0]);
  const hasMixedRestaurants = restaurantsInCart.length > 1;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItemCount,
        subtotal,
        deliveryFee,
        totalAmount,
        cartRestaurantId: cartRestaurant.id,
        cartRestaurantName: cartRestaurant.name,
        hasMixedRestaurants,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
