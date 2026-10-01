import {
    createOrderService,
    getOrdersService,
    getOrderByIdService,
    updateOrderDetailsService,
    updateOrderStatusService,
    cancelOrderService,
    createOrderReportService,
    updateOrderReportService,
    getShippingLocationsService,
    getShippingQuoteService
} from "../services/orderService.js";
import { reverseGeocodeCoordinates } from "../services/reverseGeocodeService.js";

export const reverseGeocodeDeliveryLocation = async (req, res) => {
    try {
        const address = await reverseGeocodeCoordinates(req.body);
        res.status(200).json({ success: true, address });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
};

export const getShippingLocations = async (req, res) => {
    try {
        const result = await getShippingLocationsService({
            type: req.params.type,
            parentId: req.query.parentId,
            provider: req.query.provider,
        });
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
};

export const getShippingQuote = async (req, res) => {
    try {
        const quote = await getShippingQuoteService(req.body);
        res.status(200).json({ success: true, ...quote });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
};

// @desc Create new order
// @route POST /api/orders
export const createOrder = async (req, res) => {
    try {
        const order = await createOrderService(req.body, req.user);
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

// @desc Submit a customer report for an order
// @route POST /api/orders/:id/reports
export const createOrderReport = async (req, res) => {
    try {
        const report = await createOrderReportService(req.params.id, req.body, req.user);
        return res.status(201).json({ report });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Không thể gửi báo cáo đơn hàng." });
    }
};

// @desc Update an order report as admin
// @route PATCH /api/orders/:id/reports/:reportId
export const updateOrderReport = async (req, res) => {
    try {
        const report = await updateOrderReportService(req.params.id, req.params.reportId, req.body, req.user);
        return res.status(200).json({ report });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message || "Không thể cập nhật báo cáo đơn hàng." });
    }
};