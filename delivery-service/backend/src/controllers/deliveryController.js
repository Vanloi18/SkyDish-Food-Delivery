import mongoose from "mongoose";
import Delivery from "../models/Delivery.js";
import Driver from "../models/Driver.js";
import { geocodeAddress } from "../utils/geocode.js";
import { getIO } from "../utils/socket.js";

const ACTIVE_DELIVERY_FILTER = { status: { $ne: "Delivered" } };
export const DELIVERY_TRANSITIONS = {
  assigned: ["To be delivered"],
  "To be delivered": ["Picked-up"],
  "Picked-up": ["Delivered"],
  Delivered: []
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const ordersCollection = () => mongoose.connection.db?.collection("orders");

export const getAvailableOrders = async (req, res) => {
  try {
    const collection = ordersCollection();
    if (!collection) return res.status(503).json({ success: false, message: "Database is not ready" });
    const claimedOrderIds = await Delivery.distinct("orderId", ACTIVE_DELIVERY_FILTER);
    const excludedIds = claimedOrderIds.filter(isObjectId).map((id) => new mongoose.Types.ObjectId(id));
    const filter = {
      status: { $in: ["Confirmed", "Preparing"] },
      ...(excludedIds.length ? { _id: { $nin: excludedIds } } : {})
    };
    const orders = await collection.find(filter, {
      projection: { restaurantId: 1, restaurantName: 1, deliveryAddress: 1, status: 1, createdAt: 1, totalPrice: 1 }
    }).sort({ createdAt: 1 }).limit(50).toArray();
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch available orders" });
  }
};

export const createDelivery = async (req, res) => {
  let driverReserved = false;
  try {
    const { orderId, pickupAddress } = req.body;
    const driverId = req.driver;
    if (!isObjectId(orderId) || typeof pickupAddress !== "string" || !pickupAddress.trim()) {
      return res.status(400).json({ success: false, message: "A valid orderId and pickupAddress are required" });
    }

    const collection = ordersCollection();
    const order = await collection?.findOne({ _id: new mongoose.Types.ObjectId(orderId) });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!["Confirmed", "Preparing"].includes(order.status)) {
      return res.status(409).json({ success: false, message: "Order is not ready for driver assignment" });
    }
    if (await Delivery.exists({ driver: driverId, ...ACTIVE_DELIVERY_FILTER })) {
      return res.status(409).json({ success: false, message: "Driver already has an active delivery" });
    }

    const reservedDriver = await Driver.findOneAndUpdate(
      { _id: driverId, status: "available" },
      { $set: { status: "on-delivery" } },
      { new: true }
    );
    if (!reservedDriver) {
      return res.status(409).json({ success: false, message: "Driver must be available before accepting an order" });
    }
    driverReserved = true;

    const [pickupCoords, deliveryCoords] = await Promise.all([
      geocodeAddress(pickupAddress.trim()),
      geocodeAddress(order.deliveryAddress)
    ]);
    const delivery = await Delivery.create({
      driver: driverId,
      orderId: orderId.toString(),
      customerId: String(order.customerId),
      pickupAddressString: pickupAddress.trim(),
      pickupLocation: { type: "Point", coordinates: pickupCoords },
      deliveryAddressString: order.deliveryAddress,
      deliveryLocation: { type: "Point", coordinates: deliveryCoords },
      status: "assigned"
    });

    getIO()?.to(`driver:${driverId}`).emit("new-delivery", delivery);
    return res.status(201).json({ success: true, message: "Delivery claimed successfully", delivery });
  } catch (error) {
    if (driverReserved) {
      await Driver.updateOne({ _id: req.driver, status: "on-delivery" }, { $set: { status: "available" } }).catch(() => {});
    }
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Order has already been claimed by another driver" });
    }
    console.error("Create delivery error:", error);
    res.status(500).json({ success: false, message: "Failed to create delivery" });
  }
};

export const getDriverDeliveries = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const filter = { driver: req.driver };
    const [totalItems, deliveries] = await Promise.all([
      Delivery.countDocuments(filter),
      Delivery.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    ]);
    res.json({
      success: true,
      deliveries,
      pagination: { currentPage: page, totalPages: Math.ceil(totalItems / limit) || 1, totalItems, limit }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch deliveries" });
  }
};

