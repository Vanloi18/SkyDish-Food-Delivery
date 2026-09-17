import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import FoodItem from "../models/foodItemModel.js";
import Coupon from "../models/couponModel.js";
import { sendOrderConfirmationEmail } from "./emailService.js";

/**
 * Helper to check ownership or admin role
 */
export const checkOrderOwnership = (order, user) => {
    if (!user) return false;
    const role = user.role === "superAdmin" ? "admin" : user.role;
    if (role === "admin") return true;

    if (role === "customer") {
        return Boolean(
            String(order.customerId) === String(user.id) ||
            (user.email && order.customerEmail === user.email) ||
            (user.name && order.customerId === user.name)
        );
    }

    if (role === "restaurant") {
        return Boolean(
            String(order.restaurantId) === String(user.restaurantId || user.id) ||
            (user.name && order.restaurantName === user.name)
        );
    }

    return false;
};

/**
 * Service: Create new order with Server Authority on Price & Transaction
 */
export const createOrderService = async (orderData, authenticatedUser) => {
    const { items, deliveryAddress, paymentMethod, paymentStatus, couponCode } = orderData;

    // 1. Enforce authenticated identity - Guests are strictly forbidden from creating orders
    if (!authenticatedUser || !authenticatedUser.id) {
        const error = new Error("Vui lòng đăng nhập để đặt hàng.");
        error.statusCode = 401;
        throw error;
    }

    // Enforce role: Only Customer or Admin can create customer orders
    const role = authenticatedUser.role === "superAdmin" ? "admin" : (authenticatedUser.role || "customer");
    if (role !== "customer" && role !== "admin") {
        const error = new Error("Tài khoản hiện tại không có quyền đặt hàng với vai trò khách hàng.");
        error.statusCode = 403;
        throw error;
    }

    // CRITICAL SECURITY: Never trust customerId from client body! Always derive from authenticated JWT
    const customerId = String(authenticatedUser.id);
    const customerName = authenticatedUser.name || orderData.customerName || "Customer";
    const customerEmail = authenticatedUser.email || orderData.customerEmail || "";
    const customerPhone = orderData.phone || orderData.customerPhone || "";

    // 2. Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
        const error = new Error("Giỏ hàng trống. Vui lòng chọn ít nhất một món ăn.");
        error.statusCode = 400;
        throw error;
    }

    if (!deliveryAddress || !deliveryAddress.trim()) {
        const error = new Error("Địa chỉ giao hàng là bắt buộc.");
        error.statusCode = 400;
        throw error;
    }

    // 3. Server Authority: Fetch authoritative items from DB and recalculate prices
    let subtotal = 0;
    const verifiedItems = [];
    let detectedRestaurantId = orderData.restaurantId;

    for (const item of items) {
        const numQty = Number(item.quantity);
        if (!Number.isInteger(numQty) || numQty <= 0) {
            const error = new Error(`Số lượng cho món ăn không hợp lệ (${item.quantity}). Phải là số nguyên dương lớn hơn 0.`);
            error.statusCode = 400;
            throw error;
        }
        const quantity = numQty;

        const rawFoodId = item.foodId || item._id || item.id;
        if (!rawFoodId) {
            const error = new Error("Mỗi sản phẩm phải có mã món ăn (foodId).");
            error.statusCode = 400;
            throw error;
        }

        // Query DB for authoritative FoodItem
        let foodDoc = null;
        if (mongoose.Types.ObjectId.isValid(rawFoodId)) {
            foodDoc = await FoodItem.findById(rawFoodId);
        }
        if (!foodDoc) {
            foodDoc = await FoodItem.findOne({ name: String(rawFoodId) });
        }

        let officialPrice = 0;
        let officialName = item.name || rawFoodId;

        if (!foodDoc) {
            const error = new Error(`Món ăn "${rawFoodId}" không tồn tại.`);
            error.statusCode = 404;
            throw error;
        }

        // Check availability
        if (foodDoc.availability === false) {
            const error = new Error(`Món "${foodDoc.name}" hiện đang tạm ngừng phục vụ.`);
            error.statusCode = 400;
            throw error;
        }
        officialPrice = Number(foodDoc.price);
        officialName = foodDoc.name;
        if (!detectedRestaurantId && foodDoc.restaurant) {
            detectedRestaurantId = foodDoc.restaurant.toString();
        }

        const itemTotal = officialPrice * quantity;
        subtotal += itemTotal;

        verifiedItems.push({
            foodId: foodDoc ? foodDoc._id.toString() : String(rawFoodId),
            name: officialName,
            quantity: quantity,
            price: officialPrice
        });
    }

    // 4. Calculate Delivery Fee & Discounts
    const deliveryFee = subtotal >= 300000 ? 0 : 15000;
    let discount = 0;
    let validCouponDoc = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
        const cleanCode = couponCode.trim().toUpperCase();
        validCouponDoc = await Coupon.findOne({ code: cleanCode, isActive: true });
        if (validCouponDoc) {
            if (subtotal >= (validCouponDoc.minOrderValue || 0)) {
                if (validCouponDoc.discountType === "percentage") {
                    discount = (subtotal * validCouponDoc.discountValue) / 100;
                    if (validCouponDoc.maxDiscount && validCouponDoc.maxDiscount > 0) {
                        discount = Math.min(discount, validCouponDoc.maxDiscount);
                    }
                } else if (validCouponDoc.discountType === "fixed") {
                    discount = Math.min(subtotal, validCouponDoc.discountValue);
                } else if (validCouponDoc.discountType === "shipping") {
                    discount = deliveryFee;
                }
            }
        }
    }

    const finalTotal = Math.max(0, subtotal + deliveryFee - discount);

    // 5. Multi-Document Transaction when replica set is available, with safe fallback on standalone mongo
    let session = null;
    let useTransaction = false;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
    } catch (sessionErr) {
        if (session) {
            session.endSession();
            session = null;
        }
        useTransaction = false;
    }

    try {
        const order = new Order({
            customerId,
            customerName,
            customerEmail,
            customerPhone,
            restaurantId: detectedRestaurantId || "restaurant_1",
            restaurantName: orderData.restaurantName || undefined,
            items: verifiedItems,
            subtotal,
            deliveryFee,
            discount,
            totalPrice: finalTotal,
            couponCode: validCouponDoc ? validCouponDoc.code : null,
            paymentMethod: orderData.paymentMethod || "STRIPE",
            paymentStatus: paymentStatus || "Pending",
            status: orderData.status || "Pending",
            deliveryAddress: deliveryAddress.trim()
        });

        if (useTransaction && session) {
            try {
                await order.save({ session });
            } catch (saveErr) {
                if (saveErr.code === 20 || saveErr.message?.includes('replica set')) {
                    await session.abortTransaction().catch(() => {});
                    session.endSession();
                    session = null;
                    useTransaction = false;
                    await order.save();
                } else {
                    throw saveErr;
                }
            }
        } else {
            await order.save();
        }

        // Update coupon usage atomically if applied
        if (validCouponDoc) {
            validCouponDoc.usedCount = (validCouponDoc.usedCount || 0) + 1;
            if (!validCouponDoc.usedByUsers) validCouponDoc.usedByUsers = [];
            validCouponDoc.usedByUsers.push({
                userId: customerId,
                orderId: order._id.toString(),
                usedAt: new Date()
            });
            if (useTransaction && session) {
                await validCouponDoc.save({ session });
            } else {
                await validCouponDoc.save();
            }
        }

        if (useTransaction && session) {
            await session.commitTransaction();
        }

        // Send order confirmation email asynchronously (failure never rolls back order)
        sendOrderConfirmationEmail(order).catch((mailErr) => {
            console.warn("Notice: Order confirmation email dispatch notice:", mailErr.message);
        });

        return order;
    } catch (txError) {
        if (useTransaction && session) {
            await session.abortTransaction();
        }
        throw txError;
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

/**
 * Service: Get orders with Ownership Scoping & Pagination
 */
export const getOrdersService = async ({ user, query }) => {
    const role = user?.role === "superAdmin" ? "admin" : (user?.role || "customer");
    const filter = {};

    if (!["customer", "restaurant", "admin"].includes(role)) {
        const error = new Error("Vai trò hiện tại không có quyền truy cập danh sách đơn hàng.");
        error.statusCode = 403;
        throw error;
    }

    // Ownership filter: never leak cross-customer or cross-restaurant data
    if (role === "customer") {
        filter.$or = [
            { customerId: user.id },
            ...(user.email ? [{ customerEmail: user.email }] : []),
            ...(user.name ? [{ customerId: user.name }] : [])
        ];
    } else if (role === "restaurant") {
        const restId = user.restaurantId || user.id;
        filter.$or = [
            { restaurantId: restId },
            ...(user.name ? [{ restaurantName: user.name }] : [])
        ];
    } else if (role === "admin") {
        // Admin can filter by customerId or restaurantId if provided in query
        if (query.customerId) filter.customerId = query.customerId;
        if (query.restaurantId) filter.restaurantId = query.restaurantId;
    }

    if (query.status) {
        filter.status = query.status;
    }

    // Pagination
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [totalItems, orders] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
        data: orders,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            limit
        }
    };
};

