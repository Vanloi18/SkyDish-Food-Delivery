import mongoose from "mongoose";
import Delivery from "../models/Delivery.js";
import Driver from "../models/Driver.js";
import { geocodeAddress } from "../utils/geocode.js";
import { assignNearestDriver } from "../services/assignDriverService.js";
import { getIO } from "../utils/socket.js";

const getOrderSnapshot = async (orderId) => {
  if (!orderId) return null;

  try {
    const db = mongoose.connection.db;
    if (!db) return null;

    const ordersCol = db.collection("orders");

    const baseQuery = mongoose.Types.ObjectId.isValid(String(orderId))
      ? {
          $or: [
            { _id: new mongoose.Types.ObjectId(String(orderId)) },
            { _id: String(orderId) },
          ],
        }
      : { _id: String(orderId) };

    const order = await ordersCol.findOne(baseQuery);

    return order || null;
  } catch (error) {
    console.warn("Order snapshot lookup failed:", error.message);
    return null;
  }
};

const notifyDeliveryParticipants = async (
  delivery,
  { customerTitle, message, driverTitle = customerTitle }
) => {
  try {
    const order = await getOrderSnapshot(delivery.orderId);
    const db = mongoose.connection.db;
    if (!db) return;

    const recipients = [
      { userId: delivery.customerId || order?.customerId, role: "customer", title: customerTitle },
      { userId: order?.restaurantId, role: "restaurant", title: customerTitle },
      { userId: delivery.driver, role: "delivery", title: driverTitle },
      { userId: "all", role: "admin", title: customerTitle },
    ].filter((recipient) => recipient.userId);

    const now = new Date();
    await db.collection("notifications").insertMany(
      recipients.map((recipient) => ({
        userId: String(recipient.userId),
        role: recipient.role,
        type: "delivery",
        title: recipient.title,
        message,
        entityType: "order",
        entityId: String(delivery.orderId),
        isRead: false,
        readBy: [],
        createdAt: now,
        updatedAt: now,
      }))
    );
  } catch (error) {
    console.warn("Could not persist delivery notification:", error.message);
  }
};

const attachOrderMetadata = async (deliveryDoc) => {
  if (!deliveryDoc) return deliveryDoc;

  const plain = deliveryDoc.toObject
    ? deliveryDoc.toObject()
    : deliveryDoc;

  const order = await getOrderSnapshot(plain.orderId);

  if (!order) return plain;

  return {
    ...plain,

    customerName:
      plain.customerName ||
      order.customerName ||
      order.customerId ||
      "Khách hàng",

    customerPhone:
      plain.customerPhone ||
      order.customerPhone ||
      order.phone ||
      "",

    customerEmail:
      plain.customerEmail ||
      order.customerEmail ||
      order.email ||
      "",

    restaurantName:
      plain.restaurantName ||
      order.restaurantName ||
      order.restaurant?.name ||
      order.restaurantId ||
      "Nhà hàng đối tác SkyDish",

    items: Array.isArray(order.items)
      ? order.items
      : Array.isArray(plain.items)
        ? plain.items
        : [],

    totalPrice: order.totalPrice ?? plain.totalPrice ?? 0,
    subtotal: order.subtotal ?? plain.subtotal ?? 0,
    deliveryFee: order.deliveryFee ?? plain.deliveryFee ?? 0,
    discount: order.discount ?? plain.discount ?? 0,

    paymentMethod:
      order.paymentMethod ??
      plain.paymentMethod ??
      "COD",

    paymentStatus:
      order.paymentStatus ??
      plain.paymentStatus ??
      "Pending",

    createdAt: order.createdAt ?? plain.createdAt,
    updatedAt: order.updatedAt ?? plain.updatedAt,
  };
};

/**
 * 1. Tạo đơn giao hàng
 *
 * Hỗ trợ:
 * - Tạo delivery bình thường
 * - Chọn GPS latitude / longitude từ frontend
 * - Geocode địa chỉ nếu không có GPS
 * - Chỉ định driver
 * - Tự động tìm driver gần nhất
 * - Realtime socket
 * - Gắn thông tin order vào response
 */
