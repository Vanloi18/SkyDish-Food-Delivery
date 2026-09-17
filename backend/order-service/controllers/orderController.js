import {
    createOrderService,
    getOrdersService,
    getOrderByIdService,
    updateOrderDetailsService,
    updateOrderStatusService,
    cancelOrderService
} from "../services/orderService.js";
import { emitOrderCreated, emitOrderUpdated } from "../utils/socket.js";

// @desc Create new order
// @route POST /api/orders
export const createOrder = async (req, res) => {
    try {
        const order = await createOrderService(req.body, req.user);
        emitOrderCreated(order);
        res.status(201).json(order);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Lỗi máy chủ nội bộ",
            code: statusCode === 400 ? "BAD_REQUEST" : statusCode === 401 ? "UNAUTHORIZED" : statusCode === 403 ? "FORBIDDEN" : statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR"
        });
    }
};

// @desc Get orders with Ownership scoping & Pagination
// @route GET /api/orders
export const getOrders = async (req, res) => {
    try {
        const result = await getOrdersService({ user: req.user, query: req.query });
        
        // If client explicitly asked for page/limit:
        if (req.query.page !== undefined || req.query.limit !== undefined) {
            return res.status(200).json(result);
        }

        // For clients calling without page/limit params, provide pagination headers and data array
        res.setHeader("X-Total-Count", result.pagination.totalItems);
        res.setHeader("X-Total-Pages", result.pagination.totalPages);
        res.setHeader("X-Current-Page", result.pagination.currentPage);
        res.setHeader("X-Limit", result.pagination.limit);
        
        return res.status(200).json(result.data);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Lỗi máy chủ nội bộ"
        });
    }
};

// @desc Get single order by ID with Ownership check
// @route GET /api/orders/:id
export const getOrderById = async (req, res) => {
    try {
        const order = await getOrderByIdService(req.params.id, req.user);
        res.status(200).json(order);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Lỗi máy chủ nội bộ",
            code: statusCode === 403 ? "FORBIDDEN" : statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST"
        });
    }
};

// @desc Update order details with Ownership check
// @route PATCH /api/orders/:id
export const updateOrderDetails = async (req, res) => {
    try {
        const order = await updateOrderDetailsService(req.params.id, req.body, req.user);
        emitOrderUpdated(order);
        res.status(200).json(order);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Lỗi máy chủ nội bộ",
            code: statusCode === 403 ? "FORBIDDEN" : statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST"
        });
    }
};

// @desc Update order status
// @route PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, error: "Trạng thái đơn hàng là bắt buộc." });
        }
        const order = await updateOrderStatusService(req.params.id, status, req.user, req.body);
        emitOrderUpdated(order);
        res.status(200).json(order);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Lỗi máy chủ nội bộ",
            code: statusCode === 403 ? "FORBIDDEN" : statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST"
        });
    }
};

// @desc Cancel (Delete) order
// @route DELETE /api/orders/:id
export const cancelOrder = async (req, res) => {
    try {
        const order = await cancelOrderService(req.params.id, req.user);
        emitOrderUpdated(order);
        res.status(200).json({
            success: true,
            message: "Đơn hàng đã được hủy thành công.",
            order
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: error.message || "Lỗi máy chủ nội bộ",
            code: statusCode === 403 ? "FORBIDDEN" : statusCode === 404 ? "NOT_FOUND" : "BAD_REQUEST"
        });
    }
};
