import React, { createContext, useState, useEffect, useContext } from "react";
import { parsePrice } from "../../utils/currency";

export const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem("skydish_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("skydish_cart", JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cartItems]);

  const addToCart = (food, quantityToAdd = 1) => {
    setCartItems((prev) => {
      const foodKey = food._id || food.foodId || food.id;
      const resolvedRestaurantId =
        food.restaurantId ||
        (typeof food.restaurant === "object" ? food.restaurant?._id : food.restaurant) ||
        "";
      const resolvedRestaurantName =
        food.restaurantName ||
        (typeof food.restaurant === "object" ? food.restaurant?.name : "") ||
        "";

      const existingIndex = prev.findIndex((item) => (item._id || item.foodId || item.id) === foodKey);
      if (existingIndex > -1) {
        const updated = [...prev];
        const cur = updated[existingIndex];
        const newQty = (Number(cur.quantity) || 1) + (Number(quantityToAdd) || 1);
        updated[existingIndex] = {
          ...cur,
          quantity: newQty,
          restaurantId: cur.restaurantId || resolvedRestaurantId,
          restaurantName: cur.restaurantName || resolvedRestaurantName,
        };
        return updated;
      }
      return [
        ...prev,
        {
          ...food,
          _id: food._id || food.foodId || foodKey,
          name: food.name || food.foodId || "Món ăn SkyDish",
          quantity: Number(quantityToAdd) || 1,
          price: parsePrice(food.price),
          restaurantId: resolvedRestaurantId,
          restaurantName: resolvedRestaurantName,
        },
      ];
    });
  };

  const updateQuantity = (foodId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(foodId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        (item._id || item.foodId || item.id) === foodId
          ? { ...item, quantity: Number(newQuantity) }
          : item
      )
    );
  };

  const removeFromCart = (foodId) => {
    setCartItems((prev) =>
      prev.filter((item) => (item._id || item.foodId || item.id) !== foodId)
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