/**
 * Service: Get single order by ID with Ownership verification
 */
export const getOrderByIdService = async (orderId, user) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error("Mã đơn hàng không hợp lệ.");
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findById(orderId);
    if (!order) {
        const error = new Error("Không tìm thấy đơn hàng.");
        error.statusCode = 404;
        throw error;
    }

    // Enforce Ownership check
    const hasAccess = checkOrderOwnership(order, user);
    if (!hasAccess) {
        const error = new Error("Bạn không có quyền xem thông tin đơn hàng này.");
        error.statusCode = 403;
        throw error;
    }

    return order;
};

/**
 * Service: Update order details with Ownership check & Price recalculation
 */
export const updateOrderDetailsService = async (orderId, updateData, user) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error("Mã đơn hàng không hợp lệ.");
        error.statusCode = 400;
        throw error;
    }

    // If client provided status, delegate to status service
    if (updateData.status) {
        await updateOrderStatusService(orderId, updateData.status, user, updateData);
    }

    const order = await Order.findById(orderId);
    if (!order) {
        const error = new Error("Không tìm thấy đơn hàng.");
        error.statusCode = 404;
        throw error;
    }

    // Enforce Ownership check
    const hasAccess = checkOrderOwnership(order, user);
    if (!hasAccess) {
        const error = new Error("Bạn không có quyền chỉnh sửa đơn hàng này.");
        error.statusCode = 403;
        throw error;
    }

    let hasDetailsUpdate = false;
    if (updateData.deliveryAddress) {
        if (order.status === "Delivered" || order.status === "Canceled" || order.status === "Out for Delivery" || order.status === "Delivering") {
            const error = new Error(`Không thể thay đổi địa chỉ đơn hàng khi đang ở trạng thái "${order.status}".`);
            error.statusCode = 400;
            throw error;
        }
        order.deliveryAddress = updateData.deliveryAddress.trim();
        hasDetailsUpdate = true;
    }

    if (updateData.items && Array.isArray(updateData.items)) {
        if (order.status === "Delivered" || order.status === "Canceled" || order.status === "Out for Delivery" || order.status === "Delivering") {
            const error = new Error(`Không thể thay đổi món ăn khi đang ở trạng thái "${order.status}".`);
            error.statusCode = 400;
            throw error;
        }
        let subtotal = 0;
        const verifiedItems = [];

        for (const item of updateData.items) {
            const numQty = Number(item.quantity);
            if (!Number.isInteger(numQty) || numQty <= 0) {
                const error = new Error("Số lượng món ăn phải là số nguyên dương lớn hơn 0.");
                error.statusCode = 400;
                throw error;
            }
            const quantity = numQty;

            const rawFoodId = item.foodId || item._id;
            let foodDoc = null;
            if (mongoose.Types.ObjectId.isValid(rawFoodId)) {
                foodDoc = await FoodItem.findById(rawFoodId);
            }
            if (!foodDoc) {
                foodDoc = await FoodItem.findOne({ name: String(rawFoodId) });
            }

            const price = foodDoc ? Number(foodDoc.price) : Number(item.price || 0);
            subtotal += price * quantity;

            verifiedItems.push({
                foodId: foodDoc ? foodDoc._id.toString() : String(rawFoodId),
                name: foodDoc ? foodDoc.name : (item.name || rawFoodId),
                quantity,
                price
            });
        }

        order.items = verifiedItems;
        order.subtotal = subtotal;
        order.totalPrice = Math.max(0, subtotal + (order.deliveryFee || 15000) - (order.discount || 0));
        hasDetailsUpdate = true;
    }

    if (hasDetailsUpdate) {
        await order.save();
    }
    return order;
};