export const createDelivery = async (req, res) => {
  try {
    const {
      orderId,
      customerId,
      pickupAddress,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
    } = req.body;

    let driverId =
      req.body.driverId ||
      (req.role === "driver" ? req.driver : null);

    if (
      !orderId ||
      !customerId ||
      !pickupAddress ||
      !deliveryAddress
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Kiểm tra GPS nếu frontend có gửi
    const hasLatitude =
      deliveryLatitude !== undefined &&
      deliveryLatitude !== null &&
      deliveryLatitude !== "";

    const hasLongitude =
      deliveryLongitude !== undefined &&
      deliveryLongitude !== null &&
      deliveryLongitude !== "";

    // Phải gửi đủ cả latitude và longitude
    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({
        success: false,
        message: "Both delivery coordinates are required.",
      });
    }

    const latitude = Number(deliveryLatitude);
    const longitude = Number(deliveryLongitude);

    // Validate tọa độ GPS
    if (
      hasLatitude &&
      (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery coordinates are invalid.",
      });
    }

    // Địa chỉ nhà hàng luôn geocode
    const pickupCoords = await geocodeAddress(pickupAddress);

    // Nếu frontend có GPS thì dùng GPS.
    // Nếu không thì geocode địa chỉ giao hàng.
    const deliveryCoords = hasLatitude
      ? [longitude, latitude]
      : await geocodeAddress(deliveryAddress);

    let assignedDriver = null;

    // Nếu đã chỉ định driverId
    if (driverId) {
      assignedDriver = await Driver.findById(driverId);

      if (assignedDriver) {
        assignedDriver.status = "on-delivery";
        await assignedDriver.save();
      }
    }
    // Nếu bật autoAssign thì tìm tài xế gần nhất
    else if (req.body.autoAssign === true) {
      assignedDriver = await assignNearestDriver(
        pickupCoords[1],
        pickupCoords[0]
      );

      if (assignedDriver) {
        driverId = assignedDriver._id;
      }
    }

    const delivery = await Delivery.create({
      driver: driverId,
      orderId,
      customerId,

      pickupAddressString: pickupAddress,

      pickupLocation: {
        type: "Point",
        coordinates: pickupCoords,
      },

      deliveryAddressString: deliveryAddress,

      deliveryLocation: {
        type: "Point",
        coordinates: deliveryCoords,
      },

      status: "assigned",
    });

    await notifyDeliveryParticipants(delivery, {
      customerTitle: "Tài xế đã nhận đơn",
      driverTitle: "Bạn có chuyến giao mới",
      message: `Đơn #${String(orderId).slice(-6).toUpperCase()} đã được tiếp nhận để giao.`,
    });

    // Gửi realtime socket tới tài xế nếu đã phân công
    try {
      const io = getIO();

      if (io && driverId) {
        io.to(driverId.toString()).emit(
          "new-delivery",
          delivery
        );
      }
    } catch (wsErr) {
      // Không để lỗi socket làm fail request
    }

    const enrichedDelivery =
      await attachOrderMetadata(delivery);

    return res.status(201).json({
      success: true,
      message: "Delivery created successfully!",

      delivery: {
        _id: enrichedDelivery._id,

        driver: delivery.driver,

        orderId: enrichedDelivery.orderId,
        customerId: enrichedDelivery.customerId,

        customerName:
          enrichedDelivery.customerName,

        customerPhone:
          enrichedDelivery.customerPhone,

        customerEmail:
          enrichedDelivery.customerEmail,

        restaurantName:
          enrichedDelivery.restaurantName,

        items: enrichedDelivery.items,

        pickupAddress:
          enrichedDelivery.pickupAddressString,

        deliveryAddress:
          enrichedDelivery.deliveryAddressString,

        pickupLocation:
          enrichedDelivery.pickupLocation,

        deliveryLocation:
          enrichedDelivery.deliveryLocation,

        status: enrichedDelivery.status,

        createdAt:
          enrichedDelivery.createdAt,

        updatedAt:
          enrichedDelivery.updatedAt,

        totalPrice:
          enrichedDelivery.totalPrice,
      },
    });
  } catch (error) {
    console.error(
      "🚨 Create delivery error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 2. Lấy danh sách giao hàng
 *
 * - Driver: chỉ xem đơn của mình
 * - Admin/Superadmin: xem toàn bộ
 * - Có filter status
 * - Có search
 * - Có pagination
 */
export const getDriverDeliveries = async (
  req,
  res
) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(req.query.limit, 10) || 10
      )
    );

    const skip = (page - 1) * limit;

    const isAdmin =
      req.role === "admin" ||
      req.role === "superadmin";

    const filter = {};

    if (!isAdmin) {
      filter.driver = req.driver;
    } else if (req.query.driverId) {
      filter.driver = req.query.driverId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(
        req.query.search,
        "i"
      );

      filter.$or = [
        { orderId: searchRegex },
        { customerId: searchRegex },
        { deliveryAddressString: searchRegex },
      ];
    }

    const [totalItems, deliveries] =
      await Promise.all([
        Delivery.countDocuments(filter),

        Delivery.find(filter)
          .populate(
            "driver",
            "name phone vehicleNumber vehicleType status"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ]);

    const enrichedDeliveries =
      await Promise.all(
        deliveries.map((delivery) =>
          attachOrderMetadata(delivery)
        )
      );

    const totalPages =
      Math.ceil(totalItems / limit) || 1;

    return res.status(200).json({
      success: true,
      deliveries: enrichedDeliveries,

      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
      },
    });
  } catch (error) {
    console.error(
      "🚨 Get deliveries error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch deliveries",
    });
  }
};

