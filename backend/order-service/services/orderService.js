import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import FoodItem from "../models/foodItemModel.js";
import Coupon from "../models/couponModel.js";
import { sendOrderConfirmationEmail } from "./emailService.js";
import {
    getGhnDistricts,
    getGhnProvinces,
    getGhnWards,
    isGhnConfigured,
    quoteGhnFee,
} from "./ghnService.js";
import {
    getVietnamDistricts,
    getVietnamProvinces,
    getVietnamWards,
} from "./vietnamLocationService.js";

const GHN_FALLBACK_DELIVERY_FEE = 15000;

const quoteGhnDeliveryForOrder = async ({ restaurantId, toDistrictId, toWardCode, deliveryAreaProvider }) => {
    if (!isGhnConfigured()) {
        return { enabled: false, deliveryFee: GHN_FALLBACK_DELIVERY_FEE };
    }

    if (!toDistrictId || !toWardCode) {
        const error = new Error("Vui lòng chọn quận/huyện và phường/xã hợp lệ để báo giá GHN.");
        error.statusCode = 400;
        throw error;
    }
    if (deliveryAreaProvider !== "GHN") {
        const error = new Error("Vui lòng chọn lại địa chỉ theo danh mục GHN trước khi báo giá.");
        error.statusCode = 400;
        throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        const error = new Error("Không xác định được nhà hàng gửi hàng để báo giá GHN.");
        error.statusCode = 400;
        throw error;
    }

    const db = mongoose.connection.db;
    const restaurant = db && await db.collection("restaurants").findOne({
        _id: new mongoose.Types.ObjectId(String(restaurantId)),
    });
    if (!restaurant?.ghnDistrictId || !restaurant?.ghnWardCode) {
        const error = new Error("Nhà hàng chưa được cấu hình mã quận/phường gửi hàng GHN.");
        error.statusCode = 400;
        throw error;
    }

    const deliveryFee = await quoteGhnFee({
        fromDistrictId: restaurant.ghnDistrictId,
        fromWardCode: restaurant.ghnWardCode,
        toDistrictId,
        toWardCode,
    });
    return { enabled: true, deliveryFee };
};

export const getShippingQuoteService = async ({ restaurantId, toDistrictId, toWardCode, deliveryAreaProvider }) => {
    if (!isGhnConfigured()) {
        return { enabled: false, deliveryFee: GHN_FALLBACK_DELIVERY_FEE };
    }
    return quoteGhnDeliveryForOrder({ restaurantId, toDistrictId, toWardCode, deliveryAreaProvider });
};

export const getShippingLocationsService = async ({ type, parentId, provider }) => {
    const useGhnDirectory = isGhnConfigured();
    if (provider === "GHN" && !useGhnDirectory) {
        const error = new Error("Dịch vụ báo giá GHN hiện chưa được cấu hình.");
        error.statusCode = 503;
        throw error;
    }

    if (useGhnDirectory) {
        if (type === "provinces") return { provider: "GHN", data: await getGhnProvinces() };
        if (type === "districts" && parentId) return { provider: "GHN", data: await getGhnDistricts(parentId) };
        if (type === "wards" && parentId) return { provider: "GHN", data: await getGhnWards(parentId) };
    } else {
        if (type === "provinces") return { provider: "VN_PUBLIC", data: await getVietnamProvinces() };
        if (type === "districts" && parentId) return { provider: "VN_PUBLIC", data: await getVietnamDistricts(parentId) };
        if (type === "wards" && parentId) return { provider: "VN_PUBLIC", data: await getVietnamWards(parentId) };
    }

    const error = new Error("Tham số địa chỉ GHN không hợp lệ.");
    error.statusCode = 400;
    throw error;
};

/**
 * Helper to check ownership or admin role
 */
