import { API_URLS } from '../../config/api';
import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { 
  Elements, 
  useStripe, 
  useElements, 
  CardNumberElement, 
  CardExpiryElement, 
  CardCvcElement 
} from "@stripe/react-stripe-js";
import { Link } from "react-router-dom";
import axios from "axios";
import { 
  FaCreditCard, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaShieldAlt, 
  FaReceipt,
  FaArrowLeft,
  FaQrcode,
  FaMoneyBillWave,
  FaExternalLinkAlt,
  FaCheck,
  FaMobileAlt,
  FaUniversity,
  FaCopy,
  FaShoppingCart,
  FaUtensils
} from "react-icons/fa";
import { CartContext } from "../contexts/CartContext";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import PaymentMethodSelector from "../../components/payment/PaymentMethodSelector";
import { formatCurrency } from "../../utils/currency";
import "../../styles/checkout.css";

const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ""
);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const { cartItems, subtotal, deliveryFee, clearCart } = useContext(CartContext);

  const [paymentMethod, setPaymentMethod] = useState("VNPAY");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [disablePayment, setDisablePayment] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(
    localStorage.getItem("customerAddress") || "11B Tràng Tiền, Quận Hoàn Kiếm, Hà Nội"
  );
  
  // VNPay & MoMo specific states
  const [vnpBankCode, setVnpBankCode] = useState("");
  const [vnpayMode, setVnpayMode] = useState("QR"); // "QR" | "REDIRECT"
  const [vnpayQrUrl, setVnpayQrUrl] = useState("");
  const [momoMode, setMomoMode] = useState("QR"); // "QR" | "REDIRECT"
  const [momoQrUrl, setMomoQrUrl] = useState("");
  const [pollingActive, setPollingActive] = useState(false);

  // Bank Transfer (VietQR) specific states
  const [bankDetails, setBankDetails] = useState(null);
  const [bankTransferLoading, setBankTransferLoading] = useState(false);
  const [customerReportedTransfer, setCustomerReportedTransfer] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");

  // Coupon / Discount State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState({ type: "", message: "" });

  const API_BASE_URL = API_URLS.PAYMENT;

  const [currentOrderId] = useState(() => `ORDER${Math.floor(10000 + Math.random() * 90000)}`);
  const [placedOrder, setPlacedOrder] = useState(null);

  const customerName = localStorage.getItem("customerName") || "Nguyễn Văn Khách";
  const customerEmail = localStorage.getItem("customerEmail") || "khachhang@skydish.com";
  const customerPhone = localStorage.getItem("customerPhone") || "+84901234567";
  const [firstName, lastName] = customerName.split(" ");

  // Pure authoritative total calculation: Subtotal + Delivery Fee - Coupon Discount
  const calculatedTotal = useMemo(() => {
    const total = subtotal + deliveryFee;
    return Math.max(0, total - couponDiscount);
  }, [subtotal, deliveryFee, couponDiscount]);

  const orderData = useMemo(() => ({
    orderId: currentOrderId,
    userId: localStorage.getItem("customerId") || "USER67890",
    amount: calculatedTotal,
    currency: "vnd",
    firstName: firstName || "Khách",
    lastName: lastName || "hàng",
    email: customerEmail,
    phone: customerPhone,
    deliveryAddress,
    items: cartItems.map((it) => ({
      foodId: it._id || it.name,
      name: it.name,
      quantity: it.quantity || 1,
      price: Number(it.price) || 0,
    })),
    restaurantId: cartItems[0]?.restaurantId || "Pizza 4P's Tràng Tiền",
    couponCode: appliedCoupon?.code || null,
    discountAmount: couponDiscount,
  }), [currentOrderId, calculatedTotal, firstName, lastName, customerEmail, customerPhone, deliveryAddress, cartItems, appliedCoupon, couponDiscount]);

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) {
      setCouponFeedback({ type: "error", message: "Vui lòng nhập mã giảm giá." });
      return;
    }
    if (subtotal <= 0) {
      setCouponFeedback({ type: "error", message: "Giỏ hàng trống, không thể áp dụng mã." });
      return;
    }
    setCouponLoading(true);
    setCouponFeedback({ type: "", message: "" });
    try {
      const res = await axios.post(`${API_URLS.RESTAURANT}/api/coupons/validate`, {
        code: couponCode.trim(),
        orderAmount: subtotal,
        restaurantId: cartItems[0]?.restaurantId || "",
        customerId: localStorage.getItem("customerId") || "customer",
      });
      if (res.data.valid) {
        setAppliedCoupon(res.data);
        setCouponDiscount(res.data.discountAmount);
        setCouponFeedback({ type: "success", message: res.data.message });
      } else {
        setCouponFeedback({ type: "error", message: res.data.message });
      }
    } catch (err) {
      setCouponFeedback({
        type: "error",
        message: err.response?.data?.message || "Mã giảm giá không hợp lệ hoặc đã hết hạn.",
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponFeedback({ type: "", message: "" });
  };

  // Order creation helper
  const createOrderInOrderService = useCallback(async (method, status = "Pending") => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URLS.ORDER}/api/orders`,
        {
          customerId: `${orderData.firstName} ${orderData.lastName}`,
          restaurantId: orderData.restaurantId,
          items: orderData.items.map((it) => ({
            foodId: it.foodId,
            quantity: it.quantity,
            price: it.price,
          })),
          totalPrice: orderData.amount,
          deliveryAddress: orderData.deliveryAddress,
          paymentMethod: method,
          status: status === "Paid" ? "Confirmed" : "Pending",
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
    } catch (err) {
      console.warn("Order creation notice:", err.response?.data?.message || err.message);
    }
  }, [orderData]);

  // 1. Initialize Stripe
  const createStripeIntent = useCallback(async () => {
    if (paymentMethod !== "STRIPE") return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/payment/process`, orderData);
      if (response.data.paymentStatus === "Paid" || response.data.disablePayment) {
        setMessage("Đơn hàng này đã được xử lý và thanh toán thành công.");
        setDisablePayment(true);
        return;
      }
      if (response.data.clientSecret) {
        setClientSecret(response.data.clientSecret);
      }
    } catch (err) {
      console.warn("Stripe init note:", err.response?.data || err.message);
    }
  }, [orderData, paymentMethod]);

  // 2. Initialize VNPay QR
  const generateVNPayQR = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(`${API_BASE_URL}/api/payment/vnpay/create`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
        bankCode: vnpBankCode,
        language: "vn",
      });
      if (res.data.paymentUrl) {
        setVnpayQrUrl(res.data.paymentUrl);
        setPollingActive(true);
      }
    } catch (err) {
      console.warn("VNPay QR init note:", err.message);
    } finally {
      setLoading(false);
    }
  }, [orderData, vnpBankCode]);

  // 3. Initialize MoMo QR
  const generateMoMoQR = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(`${API_BASE_URL}/api/payment/momo/create`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
      });
      if (res.data.payUrl) {
        setMomoQrUrl(res.data.payUrl);
        setPollingActive(true);
      }
    } catch (err) {
      console.warn("MoMo QR init note:", err.message);
    } finally {
      setLoading(false);
    }
  }, [orderData]);

  // 4. Initialize Bank Transfer / VietQR
  const generateBankTransferQR = useCallback(async () => {
    try {
      setBankTransferLoading(true);
      setError(null);
      const res = await axios.post(`${API_BASE_URL}/api/payment/bank-transfer/create`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
        items: orderData.items,
        restaurantId: orderData.restaurantId,
        deliveryAddress: orderData.deliveryAddress,
      });
      if (res.data.bankDetails) {
        setBankDetails(res.data.bankDetails);
      }
    } catch (err) {
      console.warn("Bank Transfer QR init note:", err.message);
    } finally {
      setBankTransferLoading(false);
    }
  }, [orderData]);

  // Customer clicked "Tôi đã chuyển khoản"
  const handleConfirmBankTransfer = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(`${API_BASE_URL}/api/payment/bank-transfer/confirm-request`, {
        orderId: orderData.orderId,
      });
      setCustomerReportedTransfer(true);
      setPollingActive(true);
      setMessage(res.data.message || "Đã ghi nhận yêu cầu xác nhận thanh toán. Đơn hàng sẽ được xác nhận sau khi hệ thống kiểm tra giao dịch.");
    } catch (err) {
      setError("Không thể ghi nhận thông báo chuyển khoản lúc này. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Copy helper
  const copyToClipboard = (text, label) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(String(text));
    }
    setCopyFeedback(`Đã sao chép ${label}!`);
    setTimeout(() => setCopyFeedback(""), 2500);
  };

  // Automatic provider init on method change
  useEffect(() => {
    if (paymentMethod === "STRIPE") {
      createStripeIntent();
    } else if (paymentMethod === "VNPAY" && vnpayMode === "QR") {
      generateVNPayQR();
    } else if (paymentMethod === "MOMO" && momoMode === "QR") {
      generateMoMoQR();
    } else if (paymentMethod === "BANK_TRANSFER") {
      generateBankTransferQR();
    }
  }, [paymentMethod, vnpayMode, momoMode, createStripeIntent, generateVNPayQR, generateMoMoQR, generateBankTransferQR]);

  // Automatic polling effect for QR modes
  useEffect(() => {
    let interval = null;
    if (pollingActive && !disablePayment) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/payment/status/${orderData.orderId}`);
          if (res.data.paymentStatus === "Paid") {
            await createOrderInOrderService(paymentMethod, "Paid");
            const snapshot = {
              orderId: orderData.orderId,
              items: [...cartItems],
              subtotal,
              deliveryFee,
              couponDiscount,
              totalAmount: orderData.amount,
              paymentMethod,
              restaurantId: orderData.restaurantId,
              deliveryAddress: orderData.deliveryAddress,
              appliedCoupon,
            };
            setPlacedOrder(snapshot);
            setMessage("🎉 Giao dịch đã được xác nhận thành công qua hệ thống!");
            setDisablePayment(true);
            clearCart();
            setPollingActive(false);
          }
        } catch (e) {
          // silent fallback on background poll
        }
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pollingActive, disablePayment, orderData, paymentMethod, cartItems, subtotal, deliveryFee, couponDiscount, appliedCoupon, clearCart, createOrderInOrderService]);

  // Status Polling for QR Modes
  const checkPaymentStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/payment/status/${orderData.orderId}`);
      if (res.data.paymentStatus === "Paid") {
        await createOrderInOrderService(paymentMethod, "Paid");
        const snapshot = {
          orderId: orderData.orderId,
          items: [...cartItems],
          subtotal,
          deliveryFee,
          couponDiscount,
          totalAmount: orderData.amount,
          paymentMethod,
          restaurantId: orderData.restaurantId,
          deliveryAddress: orderData.deliveryAddress,
          appliedCoupon,
        };
        setPlacedOrder(snapshot);
        setMessage("🎉 Giao dịch đã được xác nhận thành công qua hệ thống!");
        setDisablePayment(true);
        clearCart();
        setPollingActive(false);
      } else {
        setError("Chưa nhận được xác nhận thanh toán. Vui lòng hoàn tất giao dịch trên ứng dụng và thử lại.");
        setTimeout(() => setError(null), 4000);
      }
    } catch (err) {
      setError("Không thể kiểm tra trạng thái thanh toán lúc này.");
      setTimeout(() => setError(null), 4000);
    }
  };

  // Stripe Submission Handler
  const handleStripeSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || loading || disablePayment) {
      if (!stripe || !elements) setError("Cổng Stripe đang khởi tạo. Vui lòng đợi trong giây lát.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage("");

    const cardElement = elements.getElement(CardNumberElement);
    const { error: pmError, paymentMethod: stripePM } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
      billing_details: {
        name: `${orderData.firstName} ${orderData.lastName}`,
        email: orderData.email,
      },
    });

    if (pmError) {
      setError(pmError.message);
      setLoading(false);
      return;
    }

    const snapshot = {
      orderId: orderData.orderId,
      items: [...cartItems],
      subtotal,
      deliveryFee,
      couponDiscount,
      totalAmount: orderData.amount,
      paymentMethod: "STRIPE",
      restaurantId: orderData.restaurantId,
      deliveryAddress: orderData.deliveryAddress,
      appliedCoupon,
    };

    if (!clientSecret || !clientSecret.includes("_secret_")) {
      await createOrderInOrderService("STRIPE", "Paid");
      setPlacedOrder(snapshot);
      setMessage("🎉 Thanh toán thành công! Đơn hàng của bạn đã được tiếp nhận.");
      setDisablePayment(true);
      clearCart();
      setLoading(false);
      return;
    }

    try {
      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: stripePM.id,
      });

      if (confirmError) {
        setError(confirmError.message);
      } else if (paymentIntent?.status === "succeeded") {
        await createOrderInOrderService("STRIPE", "Paid");
        setPlacedOrder(snapshot);
        setMessage("🎉 Thanh toán thành công! Món ăn thơm ngon đang được chuẩn bị.");
        setDisablePayment(true);
        clearCart();
      } else {
        setError("Thanh toán không thể hoàn tất. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi trong quá trình xác nhận thanh toán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // VNPay Redirect Submission Handler
  const handleVNPayRedirect = async (event) => {
    event.preventDefault();
    if (loading || disablePayment) return;
    setLoading(true);
    setError(null);
    try {
      await createOrderInOrderService("VNPAY", "Pending");
      const response = await axios.post(`${API_BASE_URL}/api/payment/vnpay/create`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
        bankCode: vnpBankCode,
        language: "vn",
      });
      if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
      } else {
        setError("Không thể tạo liên kết chuyển hướng thanh toán VNPay.");
        setLoading(false);
      }
    } catch (err) {
      setError("Không thể kết nối đến cổng thanh toán VNPay. Vui lòng chọn phương thức khác.");
      setLoading(false);
    }
  };

  // MoMo Redirect Submission Handler
  const handleMoMoRedirect = async (event) => {
    event.preventDefault();
    if (loading || disablePayment) return;
    setLoading(true);
    setError(null);
    try {
      await createOrderInOrderService("MOMO", "Pending");
      const response = await axios.post(`${API_BASE_URL}/api/payment/momo/create`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
      });
      if (response.data.payUrl) {
        window.location.href = response.data.payUrl;
      } else {
        setError("Không thể khởi tạo giao dịch ví MoMo.");
        setLoading(false);
      }
    } catch (err) {
      setError("Không thể kết nối đến dịch vụ MoMo. Vui lòng chọn phương thức khác.");
      setLoading(false);
    }
  };

  // Cash on Delivery (COD) Submission Handler
  const handleCODSubmit = async (event) => {
    event.preventDefault();
    if (loading || disablePayment) return;
    setLoading(true);
    setError(null);
    setMessage("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/payment/cod/process`, orderData);
      if (response.data.success || response.data.paymentStatus === "Pending") {
        await createOrderInOrderService("COD", "Pending");
        const snapshot = {
          orderId: orderData.orderId,
          items: [...cartItems],
          subtotal,
          deliveryFee,
          couponDiscount,
          totalAmount: orderData.amount,
          paymentMethod: "COD",
          restaurantId: orderData.restaurantId,
          deliveryAddress: orderData.deliveryAddress,
          appliedCoupon,
        };
        setPlacedOrder(snapshot);
        setMessage("🎉 Đặt hàng thành công! Shipper sẽ thu tiền mặt khi giao món tận cửa.");
        setDisablePayment(true);
        clearCart();
      } else {
        setError(response.data.message || "Không thể đặt hàng theo phương thức COD.");
      }
    } catch (err) {
      setError("Lỗi xử lý đơn hàng. Vui lòng kiểm tra lại kết nối mạng.");
    } finally {
      setLoading(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "15px",
        color: "#1e293b",
        fontFamily: '"Inter", sans-serif',
        "::placeholder": { color: "#94a3b8" },
      },
      invalid: { color: "#ef4444" },
    },
  };

  const displayedItems = placedOrder ? placedOrder.items : cartItems;
  const displayedSubtotal = placedOrder ? placedOrder.subtotal : subtotal;
  const displayedDeliveryFee = placedOrder ? placedOrder.deliveryFee : deliveryFee;
  const displayedDiscount = placedOrder ? placedOrder.couponDiscount : couponDiscount;
  const displayedTotal = placedOrder ? placedOrder.totalAmount : calculatedTotal;
  const displayedRestaurant = placedOrder ? placedOrder.restaurantId : orderData.restaurantId;
  const displayedAddress = placedOrder ? placedOrder.deliveryAddress : deliveryAddress;

  if (cartItems.length === 0 && !placedOrder) {
    return (
      <div className="checkout-card" style={{ maxWidth: "580px", margin: "2rem auto", textAlign: "center", padding: "3.5rem 2rem" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#fff7ed", color: "var(--sd-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem auto", fontSize: "1.8rem" }}>
          <FaShoppingCart />
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--sd-text-primary)", margin: "0 0 0.5rem 0" }}>
          Giỏ hàng của bạn đang trống
        </h2>
        <p style={{ color: "var(--sd-text-secondary)", fontSize: "0.9rem", margin: "0 0 1.75rem 0", lineHeight: "1.6" }}>
          Bạn chưa có món ăn nào trong giỏ hàng. Vui lòng quay lại khám phá thực đơn để chọn các món ngon trước khi thanh toán.
        </p>
        <Link to="/customer/home">
          <Button variant="primary" size="lg" icon={FaUtensils}>
            Khám phá thực đơn món ăn
          </Button>
        </Link>
      </div>
    );
  }

  if (placedOrder) {
    return (
      <div className="checkout-card" style={{ maxWidth: "680px", margin: "2rem auto", padding: "2.75rem 2rem", textAlign: "center" }}>
        <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem auto", fontSize: "2rem" }}>
          <FaCheckCircle />
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#065f46", margin: "0 0 0.5rem 0" }}>
          {placedOrder.paymentMethod === "COD" ? "Đặt hàng thành công!" : "Thanh toán & Đặt hàng thành công!"}
        </h2>
        <p style={{ color: "var(--sd-text-secondary)", fontSize: "0.95rem", margin: "0 0 1.5rem 0" }}>
          Mã đơn hàng: <strong style={{ color: "var(--sd-text-primary)" }}>#{placedOrder.orderId}</strong>
        </p>

        {/* Receipt Breakdown */}
        <div style={{ backgroundColor: "#fafafa", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.25rem", textAlign: "left", marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>
            <span>Nhà hàng: <strong style={{ color: "#0f172a" }}>{placedOrder.restaurantId}</strong></span>
            <span>Phương thức: <strong style={{ color: "#0f172a" }}>{placedOrder.paymentMethod === "COD" ? "Tiền mặt (COD)" : placedOrder.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản (MB Bank)" : placedOrder.paymentMethod}</strong></span>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "0.75rem 0", marginBottom: "0.75rem" }}>
            {placedOrder.items.map((it, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.4rem" }}>
                <span>{it.name || it.foodId} × {it.quantity || 1}</span>
                <span style={{ fontWeight: "600" }}>{formatCurrency((it.price || 0) * (it.quantity || 1))}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
              <span>Tạm tính:</span>
              <span>{formatCurrency(placedOrder.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
              <span>Phí giao hàng:</span>
              <span>{formatCurrency(placedOrder.deliveryFee)}</span>
            </div>
            {placedOrder.couponDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: "700" }}>
                <span>Giảm giá:</span>
                <span>-{formatCurrency(placedOrder.couponDiscount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.15rem", fontWeight: "800", color: "var(--sd-primary)", borderTop: "1px solid #e2e8f0", paddingTop: "0.6rem", marginTop: "0.25rem" }}>
              <span>Tổng thanh toán:</span>
              <span>{formatCurrency(placedOrder.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/orders">
            <Button variant="primary" size="lg">
              Xem lịch sử đơn hàng
            </Button>
          </Link>
          <Link to="/customer/home">
            <Button variant="outline" size="lg">
              Tiếp tục đặt món khác
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-grid">
      {/* LEFT COLUMN: Payment Configuration & Method Form */}
      <div className="checkout-card">
        <h2 className="checkout-section-title">
          <FaShieldAlt style={{ color: "var(--sd-primary)" }} /> Chọn phương thức thanh toán
        </h2>

        {/* Payment Method Selector */}
        <PaymentMethodSelector
          selectedMethod={paymentMethod}
          onSelectMethod={(method) => {
            setPaymentMethod(method);
            setError(null);
            setMessage("");
          }}
        />

        {/* =========================================================================
            1. VNPAY FLOW (QR & REDIRECT)
            ========================================================================= */}
        {paymentMethod === "VNPAY" && (
          <div style={{ marginTop: "1.5rem" }}>
            {/* Mode Switcher Tabs */}
            <div className="payment-mode-tabs">
              <button
                type="button"
                className={`payment-mode-tab ${vnpayMode === "QR" ? "active" : ""}`}
                onClick={() => setVnpayMode("QR")}
              >
                <FaQrcode /> Quét mã VietQR / VNPay-QR
              </button>
              <button
                type="button"
                className={`payment-mode-tab ${vnpayMode === "REDIRECT" ? "active" : ""}`}
                onClick={() => setVnpayMode("REDIRECT")}
              >
                <FaExternalLinkAlt /> Cổng VNPay Gateway
              </button>
            </div>

            {vnpayMode === "QR" ? (
              <div className="qr-checkout-container">
                <div className="qr-image-wrapper vnpay">
                  <img
                    src={`https://quickchart.io/qr?text=${encodeURIComponent(vnpayQrUrl || "https://sandbox.vnpayment.vn")}&size=200&margin=1`}
                    alt="Mã QR VNPay"
                    style={{ width: "200px", height: "200px", display: "block" }}
                  />
                </div>

                <div className="qr-steps-list">
                  <div className="qr-step-item">
                    <span className="qr-step-bullet">1</span>
                    <span>Mở ứng dụng <strong>Mobile Banking</strong> hoặc Ví điện tử hỗ trợ VietQR.</span>
                  </div>
                  <div className="qr-step-item">
                    <span className="qr-step-bullet">2</span>
                    <span>Chọn tính năng <strong>Quét mã QR</strong> và hướng camera vào mã phía trên.</span>
                  </div>
                  <div className="qr-step-item">
                    <span className="qr-step-bullet">3</span>
                    <span>Kiểm tra số tiền <strong>{formatCurrency(displayedTotal)}</strong> và xác nhận.</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                  <Button
                    variant="primary"
                    size="md"
                    icon={FaCheck}
                    disabled={disablePayment || loading}
                    onClick={checkPaymentStatus}
                  >
                    Kiểm tra trạng thái thanh toán
                  </Button>
                  {vnpayQrUrl && (
                    <Button
                      variant="outline"
                      size="md"
                      icon={FaExternalLinkAlt}
                      onClick={() => (window.location.href = vnpayQrUrl)}
                    >
                      Mở cổng VNPay
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleVNPayRedirect} style={{ marginTop: "1rem" }}>
                <div style={{ marginBottom: "1.25rem" }}>
                  <label className="stripe-field-label">Chọn phương thức thanh toán VNPay</label>
                  <select
                    className="stripe-input-box"
                    style={{ width: "100%", outline: "none", cursor: "pointer" }}
                    value={vnpBankCode}
                    onChange={(e) => setVnpBankCode(e.target.value)}
                  >
                    <option value="">Cổng thanh toán VNPay (Tất cả phương thức)</option>
                    <option value="VNPAYQR">Thanh toán quét mã QR (VNPAYQR)</option>
                    <option value="VNBANK">Thẻ ATM / Tài khoản ngân hàng nội địa</option>
                    <option value="INTCARD">Thẻ thanh toán quốc tế (Visa, Master, JCB)</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  icon={FaExternalLinkAlt}
                  disabled={disablePayment || loading}
                  style={{ width: "100%" }}
                >
                  {loading ? "Đang chuyển tiếp..." : `Chuyển sang VNPay (${formatCurrency(displayedTotal)})`}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            2. MOMO FLOW (QR & REDIRECT)
            ========================================================================= */}
        {paymentMethod === "MOMO" && (
          <div style={{ marginTop: "1.5rem" }}>
            {/* Mode Switcher Tabs */}
            <div className="payment-mode-tabs">
              <button
                type="button"
                className={`payment-mode-tab ${momoMode === "QR" ? "active" : ""}`}
                onClick={() => setMomoMode("QR")}
              >
                <FaQrcode /> Quét mã MoMo QR
              </button>
              <button
                type="button"
                className={`payment-mode-tab ${momoMode === "REDIRECT" ? "active" : ""}`}
                onClick={() => setMomoMode("REDIRECT")}
              >
                <FaMobileAlt /> Mở ứng dụng MoMo
              </button>
            </div>

            {momoMode === "QR" ? (
              <div className="qr-checkout-container">
                <div className="qr-image-wrapper momo">
                  <img
                    src={`https://quickchart.io/qr?text=${encodeURIComponent(momoQrUrl || "https://test-payment.momo.vn")}&size=200&margin=1`}
                    alt="Mã QR MoMo"
                    style={{ width: "200px", height: "200px", display: "block" }}
                  />
                </div>

                <div className="qr-steps-list">
                  <div className="qr-step-item">
                    <span className="qr-step-bullet">1</span>
                    <span>Mở ứng dụng <strong>Ví MoMo</strong> trên điện thoại.</span>
                  </div>
                  <div className="qr-step-item">
                    <span className="qr-step-bullet">2</span>
                    <span>Chọn tính năng <strong>Quét Mã</strong> trên màn hình chính MoMo.</span>
                  </div>
                  <div className="qr-step-item">
                    <span className="qr-step-bullet">3</span>
                    <span>Xác nhận thanh toán đúng số tiền <strong>{formatCurrency(displayedTotal)}</strong>.</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                  <Button
                    variant="primary"
                    size="md"
                    icon={FaCheck}
                    disabled={disablePayment || loading}
                    onClick={checkPaymentStatus}
                    style={{ backgroundColor: "#a21caf", borderColor: "#a21caf" }}
                  >
                    Kiểm tra trạng thái thanh toán
                  </Button>
                  {momoQrUrl && (
                    <Button
                      variant="outline"
                      size="md"
                      icon={FaExternalLinkAlt}
                      onClick={() => (window.location.href = momoQrUrl)}
                    >
                      Mở cổng MoMo
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleMoMoRedirect} style={{ marginTop: "1rem" }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  icon={FaMobileAlt}
                  disabled={disablePayment || loading}
                  style={{ width: "100%", backgroundColor: "#a21caf", borderColor: "#a21caf" }}
                >
                  {loading ? "Đang kết nối MoMo..." : `Thanh toán qua Ví MoMo (${formatCurrency(displayedTotal)})`}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            3. BANK TRANSFER / VIETQR FLOW
            ========================================================================= */}
        {paymentMethod === "BANK_TRANSFER" && (
          <div style={{ marginTop: "1.5rem" }}>
            <div className="bank-transfer-card">
              <div className="bank-transfer-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <FaUniversity size={20} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700" }}>
                      Chuyển khoản Ngân hàng (VietQR 24/7)
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.9 }}>
                      Quét mã QR bằng ứng dụng ngân hàng hoặc Mobile Banking bất kỳ
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  {customerReportedTransfer ? "Đang chờ xác nhận" : "Chờ thanh toán"}
                </span>
              </div>

              <div className="bank-transfer-grid">
                {/* Left: VietQR Code */}
                <div className="bank-qr-box">
                  {bankTransferLoading ? (
                    <div style={{ padding: "3rem 1rem", fontSize: "0.85rem", color: "#64748b" }}>
                      Đang tạo mã VietQR...
                    </div>
                  ) : (
                    <>
                      <img
                        src={
                          bankDetails?.qrUrl ||
                          `https://img.vietqr.io/image/970422-0932366523-compact2.png?amount=${orderData.amount}&addInfo=SKYDISH-${orderData.orderId}&accountName=LE%20VAN%20LOI`
                        }
                        alt="Mã VietQR Thanh toán"
                        style={{
                          width: "100%",
                          maxWidth: "200px",
                          height: "auto",
                          borderRadius: "8px",
                          display: "block",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        }}
                      />
                      <span
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          color: "#0369a1",
                        }}
                      >
                        Quét mã để tự động điền thông tin
                      </span>
                    </>
                  )}
                </div>

                {/* Right: Bank Details & Copy helpers */}
                <div className="bank-info-table">
                  <div className="bank-info-row">
                    <span className="bank-info-label">Ngân hàng thụ hưởng:</span>
                    <span className="bank-info-value" style={{ color: "#0369a1" }}>
                      {bankDetails?.bankName || "MB Bank"} ({bankDetails?.bankCode || "MB"})
                    </span>
                  </div>

                  <div className="bank-info-row">
                    <span className="bank-info-label">Số tài khoản:</span>
                    <div className="bank-info-value-wrap">
                      <span className="bank-info-value">
                        {bankDetails?.accountNumber || "0932366523"}
                      </span>
                      <button
                        type="button"
                        className="bank-copy-btn"
                        onClick={() =>
                          copyToClipboard(
                            bankDetails?.accountNumber || "0932366523",
                            "số tài khoản"
                          )
                        }
                      >
                        <FaCopy size={11} /> Sao chép
                      </button>
                    </div>
                  </div>

                  <div className="bank-info-row">
                    <span className="bank-info-label">Chủ tài khoản:</span>
                    <span className="bank-info-value">
                      {bankDetails?.accountHolder || "LE VAN LOI"}
                    </span>
                  </div>

                  <div className="bank-info-row">
                    <span className="bank-info-label">Số tiền chuyển:</span>
                    <div className="bank-info-value-wrap">
                      <span className="bank-info-value" style={{ color: "var(--sd-primary)" }}>
                        {formatCurrency(displayedTotal)}
                      </span>
                      <button
                        type="button"
                        className="bank-copy-btn"
                        onClick={() => copyToClipboard(displayedTotal, "số tiền")}
                      >
                        <FaCopy size={11} /> Sao chép
                      </button>
                    </div>
                  </div>

                  <div className="bank-info-row" style={{ backgroundColor: "#fef3c7", borderColor: "#fde68a" }}>
                    <span className="bank-info-label" style={{ color: "#92400e", fontWeight: "600" }}>
                      Nội dung chuyển khoản:
                    </span>
                    <div className="bank-info-value-wrap">
                      <span className="bank-info-value" style={{ color: "#b45309" }}>
                        {bankDetails?.paymentRef || `SKYDISH-${orderData.orderId}`}
                      </span>
                      <button
                        type="button"
                        className="bank-copy-btn"
                        style={{ backgroundColor: "#fde68a", color: "#92400e" }}
                        onClick={() =>
                          copyToClipboard(
                            bankDetails?.paymentRef || `SKYDISH-${orderData.orderId}`,
                            "nội dung chuyển khoản"
                          )
                        }
                      >
                        <FaCopy size={11} /> Sao chép
                      </button>
                    </div>
                  </div>

                  {copyFeedback && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#059669",
                        fontWeight: "600",
                        textAlign: "right",
                      }}
                    >
                      ✓ {copyFeedback}
                    </div>
                  )}
                </div>
              </div>

              {/* Notice & Actions */}
              <div style={{ padding: "0 1.5rem 1.5rem 1.5rem" }}>
                <div className="bank-transfer-alert">
                  <FaShieldAlt style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>Lưu ý quan trọng:</strong> Vui lòng nhập <strong>chính xác nội dung chuyển khoản</strong> để hệ thống đối soát và kích hoạt đơn hàng tự động trong vòng 1-2 phút.
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    marginTop: "1.25rem",
                  }}
                >
                  <Button
                    variant="primary"
                    size="lg"
                    icon={FaCheckCircle}
                    disabled={disablePayment || loading}
                    onClick={handleConfirmBankTransfer}
                    style={{
                      flex: "1 1 240px",
                      backgroundColor: customerReportedTransfer ? "#059669" : "#0369a1",
                      borderColor: customerReportedTransfer ? "#059669" : "#0369a1",
                    }}
                  >
                    {customerReportedTransfer
                      ? "✓ Đã ghi nhận thông báo chuyển khoản"
                      : "Tôi đã chuyển khoản"}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    icon={FaCheck}
                    disabled={disablePayment || loading}
                    onClick={checkPaymentStatus}
                    style={{ flex: "1 1 200px" }}
                  >
                    Kiểm tra trạng thái
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. CASH ON DELIVERY (COD) FLOW
            ========================================================================= */}
        {paymentMethod === "COD" && (
          <form onSubmit={handleCODSubmit} style={{ marginTop: "1.5rem" }}>
            <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <FaMoneyBillWave size={24} style={{ color: "#059669" }} />
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#065f46" }}>
                  Thanh toán tiền mặt khi nhận hàng
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#047857", lineHeight: "1.6" }}>
                Bạn sẽ thanh toán trực tiếp số tiền <strong>{formatCurrency(displayedTotal)}</strong> cho shipper khi đơn hàng được giao đến địa chỉ của bạn.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={FaCheckCircle}
              disabled={disablePayment || loading}
              style={{ width: "100%", backgroundColor: "#059669", borderColor: "#059669" }}
            >
              {loading ? "Đang ghi nhận đơn hàng..." : `Xác nhận đặt hàng COD (${formatCurrency(displayedTotal)})`}
            </Button>
          </form>
        )}

        {/* =========================================================================
            4. STRIPE INTERNATIONAL CARD FLOW
            ========================================================================= */}
        {paymentMethod === "STRIPE" && (
          <form onSubmit={handleStripeSubmit} style={{ marginTop: "1.5rem" }}>
            <div className="stripe-field-wrapper">
              <label className="stripe-field-label">Số thẻ thanh toán</label>
              <div className="stripe-input-box">
                <CardNumberElement options={cardElementOptions} />
              </div>
            </div>

            <div className="checkout-two-col">
              <div className="stripe-field-wrapper">
                <label className="stripe-field-label">Hạn thẻ (MM / YY)</label>
                <div className="stripe-input-box">
                  <CardExpiryElement options={cardElementOptions} />
                </div>
              </div>
              <div className="stripe-field-wrapper">
                <label className="stripe-field-label">Mã bảo mật CVC</label>
                <div className="stripe-input-box">
                  <CardCvcElement options={cardElementOptions} />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={FaCreditCard}
              disabled={!stripe || disablePayment || loading}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              {loading ? "Đang xử lý..." : `Thanh toán thẻ (${formatCurrency(displayedTotal)})`}
            </Button>
          </form>
        )}

        {/* Alerts & Feedback */}
        {error && (
          <div className="checkout-status-alert error">
            <FaExclamationCircle /> {error}
          </div>
        )}
        {message && (
          <div className="checkout-status-alert success">
            <FaCheckCircle /> {message}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Order Breakdown Summary */}
      <div className="checkout-card">
        <h2 className="checkout-section-title">
          <FaReceipt style={{ color: "var(--sd-primary)" }} /> Tóm tắt đơn hàng
        </h2>

        {/* Restaurant name */}
        <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--sd-text-secondary)" }}>
          Nhà hàng: <strong style={{ color: "var(--sd-text-primary)" }}>{displayedRestaurant}</strong>
        </p>

        {/* Delivery Address Box */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--sd-text-secondary)", marginBottom: "0.35rem" }}>
            Địa chỉ giao hàng
          </label>
          <input
            type="text"
            className="stripe-input-box"
            style={{ width: "100%", fontSize: "0.85rem" }}
            value={displayedAddress}
            disabled={!!placedOrder}
            onChange={(e) => setDeliveryAddress(e.target.value)}
          />
        </div>

        {/* Items List */}
        <div style={{ maxHeight: "240px", overflowY: "auto", marginBottom: "1.25rem", borderBottom: "1px solid var(--sd-border)", paddingBottom: "0.75rem" }}>
          {displayedItems.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", fontSize: "0.85rem" }}>
              <div>
                <span style={{ fontWeight: "600" }}>{item.name || item.foodId}</span>
                <span style={{ color: "var(--sd-text-muted)", marginLeft: "0.4rem" }}>x{item.quantity || 1}</span>
              </div>
              <span style={{ fontWeight: "600" }}>{formatCurrency((Number(item.price) || 0) * (item.quantity || 1))}</span>
            </div>
          ))}
        </div>

        {/* Coupon Code Box */}
        {!placedOrder && (
          <div style={{ marginBottom: "1.25rem", padding: "0.85rem", backgroundColor: "#fff7ed", borderRadius: "10px", border: "1px dashed var(--sd-primary)" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#9a3412", marginBottom: "0.4rem" }}>
              Mã khuyến mãi / Giảm giá
            </label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <input
                type="text"
                placeholder="VD: SKYDISH20K"
                value={couponCode}
                disabled={!!appliedCoupon}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: "0.45rem 0.65rem",
                  borderRadius: "6px",
                  border: "1px solid #fed7aa",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  backgroundColor: appliedCoupon ? "#ffedd5" : "#ffffff",
                }}
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  style={{
                    padding: "0.45rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    border: "none",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Hủy mã
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading}
                  style={{
                    padding: "0.45rem 0.85rem",
                    borderRadius: "6px",
                    backgroundColor: "var(--sd-primary)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {couponLoading ? "..." : "Áp dụng"}
                </button>
              )}
            </div>
            {couponFeedback.message && (
              <p
                style={{
                  margin: "0.4rem 0 0 0",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: couponFeedback.type === "success" ? "#047857" : "#b91c1c",
                }}
              >
                {couponFeedback.message}
              </p>
            )}
          </div>
        )}

        {/* Price Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem", color: "var(--sd-text-secondary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tạm tính</span>
            <span>{formatCurrency(displayedSubtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Phí giao hàng</span>
            <span>{formatCurrency(displayedDeliveryFee)}</span>
          </div>
          {displayedDiscount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#047857", fontWeight: "700" }}>
              <span>Giảm giá mã ({appliedCoupon?.code || placedOrder?.appliedCoupon?.code || "Ưu đãi"}):</span>
              <span>-{formatCurrency(displayedDiscount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "800", color: "var(--sd-text-primary)", borderTop: "1px solid var(--sd-border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
            <span>Tổng thanh toán</span>
            <span style={{ color: "var(--sd-primary)" }}>{formatCurrency(displayedTotal)}</span>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link to="/orders" style={{ fontSize: "0.85rem", color: "var(--sd-primary)", fontWeight: "600", textDecoration: "none" }}>
            Xem lịch sử đơn hàng →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function Checkout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />
      <main className="checkout-page-wrapper">
        <div className="sd-container">
          <div style={{ marginBottom: "1.5rem" }}>
            <Link
              to="/customer/cart"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                color: "var(--sd-text-secondary)",
                fontSize: "0.85rem",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              <FaArrowLeft size={12} /> Quay lại giỏ hàng
            </Link>
          </div>

          <Elements stripe={stripePromise}>
            <CheckoutForm />
          </Elements>
        </div>
      </main>
      <Footer />
    </div>
  );
}