/**
 * 3. Lấy chi tiết đơn giao hàng
 */
export const getDelivery = async (req, res) => {
  try {
    const delivery =
      await Delivery.findById(req.params.id)
        .populate(
          "driver",
          "name phone vehicleNumber vehicleType status"
        );

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    const isDriverOwner =
      req.driver &&
      delivery.driver &&
      (
        delivery.driver._id
          ? delivery.driver._id.toString()
          : delivery.driver.toString()
      ) === req.driver.toString();

    const isCustomerOwner =
      req.user &&
      req.user.id &&
      (
        delivery.customerId === req.user.id ||
        delivery.customerId === req.user.name
      );

    const isAdmin =
      req.role === "admin" ||
      req.role === "superadmin" ||
      (
        req.user &&
        (
          req.user.role === "admin" ||
          req.user.role === "superAdmin"
        )
      );

    if (
      !isDriverOwner &&
      !isCustomerOwner &&
      !isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: Not your assigned delivery",
      });
    }

    const enrichedDelivery =
      await attachOrderMetadata(delivery);

    return res.json({
      success: true,

      delivery: {
        _id: enrichedDelivery._id,

        driver: delivery.driver,

        orderId: enrichedDelivery.orderId,
        customerId: enrichedDelivery.customerId,

        customerName:
          enrichedDelivery.customerName,

        customerPhone:
          enrichedDelivery.customerPhone,

        customerEmail:
          enrichedDelivery.customerEmail,

        restaurantName:
          enrichedDelivery.restaurantName,

        items: enrichedDelivery.items,

        pickupAddressString:
          enrichedDelivery.pickupAddressString,

        deliveryAddressString:
          enrichedDelivery.deliveryAddressString,

        pickupLocation:
          delivery.pickupLocation,

        deliveryLocation:
          delivery.deliveryLocation,

        status:
          enrichedDelivery.status,

        createdAt:
          enrichedDelivery.createdAt,

        updatedAt:
          enrichedDelivery.updatedAt,

        totalPrice:
          enrichedDelivery.totalPrice,
      },
    });
  } catch (error) {
    console.error(
      "🚨 Get delivery error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal Server Error",
    });
  }
};

/**
 * 4. Cập nhật trạng thái đơn giao hàng
 */