export const checkOrderOwnership = (order, user) => {
    if (!user) return false;
    const role = user.role === "superAdmin" ? "admin" : user.role;
    if (role === "admin") return true;

    if (role === "customer") {
        return (
            String(order.customerId) === String(user.id) ||
            (user.email && order.customerEmail === user.email) ||
            (user.name && order.customerId === user.name)
        );
    }

    if (role === "restaurant") {
        return (
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

    const hasDeliveryLatitude = orderData.deliveryLatitude !== undefined && orderData.deliveryLatitude !== null;
    const hasDeliveryLongitude = orderData.deliveryLongitude !== undefined && orderData.deliveryLongitude !== null;
    const deliveryLatitude = Number(orderData.deliveryLatitude);
    const deliveryLongitude = Number(orderData.deliveryLongitude);
    if (hasDeliveryLatitude !== hasDeliveryLongitude || (hasDeliveryLatitude && (
        !Number.isFinite(deliveryLatitude) || deliveryLatitude < -90 || deliveryLatitude > 90 ||
        !Number.isFinite(deliveryLongitude) || deliveryLongitude < -180 || deliveryLongitude > 180
    ))) {
        const error = new Error("Vị trí giao hàng không hợp lệ.");
        error.statusCode = 400;
        throw error;
    }

    // 3. Server Authority: Fetch authoritative items from DB and recalculate prices
    let subtotal = 0;
    const verifiedItems = [];
    let detectedRestaurantId = null;

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
        const itemRestaurantId = foodDoc.restaurant?.toString();
        if (detectedRestaurantId && itemRestaurantId && detectedRestaurantId !== itemRestaurantId) {
            const error = new Error("Mỗi đơn hàng chỉ được chứa món từ cùng một nhà hàng.");
            error.statusCode = 400;
            throw error;
        }
        if (itemRestaurantId) {
            detectedRestaurantId = itemRestaurantId;
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

    // 4. Quote shipping from GHN when enabled; retain existing local fee otherwise.
    const shippingQuote = await quoteGhnDeliveryForOrder({
        restaurantId: detectedRestaurantId,
        toDistrictId: orderData.deliveryDistrictId,
        toWardCode: orderData.deliveryWardCode,
        deliveryAreaProvider: orderData.deliveryAreaProvider,
    });
    const deliveryFee = shippingQuote.enabled
        ? shippingQuote.deliveryFee
        : (subtotal >= 300000 ? 0 : shippingQuote.deliveryFee);
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
            deliveryAddress: deliveryAddress.trim(),
            deliveryProvinceId: orderData.deliveryProvinceId || null,
            deliveryDistrictId: orderData.deliveryDistrictId || null,
            deliveryWardCode: orderData.deliveryWardCode || null,
            deliveryAreaProvider: orderData.deliveryAreaProvider || "MANUAL",
            deliveryLatitude: orderData.deliveryLatitude ?? null,
            deliveryLongitude: orderData.deliveryLongitude ?? null,
            deliveryFeeSource: shippingQuote.enabled ? "GHN" : "local"
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

const orderReportCategories = [
    "Đơn hàng bị hủy",
    "Thiếu hoặc sai món",
    "Vấn đề giao hàng",
    "Vấn đề thanh toán",
    "Chất lượng món ăn",
    "Khác",
];

export const createOrderReportService = async (orderId, reportData, user) => {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        const error = new Error("Mã đơn hàng không hợp lệ.");
        error.statusCode = 400;
        throw error;
    }
    if (user?.role !== "customer") {
        const error = new Error("Chỉ khách hàng mới có thể gửi báo cáo đơn hàng.");
        error.statusCode = 403;
        throw error;
    }

    const order = await Order.findById(orderId);
    if (!order) {
        const error = new Error("Không tìm thấy đơn hàng.");
        error.statusCode = 404;
        throw error;
    }
    if (!checkOrderOwnership(order, user)) {
        const error = new Error("Bạn không có quyền gửi báo cáo cho đơn hàng này.");
        error.statusCode = 403;
        throw error;
    }

    const category = String(reportData?.category || "").trim();
    const message = String(reportData?.message || "").trim();
    if (!orderReportCategories.includes(category)) {
        const error = new Error("Vui lòng chọn loại vấn đề hợp lệ.");
        error.statusCode = 400;
        throw error;
    }
    if (message.length < 10 || message.length > 2000) {
        const error = new Error("Nội dung báo cáo phải từ 10 đến 2000 ký tự.");
        error.statusCode = 400;
        throw error;
    }

    const report = {
        reporterId: String(user.id),
        reporterName: user.name || order.customerName || "Khách hàng",
        reporterEmail: user.email || order.customerEmail || "",
        category,
        message,
        status: "New",
    };
    order.reports.push(report);
    await order.save();
    return order.reports[order.reports.length - 1];
};

export const updateOrderReportService = async (orderId, reportId, updates, user) => {
    if (user?.role !== "admin") {
        const error = new Error("Chỉ quản trị viên mới có thể xử lý báo cáo.");
        error.statusCode = 403;
        throw error;
    }
    const order = await Order.findById(orderId);
    if (!order) {
        const error = new Error("Không tìm thấy đơn hàng.");
        error.statusCode = 404;
        throw error;
    }
    const report = order.reports.id(reportId);
    if (!report) {
        const error = new Error("Không tìm thấy báo cáo của đơn hàng.");
        error.statusCode = 404;
        throw error;
    }

    const validStatuses = ["New", "InProgress", "Resolved"];
    if (updates.status && !validStatuses.includes(updates.status)) {
        const error = new Error("Trạng thái xử lý báo cáo không hợp lệ.");
        error.statusCode = 400;
        throw error;
    }
    const adminResponse = String(updates.adminResponse ?? report.adminResponse ?? "").trim();
    if (adminResponse.length > 2000) {
        const error = new Error("Phản hồi tối đa 2000 ký tự.");
        error.statusCode = 400;
        throw error;
    }
    if (updates.status === "Resolved" && !adminResponse) {
        const error = new Error("Vui lòng nhập phản hồi trước khi đánh dấu đã giải quyết.");
        error.statusCode = 400;
        throw error;
    }

    if (updates.status) report.status = updates.status;
    report.adminResponse = adminResponse;
    report.handledBy = user.name || String(user.id);
    report.updatedAt = new Date();
    report.resolvedAt = report.status === "Resolved" ? (report.resolvedAt || new Date()) : null;
    await order.save();
    return report;
};