/**
 * Service: Update order status with Role authorization & Transition check
 */
export const updateOrderStatusService = async (orderId, newStatus, user, updateData = {}) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error("Mã đơn hàng không hợp lệ.");
        error.statusCode = 400;
        throw error;
    }

    const validStatuses = ["Pending", "Confirmed", "Preparing", "Out for Delivery", "Delivering", "Delivered", "Canceled"];
    if (!validStatuses.includes(newStatus)) {
        const error = new Error(`Trạng thái đơn hàng không hợp lệ: "${newStatus}".`);
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findById(orderId);
    if (!order) {
        const error = new Error("Không tìm thấy đơn hàng.");
        error.statusCode = 404;
        throw error;
    }

    const role = user?.role === "superAdmin" ? "admin" : (user?.role || "customer");

    if (!["customer", "restaurant", "admin"].includes(role)) {
        const error = new Error("Vai trò hiện tại không có quyền cập nhật trạng thái đơn hàng.");
        error.statusCode = 403;
        throw error;
    }

    // 1. Role-specific validation
    if (role === "customer") {
        if (newStatus !== "Canceled") {
            const error = new Error("Khách hàng chỉ có quyền yêu cầu hủy đơn hàng, không thể thay đổi trạng thái giao hàng.");
            error.statusCode = 403;
            throw error;
        }
        if (order.status !== "Pending") {
            const error = new Error("Khách hàng chỉ có thể hủy đơn khi đơn hàng đang ở trạng thái 'Chờ xác nhận'.");
            error.statusCode = 400;
            throw error;
        }
        const isCustomerOwner =
            String(order.customerId) === String(user.id) ||
            (user.email && order.customerEmail === user.email) ||
            (user.name && order.customerId === user.name);
        if (!isCustomerOwner) {
            const error = new Error("Bạn không có quyền hủy đơn hàng của người khác.");
            error.statusCode = 403;
            throw error;
        }
    }

    if (role === "restaurant") {
        const isOwner =
            String(order.restaurantId) === String(user.restaurantId || user.id) ||
            (user.name && order.restaurantName === user.name);
        if (!isOwner) {
            const error = new Error("Nhà hàng không có quyền cập nhật đơn của nhà hàng khác.");
            error.statusCode = 403;
            throw error;
        }

        // Restaurant allowed business transitions:
        if (order.status === "Pending" && !["Confirmed", "Canceled"].includes(newStatus)) {
            const error = new Error(`Từ trạng thái "Chờ xác nhận", nhà hàng chỉ có thể "Xác nhận" hoặc "Từ chối" đơn hàng.`);
            error.statusCode = 400;
            throw error;
        }
        if (order.status === "Confirmed" && !["Preparing", "Canceled"].includes(newStatus)) {
            const error = new Error(`Từ trạng thái "Đã xác nhận", nhà hàng chỉ có thể chuyển sang "Đang chuẩn bị" hoặc "Hủy đơn".`);
            error.statusCode = 400;
            throw error;
        }
        if (order.status === "Preparing" && !["Out for Delivery", "Delivering", "Canceled"].includes(newStatus)) {
            const error = new Error(`Từ trạng thái "Đang chuẩn bị", đơn hàng chỉ có thể chuyển sang giao hàng hoặc hủy.`);
            error.statusCode = 400;
            throw error;
        }
    }

    // 2. Terminal state & in-flight delivery guards
    if (order.status === "Delivered" && newStatus !== "Delivered") {
        const error = new Error("Đơn hàng đã được giao thành công, không thể thay đổi trạng thái.");
        error.statusCode = 400;
        throw error;
    }

    if (order.status === "Canceled" && newStatus !== "Canceled") {
        const error = new Error("Đơn hàng đã bị hủy, không thể cập nhật tiếp.");
        error.statusCode = 400;
        throw error;
    }

    if ((order.status === "Out for Delivery" || order.status === "Delivering") && newStatus === "Canceled") {
        const error = new Error("Không thể hủy đơn hàng khi shipper đang đi giao.");
        error.statusCode = 400;
        throw error;
    }

    // 3. Apply state transition
    order.status = newStatus;
    if (newStatus === "Canceled") {
        order.cancellationReason = updateData.cancellationReason || ("Đơn hàng bị từ chối / hủy bởi " + (role === "restaurant" ? "nhà hàng" : role === "customer" ? "khách hàng" : "quản trị viên"));
        order.cancelledBy = role;
        order.cancelledAt = new Date();
        if (order.paymentMethod === "COD") {
            order.paymentStatus = "Failed";
        }
    }

    await order.save();
    return order;
};

/**
 * Service: Cancel order with Ownership verification
 */
export const cancelOrderService = async (orderId, user, reason = null) => {
    return await updateOrderStatusService(orderId, "Canceled", user, { cancellationReason: reason });
};