export const updateDeliveryStatus = async (
  req,
  res
) => {
  try {
    const { status } = req.body;
    const deliveryId = req.params.id;

    const validStatuses = [
      "To be delivered",
      "Picked-up",
      "Delivered",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const delivery =
      await Delivery.findById(deliveryId);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    const isDriverOwner =
      delivery.driver &&
      req.driver &&
      delivery.driver.toString() ===
        req.driver.toString();

    const isAdmin =
      req.role === "admin" ||
      req.role === "superadmin";

    if (
      delivery.driver &&
      !isDriverOwner &&
      !isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: Not your assigned delivery",
      });
    }

    // Nếu đơn chưa có tài xế và driver hiện tại cập nhật
    if (!delivery.driver && req.driver) {
      delivery.driver = req.driver;

      await Driver.findByIdAndUpdate(
        req.driver,
        {
          status: "on-delivery",
        }
      );
    }

    const oldStatus = delivery.status;

    delivery.status = status;

    await delivery.save();

    const deliveryStatusMessages = {
      "To be delivered": "Tài xế đang chuẩn bị giao đơn.",
      "Picked-up": "Tài xế đã lấy món và đang trên đường giao đến bạn.",
      Delivered: "Đơn hàng đã được giao thành công.",
    };
    await notifyDeliveryParticipants(delivery, {
      customerTitle: "Cập nhật tiến trình giao hàng",
      driverTitle: "Trạng thái chuyến giao đã cập nhật",
      message: `Đơn #${String(delivery.orderId).slice(-6).toUpperCase()}: ${deliveryStatusMessages[status]}`,
    });

    // Khi giao thành công, giải phóng tài xế
    if (
      status === "Delivered" &&
      delivery.driver
    ) {
      await Driver.findByIdAndUpdate(
        delivery.driver,
        {
          status: "available",
        }
      );
    }

    // Đồng bộ trạng thái sang orders
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
            const ordersCol =
              db.collection("orders");

            const filter =
              mongoose.Types.ObjectId.isValid(
                delivery.orderId
              )
                ? {
                    $or: [
                      {
                        _id:
                          new mongoose.Types.ObjectId(
                            delivery.orderId
                          ),
                      },
                      {
                        _id: delivery.orderId,
                      },
                    ],
                  }
                : {
                    _id: delivery.orderId,
                  };

            const updateDoc = {
              $set: {
                status: orderStatus,
                updatedAt: new Date(),

                ...(orderStatus === "Delivered"
                  ? {
                      paymentStatus: "Paid",
                    }
                  : {}),
              },
            };

            await ordersCol.updateOne(
              filter,
              updateDoc
            );
          }
        }
      }
    } catch (syncErr) {
      console.warn(
        "Notice: Order synchronization from delivery status failed:",
        syncErr.message
      );
    }

    // Realtime socket
    try {
      const io = getIO();

      if (io) {
        io.emit(
          "delivery-status-changed",
          {
            deliveryId,
            status,
            oldStatus,
          }
        );
      }
    } catch (wsErr) {
      // Ignore socket errors
    }

    return res.json({
      success: true,
      message:
        `Delivery status updated to '${status}'`,
      delivery,
    });
  } catch (error) {
    console.error(
      "🚨 Update delivery status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update delivery status",
    });
  }
};

/**
 * 5. Gán hoặc điều phối lại tài xế
 *
 * Admin hoặc auto-assign
 */
export const assignDriverToDelivery = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { driverId, autoAssign } = req.body;

    const delivery =
      await Delivery.findById(id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy chuyến giao hàng",
      });
    }

    let targetDriver = null;

    if (driverId) {
      targetDriver =
        await Driver.findById(driverId);

      if (!targetDriver) {
        return res.status(404).json({
          success: false,
          message:
            "Không tìm thấy tài xế được chỉ định",
        });
      }
    } else if (autoAssign !== false) {
      const coords =
        delivery.pickupLocation?.coordinates ||
        [106.7009, 10.7769];

      targetDriver =
        await assignNearestDriver(
          coords[1],
          coords[0]
        );

      if (!targetDriver) {
        return res.status(404).json({
          success: false,
          message:
            "Hiện không có tài xế nào khả dụng trong khu vực",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cung cấp driverId hoặc bật autoAssign",
      });
    }

    // Trả tài xế cũ về available
    if (
      delivery.driver &&
      delivery.driver.toString() !==
        targetDriver._id.toString()
    ) {
      await Driver.findByIdAndUpdate(
        delivery.driver,
        {
          status: "available",
        }
      );
    }

    // Tài xế mới đang giao hàng
    targetDriver.status = "on-delivery";

    await targetDriver.save();

    delivery.driver = targetDriver._id;

    if (delivery.status !== "Delivered") {
      delivery.status = "assigned";
    }

    await delivery.save();

    // Realtime tới tài xế
    try {
      const io = getIO();

      if (io) {
        io.to(
          targetDriver._id.toString()
        ).emit(
          "new-delivery",
          delivery
        );
      }
    } catch (wsErr) {
      // Ignore socket errors
    }

    return res.status(200).json({
      success: true,

      message:
        `Đã phân công tài xế '${targetDriver.name}' cho đơn #${delivery.orderId}`,

      delivery,

      driver: {
        id: targetDriver._id,
        name: targetDriver.name,
        phone: targetDriver.phone,
        vehicleNumber:
          targetDriver.vehicleNumber,
      },
    });
  } catch (error) {
    console.error(
      "🚨 Assign driver error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Lỗi khi gán tài xế",
    });
  }
};

