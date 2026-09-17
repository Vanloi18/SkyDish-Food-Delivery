import mongoose from "mongoose";
import Delivery from "../models/Delivery.js";
import { geocodeAddress } from "../utils/geocode.js";

export const createDelivery = async (req, res) => {
  try {
    const { orderId, customerId, pickupAddress, deliveryAddress } = req.body;
    const driverId = req.body.driverId || (req.role === 'driver' ? req.driver : null);

    if (!orderId || !customerId || !pickupAddress || !deliveryAddress) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const pickupCoords = await geocodeAddress(pickupAddress);
    const deliveryCoords = await geocodeAddress(deliveryAddress);

    const delivery = await Delivery.create({
      driver: driverId,
      orderId,
      customerId,
      pickupAddressString: pickupAddress,
      pickupLocation: { type: "Point", coordinates: pickupCoords },
      deliveryAddressString: deliveryAddress,
      deliveryLocation: { type: "Point", coordinates: deliveryCoords },
      status: "assigned"
    });

    return res.status(201).json({
      success: true,
      message: "Delivery created successfully!",
      delivery: {
        _id: delivery._id,
        orderId: delivery.orderId,
        customerId: delivery.customerId,
        pickupAddress: delivery.pickupAddressString,
        deliveryAddress: delivery.deliveryAddressString,
        status: delivery.status,
        createdAt: delivery.createdAt
      }
    });

  } catch (error) {
    console.error("🚨 Create delivery error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDriverDeliveries = async (req, res) => {
  try {
    const driverId = req.driver;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { driver: driverId };
    const [totalItems, deliveries] = await Promise.all([
      Delivery.countDocuments(filter),
      Delivery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    res.status(200).json({
      success: true,
      deliveries,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit
      }
    });
  } catch (error) {
    console.error("🚨 Get deliveries error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch deliveries" });
  }
};

export const getDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    // Ownership check: Driver assigned, or order customer, or admin
    const isDriverOwner = req.driver && delivery.driver && delivery.driver.toString() === req.driver;
    const isCustomerOwner = req.user && req.user.id && (delivery.customerId === req.user.id || delivery.customerId === req.user.name);
    const isAdmin = req.role === "admin" || req.role === "superadmin" || (req.user && (req.user.role === "admin" || req.user.role === "superAdmin"));

    if (!isDriverOwner && !isCustomerOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied: Not your assigned delivery" });
    }

    res.json({
      success: true,
      delivery: {
        _id: delivery._id,
        orderId: delivery.orderId,
        customerId: delivery.customerId,
        pickupAddressString: delivery.pickupAddressString,
        deliveryAddressString: delivery.deliveryAddressString,
        status: delivery.status,
        createdAt: delivery.createdAt
      }
    });
  } catch (error) {
    console.error("🚨 Get delivery error:", error);
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// Update Delivery Status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const deliveryId = req.params.id;

    // ✅ Updated to include all valid statuses
    const validStatuses = ["To be delivered", "Picked-up", "Delivered"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    // Enforce driver ownership
    if (delivery.driver && req.driver && delivery.driver.toString() !== req.driver && req.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Access denied: Not your assigned delivery" });
    }

    // Auto-assign if delivery had no assigned driver
    if (!delivery.driver && req.driver) {
      delivery.driver = req.driver;
    }

    // Update status
    delivery.status = status;
    await delivery.save();

    // Synchronize corresponding Order in shared MongoDB database
    try {
      if (delivery.orderId) {
        let orderStatus = null;
        if (status === "Picked-up") {
          orderStatus = "Out for Delivery";
        } else if (status === "Delivered") {
          orderStatus = "Delivered";
        }

        if (orderStatus) {
          const db = mongoose.connection.db;
          if (db) {
            const ordersCol = db.collection("orders");
            const filter = mongoose.Types.ObjectId.isValid(delivery.orderId)
              ? { $or: [{ _id: new mongoose.Types.ObjectId(delivery.orderId) }, { _id: delivery.orderId }] }
              : { _id: delivery.orderId };

            const updateDoc = {
              $set: {
                status: orderStatus,
                updatedAt: new Date(),
                ...(orderStatus === "Delivered" ? { paymentStatus: "Paid" } : {})
              }
            };
            await ordersCol.updateOne(filter, updateDoc);
          }
        }
      }
    } catch (syncErr) {
      console.warn("Notice: Order synchronization from delivery status failed:", syncErr.message);
    }

    res.json({
      success: true,
      message: `Delivery status updated to '${status}'`,
      delivery
    });

  } catch (error) {
    console.error("🚨 Update delivery status error:", error);
    res.status(500).json({ success: false, message: "Failed to update delivery status" });
  }
};

// New Controller to get Delivery by OrderID
export const getDeliveryByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const delivery = await Delivery.findOne({ orderId });

    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found by order ID" });
    }

    res.json({
      success: true,
      delivery
    });
  } catch (error) {
    console.error("🚨 Get delivery by order ID error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// Delete Delivery
export const deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    // Ownership check
    const isDriverOwner = req.driver && delivery.driver && delivery.driver.toString() === req.driver;
    const isAdmin = req.role === "admin" || req.role === "superadmin";
    if (!isDriverOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied: Not your assigned delivery" });
    }

    if (delivery.status !== "Delivered") {
      return res.status(400).json({ 
        success: false, 
        message: "Only delivered deliveries can be deleted" 
      });
    }

    await Delivery.findByIdAndDelete(req.params.id); // ✅ Correct way!

    res.json({ 
      success: true, 
      message: "Delivery deleted successfully" 
    });

  } catch (error) {
    console.error("🚨 Delete delivery error:", error);
    res.status(500).json({ success: false, message: "Failed to delete delivery" });
  }
};