export const getDelivery = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    const filter = req.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, driver: req.driver };
    const delivery = await Delivery.findOne(filter);
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    res.json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch delivery" });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!isObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    if (!Object.hasOwn(DELIVERY_TRANSITIONS, status)) return res.status(400).json({ success: false, message: "Invalid status" });

    const ownershipFilter = req.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, driver: req.driver };
    const current = await Delivery.findOne(ownershipFilter);
    if (!current) return res.status(404).json({ success: false, message: "Delivery not found" });
    if (!DELIVERY_TRANSITIONS[current.status].includes(status)) {
      return res.status(409).json({ success: false, message: `Invalid delivery transition: ${current.status} -> ${status}` });
    }

    const delivery = await Delivery.findOneAndUpdate(
      { ...ownershipFilter, status: current.status },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!delivery) return res.status(409).json({ success: false, message: "Delivery was updated concurrently" });

    const orderStatus = status === "Picked-up" ? "Out for Delivery" : status === "Delivered" ? "Delivered" : null;
    let order = null;
    if (orderStatus && isObjectId(delivery.orderId)) {
      order = await ordersCollection()?.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(delivery.orderId), status: { $nin: ["Canceled", "Delivered"] } },
        { $set: { status: orderStatus, updatedAt: new Date(), ...(orderStatus === "Delivered" ? { paymentStatus: "Paid" } : {}) } },
        { returnDocument: "after" }
      );
      if (!order) {
        await Delivery.updateOne({ _id: delivery._id, status }, { $set: { status: current.status } });
        return res.status(409).json({ success: false, message: "Order status could not be synchronized" });
      }
    }

    if (status === "Delivered") {
      await Driver.updateOne({ _id: delivery.driver }, { $set: { status: "available" } });
    }
    getIO()?.to(`driver:${delivery.driver}`).emit("delivery-status", delivery);
    if (order?.restaurantId) {
      getIO()?.to(`restaurant:${order.restaurantId}`).emit("order-status-updated", { orderId: delivery.orderId, status: orderStatus });
    }
    res.json({ success: true, message: `Delivery status updated to '${status}'`, delivery });
  } catch (error) {
    console.error("Update delivery status error:", error);
    res.status(500).json({ success: false, message: "Failed to update delivery status" });
  }
};

export const updateDriverAvailability = async (req, res) => {
  try {
    const { available } = req.body;
    if (typeof available !== "boolean") return res.status(400).json({ success: false, message: "available must be boolean" });
    if (available && await Delivery.exists({ driver: req.driver, ...ACTIVE_DELIVERY_FILTER })) {
      return res.status(409).json({ success: false, message: "Cannot become available during an active delivery" });
    }
    const driver = await Driver.findByIdAndUpdate(req.driver, { status: available ? "available" : "offline" }, { new: true });
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update availability" });
  }
};

export const updateDriverLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.body;
    if (![longitude, latitude].every(Number.isFinite) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return res.status(400).json({ success: false, message: "Invalid coordinates" });
    }
    const driver = await Driver.findByIdAndUpdate(
      req.driver,
      { location: { type: "Point", coordinates: [longitude, latitude] } },
      { new: true, runValidators: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    getIO()?.to(`driver:${req.driver}`).emit("location-updated", driver.location);
    res.json({ success: true, location: driver.location });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update location" });
  }
};

export const getDeliveryByOrderId = async (req, res) => {
  try {
    if (!isObjectId(req.params.orderId)) return res.status(400).json({ success: false, message: "Invalid order ID" });
    const delivery = await Delivery.findOne({ orderId: req.params.orderId });
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    const order = await ordersCollection()?.findOne({ _id: new mongoose.Types.ObjectId(req.params.orderId) });
    const role = req.role === "superAdmin" ? "admin" : req.role;
    const allowed = role === "admin" ||
      (role === "driver" && String(delivery.driver) === String(req.driver)) ||
      (role === "customer" && String(order?.customerId) === String(req.user.id)) ||
      (role === "restaurant" && String(order?.restaurantId) === String(req.user.restaurantId || req.user.id));
    if (!allowed) return res.status(403).json({ success: false, message: "Access denied" });
    res.json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch delivery" });
  }
};

export const deleteDelivery = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid delivery ID" });
    const filter = req.role === "admin" ? { _id: req.params.id } : { _id: req.params.id, driver: req.driver };
    const delivery = await Delivery.findOne(filter);
    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });
    if (delivery.status !== "Delivered") return res.status(400).json({ success: false, message: "Only delivered deliveries can be deleted" });
    await delivery.deleteOne();
    res.json({ success: true, message: "Delivery deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete delivery" });
  }
};