/**
 * 6. Lấy danh sách chuyến giao của một tài xế
 */
export const getDeliveriesByDriver = async (
  req,
  res
) => {
  try {
    const { driverId } = req.params;

    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(req.query.limit, 10) || 10
      )
    );

    const skip = (page - 1) * limit;

    const isOwner =
      req.driver &&
      req.driver.toString() ===
        driverId.toString();

    const isAdmin =
      req.role === "admin" ||
      req.role === "superadmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Từ chối truy cập: Không thể xem đơn của tài xế khác",
      });
    }

    const filter = {
      driver: driverId,
    };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [totalItems, deliveries] =
      await Promise.all([
        Delivery.countDocuments(filter),

        Delivery.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ]);

    const totalPages =
      Math.ceil(totalItems / limit) || 1;

    return res.status(200).json({
      success: true,

      deliveries,

      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
      },
    });
  } catch (error) {
    console.error(
      "🚨 Get deliveries by driver error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Lỗi lấy danh sách giao hàng của tài xế",
    });
  }
};

/**
 * 7. Lấy chi tiết đơn giao hàng theo Order ID
 */
export const getDeliveryByOrderId = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    const delivery =
      await Delivery.findOne({ orderId })
        .populate(
          "driver",
          "name phone vehicleNumber vehicleType status"
        );

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message:
          "Delivery not found by order ID",
      });
    }

    const driverId =
      delivery.driver?._id ||
      delivery.driver;

    const isAssignedDriver =
      req.role === "driver" &&
      req.driver &&
      driverId &&
      driverId.toString() ===
        req.driver.toString();

    const isCustomer =
      req.role === "customer" &&
      req.user?.id &&
      String(delivery.customerId) ===
        String(req.user.id);

    const isAdmin =
      req.role === "admin" ||
      req.role === "superadmin";

    if (
      !isAssignedDriver &&
      !isCustomer &&
      !isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: Not authorized to view this delivery",
      });
    }

    const enrichedDelivery =
      await attachOrderMetadata(delivery);

    return res.json({
      success: true,
      delivery: enrichedDelivery,
    });
  } catch (error) {
    console.error(
      "🚨 Get delivery by order ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * 8. Xóa đơn giao hàng
 *
 * Chỉ driver sở hữu sau khi Delivered
 * hoặc Admin/Superadmin.
 */
export const deleteDelivery = async (
  req,
  res
) => {
  try {
    const delivery =
      await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    const isDriverOwner =
      req.driver &&
      delivery.driver &&
      delivery.driver.toString() ===
        req.driver.toString();

    const isAdmin =
      req.role === "admin" ||
      req.role === "superadmin";

    if (!isDriverOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: Not your assigned delivery",
      });
    }

    if (
      delivery.status !== "Delivered" &&
      !isAdmin
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only delivered deliveries can be deleted",
      });
    }

    await Delivery.findByIdAndDelete(
      req.params.id
    );

    return res.json({
      success: true,
      message:
        "Delivery deleted successfully",
    });
  } catch (error) {
    console.error(
      "🚨 Delete delivery error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete delivery",
    });
  }
};