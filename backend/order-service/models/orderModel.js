import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        customerId: { type: String, required: true, index: true },
        customerName: { type: String },
        customerEmail: { type: String },
        customerPhone: { type: String },
        restaurantId: { type: String, required: true, index: true },
        restaurantName: { type: String },
        items: [
            {
                foodId: { type: String, required: true },
                name: { type: String },
                quantity: { type: Number, required: true, min: 1 },
                price: { type: Number, required: true, min: 0 }
            }
        ],
        subtotal: { type: Number, default: 0 },
        deliveryFee: { type: Number, default: 15000 },
        discount: { type: Number, default: 0 },
        totalPrice: { type: Number, required: true, min: 0 },
        couponCode: { type: String, default: null },
        paymentMethod: {
            type: String,
            enum: ["STRIPE", "VNPAY", "MOMO", "PAYOS", "COD", "BANK_TRANSFER", "Stripe", "VNPay", "MoMo", "Cash on Delivery", "Bank Transfer", "Chuyển khoản ngân hàng"],
            default: "STRIPE"
        },
        paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
        status: {
            type: String,
            enum: ["Pending", "Confirmed", "Preparing", "Out for Delivery", "Delivering", "Delivered", "Canceled"],
            default: "Pending"
        },
        deliveryAddress: { type: String, required: true },
        deliveryProvinceId: { type: Number, default: null },
        deliveryDistrictId: { type: Number, default: null },
        deliveryWardCode: { type: String, default: null },
        deliveryAreaProvider: { type: String, enum: ["GHN", "VN_PUBLIC", "MANUAL"], default: "MANUAL" },
        deliveryLatitude: { type: Number, min: -90, max: 90, default: null },
        deliveryLongitude: { type: Number, min: -180, max: 180, default: null },
        deliveryFeeSource: { type: String, enum: ["GHN", "local"], default: "local" },
        cancellationReason: { type: String, default: null },
        cancelledBy: { type: String, default: null },
        cancelledAt: { type: Date, default: null },
        reports: [
            {
                reporterId: { type: String, required: true },
                reporterName: { type: String, default: "Khách hàng" },
                reporterEmail: { type: String, default: "" },
                category: { type: String, required: true },
                message: { type: String, required: true, maxlength: 2000 },
                status: { type: String, enum: ["New", "InProgress", "Resolved"], default: "New" },
                adminResponse: { type: String, default: "", maxlength: 2000 },
                handledBy: { type: String, default: "" },
                resolvedAt: { type: Date, default: null },
                createdAt: { type: Date, default: Date.now },
                updatedAt: { type: Date, default: Date.now },
            }
        ],
        emailConfirmationSent: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;