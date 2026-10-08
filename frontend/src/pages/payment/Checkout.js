import { API_URLS } from '../../config/api';
import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
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
  FaUtensils,
  FaMapMarkerAlt,
  FaSpinner,
  FaTicketAlt,
  FaTimes,
} from "react-icons/fa";
import { CartContext } from "../contexts/CartContext";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import PaymentMethodSelector from "../../components/payment/PaymentMethodSelector";
import DeliveryLocationPicker from "../../components/DeliveryLocationPicker";
import { formatCurrency } from "../../utils/currency";
import { getValidToken, getAuthCustomer, clearCustomerAuth, getAuthHeaders } from "../../utils/authHelper";
import "../../styles/checkout.css";

const API_BASE_URL = API_URLS.PAYMENT;
const PAYOS_RETURN_PENDING_KEY = "skydish_payos_return_pending";

function couponDiscountLabel(coupon) {
  if (coupon.discountType === "percentage") return `Giảm ${coupon.discountValue}%`;
  if (coupon.discountType === "shipping") return "Giảm phí vận chuyển";
  return `Giảm ${formatCurrency(coupon.discountValue)}`;
}

function couponExpiryLabel(endAt) {
  if (!endAt) return "Không giới hạn thời gian";
  return `HSD ${new Date(endAt).toLocaleDateString("vi-VN")}`;
}

function normalizeProvinceName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(tinh|thanh pho|quan|huyen|thi xa|thi tran|phuong|xa)\s+/i, "")
    .trim()
    .toLowerCase();
}

function hasCoordinate(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function calculateDistanceKm(fromLatitude, fromLongitude, toLatitude, toLongitude) {
  if (![fromLatitude, fromLongitude, toLatitude, toLongitude].every(hasCoordinate)) return 0;
  const lat1 = Number(fromLatitude);
  const lon1 = Number(fromLongitude);
  const lat2 = Number(toLatitude);
  const lon2 = Number(toLongitude);

  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateDistanceShippingFee({ restaurantLatitude, restaurantLongitude, deliveryLatitude, deliveryLongitude, baseFee = 15000, perKm = 3500 }) {
  if (![restaurantLatitude, restaurantLongitude, deliveryLatitude, deliveryLongitude].every(hasCoordinate)) return baseFee;
  const lat1 = Number(restaurantLatitude);
  const lon1 = Number(restaurantLongitude);
  const lat2 = Number(deliveryLatitude);
  const lon2 = Number(deliveryLongitude);

  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return baseFee;
  }

  const distanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2);
  return Math.round(baseFee + Math.max(0, distanceKm) * perKm);
}

const CheckoutForm = () => {
  const navigate = useNavigate();
  const { cartItems, subtotal, deliveryFee, clearCart, hasMixedRestaurants } = useContext(CartContext);

  const authCustomer = useMemo(() => getAuthCustomer(), []);

  // Enforce customer authentication: Guests are strictly blocked from Checkout
  useEffect(() => {
    const validToken = getValidToken();
    const customer = getAuthCustomer();
    const isAuthorized = validToken && customer && (customer.role === "customer" || customer.role === "admin" || !customer.role);
    if (!isAuthorized) {
      if (validToken) clearCustomerAuth();
      navigate(`/auth/login?redirect=/checkout&message=${encodeURIComponent("Vui lòng đăng nhập để đặt hàng.")}`, { replace: true });
    }
  }, [navigate]);

  const checkAuthOrRedirect = useCallback(() => {
    const validToken = getValidToken();
    const customer = getAuthCustomer();
    const isAuthorized = validToken && customer && (customer.role === "customer" || customer.role === "admin" || !customer.role);
    if (!isAuthorized) {
      if (validToken) clearCustomerAuth();
      navigate(`/auth/login?redirect=/checkout&message=${encodeURIComponent("Vui lòng đăng nhập để đặt hàng.")}`, { replace: true });
      return false;
    }
    return true;
  }, [navigate]);

  const [paymentMethod, setPaymentMethod] = useState("VNPAY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [disablePayment, setDisablePayment] = useState(false);

  useEffect(() => {
    const showUnfinishedPayOSMessage = () => {
      if (sessionStorage.getItem(PAYOS_RETURN_PENDING_KEY) !== "1") return;
      sessionStorage.removeItem(PAYOS_RETURN_PENDING_KEY);
      setError("Thanh toán chưa hoàn tất. Vui lòng quay lại trang đặt món để tiếp tục.");
      setLoading(false);
    };

    window.addEventListener("pageshow", showUnfinishedPayOSMessage);
    showUnfinishedPayOSMessage();
    return () => window.removeEventListener("pageshow", showUnfinishedPayOSMessage);
  }, []);

  // Structured delivery address
  const [addrCity, setAddrCity] = useState(localStorage.getItem("addr_city") || "");
  const [addrDistrict, setAddrDistrict] = useState(localStorage.getItem("addr_district") || "");
  const [addrWard, setAddrWard] = useState(localStorage.getItem("addr_ward") || "");
  const [addrDetail, setAddrDetail] = useState(localStorage.getItem("addr_detail") || "");
  const [addrProvinceId, setAddrProvinceId] = useState(localStorage.getItem("addr_province_id") || "");
  const [addrDistrictId, setAddrDistrictId] = useState(localStorage.getItem("addr_district_id") || "");
  const [addrWardCode, setAddrWardCode] = useState(localStorage.getItem("addr_ward_code") || "");
  const [deliveryPosition, setDeliveryPosition] = useState(() => {
    const savedLatitude = localStorage.getItem("delivery_latitude");
    const savedLongitude = localStorage.getItem("delivery_longitude");
    const latitude = Number(savedLatitude);
    const longitude = Number(savedLongitude);
    return savedLatitude && savedLongitude && Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null;
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [ghnEnabled, setGhnEnabled] = useState(false);
  const [ghnConfigLoading, setGhnConfigLoading] = useState(true);
  const [addressDirectoryEnabled, setAddressDirectoryEnabled] = useState(false);
  const [addressDirectoryProvider, setAddressDirectoryProvider] = useState(localStorage.getItem("addr_directory_provider") || "");
  const addressDirectoryProviderRef = useRef(addressDirectoryProvider);
  const [ghnProvinces, setGhnProvinces] = useState([]);
  const [ghnDistricts, setGhnDistricts] = useState([]);
  const [ghnWards, setGhnWards] = useState([]);
  const [ghnQuote, setGhnQuote] = useState(null);
  const [ghnQuoteKey, setGhnQuoteKey] = useState("");
  const [ghnQuoteLoading, setGhnQuoteLoading] = useState(false);
  const [ghnQuoteError, setGhnQuoteError] = useState("");

  // Computed full address string
  const deliveryAddress = useMemo(() => {
    const parts = [addrDetail, addrWard, addrDistrict, addrCity].filter(Boolean);
    return parts.join(", ");
  }, [addrDetail, addrWard, addrDistrict, addrCity]);

  // Persist address parts to localStorage on change
  useEffect(() => { localStorage.setItem("addr_city", addrCity); }, [addrCity]);
  useEffect(() => { localStorage.setItem("addr_district", addrDistrict); }, [addrDistrict]);
  useEffect(() => { localStorage.setItem("addr_ward", addrWard); }, [addrWard]);
  useEffect(() => { localStorage.setItem("addr_detail", addrDetail); }, [addrDetail]);
  useEffect(() => { localStorage.setItem("addr_province_id", addrProvinceId); }, [addrProvinceId]);
  useEffect(() => { localStorage.setItem("addr_district_id", addrDistrictId); }, [addrDistrictId]);
  useEffect(() => { localStorage.setItem("addr_ward_code", addrWardCode); }, [addrWardCode]);
  useEffect(() => {
    if (addressDirectoryProvider) localStorage.setItem("addr_directory_provider", addressDirectoryProvider);
    else localStorage.removeItem("addr_directory_provider");
  }, [addressDirectoryProvider]);
  useEffect(() => {
    if (deliveryPosition) {
      localStorage.setItem("delivery_latitude", String(deliveryPosition.latitude));
      localStorage.setItem("delivery_longitude", String(deliveryPosition.longitude));
    } else {
      localStorage.removeItem("delivery_latitude");
      localStorage.removeItem("delivery_longitude");
    }
  }, [deliveryPosition]);

  useEffect(() => {
    let isMounted = true;
    axios.get(`${API_URLS.ORDER}/api/orders/shipping/locations/provinces`, {
      headers: { Authorization: `Bearer ${getValidToken()}` },
    }).then((res) => {
      if (isMounted && Array.isArray(res.data?.data)) {
        const nextProvider = res.data.provider || "VN_PUBLIC";
        if (addressDirectoryProviderRef.current && addressDirectoryProviderRef.current !== nextProvider) {
          setAddrProvinceId("");
          setAddrDistrictId("");
          setAddrWardCode("");
          setAddrDistrict("");
          setAddrWard("");
        }
        setGhnProvinces(res.data.data);
        addressDirectoryProviderRef.current = nextProvider;
        setAddressDirectoryProvider(nextProvider);
        setAddressDirectoryEnabled(true);
        setGhnEnabled(nextProvider === "GHN");
      }
    }).catch((err) => {
      if (isMounted && err.response?.status !== 503) {
        setGhnEnabled(true);
        setGhnQuoteError(err.response?.data?.error || "Không thể tải địa chỉ GHN.");
      }
    }).finally(() => {
      if (isMounted) setGhnConfigLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

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
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponListLoading, setCouponListLoading] = useState(false);

  const [currentOrderId] = useState(() => `ORDER${Math.floor(10000 + Math.random() * 90000)}`);
  const [placedOrder, setPlacedOrder] = useState(null);
  const completionInFlightRef = useRef(false);

  const customerName = authCustomer?.name || localStorage.getItem("customerName") || "";
  const customerEmail = authCustomer?.email || localStorage.getItem("customerEmail") || "";
  const customerPhone = authCustomer?.phone || localStorage.getItem("customerPhone") || "";
  const [firstName, lastName] = customerName ? customerName.split(" ") : ["", ""];

  // Restaurant info resolution state
  const [restaurantInfo, setRestaurantInfo] = useState({
    id: "",
    name: "",
    location: "",
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
    ghnDistrictId: null,
    ghnWardCode: "",
  });

  // Effect to authoritatively resolve restaurant details from cart item, restaurant-service, or food item
  useEffect(() => {
    let isMounted = true;

    const resolveRestaurant = async () => {
      if (!cartItems || cartItems.length === 0) {
        if (isMounted) {
          setRestaurantInfo({ id: "", name: "", location: "", latitude: null, longitude: null, loading: false, error: null });
        }
        return;
      }

      const firstItem = cartItems[0];
      const extractedId =
        firstItem.restaurantId ||
        (typeof firstItem.restaurant === "object" ? firstItem.restaurant?._id : firstItem.restaurant) ||
        "";
      const extractedName =
        firstItem.restaurantName ||
        (typeof firstItem.restaurant === "object" ? firstItem.restaurant?.name : "") ||
        "";
      const foodId = firstItem._id || firstItem.foodId || "";

      // 1. Immediately adopt known name from cart item so UI displays without waiting
      if (extractedName && isMounted) {
        setRestaurantInfo((prev) => ({
          ...prev,
          id: extractedId || prev.id,
          name: extractedName,
          loading: false,
          error: null,
        }));
      }

      // 2. If valid restaurantId is present, fetch authoritative info from restaurant-service
      if (extractedId && extractedId !== "undefined" && extractedId !== "null") {
        if (isMounted && !extractedName) {
          setRestaurantInfo((prev) => ({ ...prev, loading: true }));
        }
        try {
          const res = await axios.get(`${API_URLS.RESTAURANT}/api/restaurant/${extractedId}`);
          if (isMounted && res.data) {
            setRestaurantInfo({
              id: res.data._id || extractedId,
              name: res.data.name || extractedName || "Nhà hàng đối tác SkyDish",
              location: res.data.location || "",
              latitude: hasCoordinate(res.data.latitude) ? Number(res.data.latitude) : null,
              longitude: hasCoordinate(res.data.longitude) ? Number(res.data.longitude) : null,
              loading: false,
              error: null,
              ghnDistrictId: res.data.ghnDistrictId || null,
              ghnWardCode: res.data.ghnWardCode || "",
            });
            return;
          }
        } catch (err) {
          console.warn("Could not fetch restaurant by ID:", extractedId, err.message);
          if (extractedName && isMounted) {
            setRestaurantInfo((prev) => ({
              ...prev,
              id: extractedId,
              name: extractedName,
              loading: Boolean(foodId),
              error: null,
            }));
          }
        }
      }

      // 3. Fallback: If restaurantId was missing or not found, query food item detail
      if (foodId && foodId !== "undefined" && foodId !== "null") {
        if (isMounted && !extractedName) {
          setRestaurantInfo((prev) => ({ ...prev, loading: true }));
        }
        try {
          const res = await axios.get(`${API_URLS.RESTAURANT}/api/food-items/item/${foodId}`);
          if (isMounted && res.data?.restaurant) {
            const rest = res.data.restaurant;
            setRestaurantInfo({
              id: typeof rest === "object" ? rest._id : rest,
              name: typeof rest === "object" ? rest.name : extractedName || "Nhà hàng đối tác SkyDish",
              location: typeof rest === "object" ? rest.location : "",
              latitude: typeof rest === "object" && hasCoordinate(rest.latitude) ? Number(rest.latitude) : null,
              longitude: typeof rest === "object" && hasCoordinate(rest.longitude) ? Number(rest.longitude) : null,
              loading: false,
              error: null,
              ghnDistrictId: typeof rest === "object" ? rest.ghnDistrictId || null : null,
              ghnWardCode: typeof rest === "object" ? rest.ghnWardCode || "" : "",
            });
            return;
          }
        } catch (err) {
          console.warn("Could not fetch food item relation:", foodId, err.message);
        }
      }

      // 4. Fallback: clear loading state unconditionally so it never hangs
      if (isMounted) {
        setRestaurantInfo((prev) => ({
          id: extractedId || prev.id || "",
          name: prev.name || extractedName || (cartItems.length > 0 ? "Nhà hàng đối tác SkyDish" : ""),
          location: prev.location || "",
          latitude: prev.latitude ?? null,
          longitude: prev.longitude ?? null,
          loading: false,
          error: "Không thể xác minh món ăn/nhà hàng trong giỏ. Vui lòng xóa món cũ và thêm lại từ thực đơn.",
          ghnDistrictId: prev.ghnDistrictId || null,
          ghnWardCode: prev.ghnWardCode || "",
        }));
      }
    };

    resolveRestaurant();

    return () => {
      isMounted = false;
    };
  }, [cartItems]);

  const updateAddressFromPosition = async (position) => {
    const response = await axios.post(`${API_URLS.ORDER}/api/orders/shipping/reverse-geocode`, position, {
      headers: { Authorization: `Bearer ${getValidToken()}` },
    });
    const address = response.data?.address;
    if (!address) throw new Error("Không đọc được địa chỉ từ vị trí hiện tại.");

    const findMatch = (items, candidates, idKey, nameKey) => {
      const normalizedCandidates = candidates.map(normalizeProvinceName);
      return items.find((item) => normalizedCandidates.includes(normalizeProvinceName(item[nameKey])));
    };

    const province = findMatch(ghnProvinces, address.provinceCandidates || [], "ProvinceID", "ProvinceName");
    const provinceName = province?.ProvinceName || address.provinceCandidates?.[0] || "";
    setAddrCity(provinceName);
    setAddrDetail(address.detail || "");

    if (!addressDirectoryEnabled || !province) {
      setAddrProvinceId("");
      setAddrDistrictId("");
      setAddrWardCode("");
      setAddrDistrict(address.districtCandidates?.[0] || "");
      setAddrWard(address.wardCandidates?.[0] || "");
      if (addressDirectoryEnabled && !province) {
        setLocationError("Đã lấy vị trí; hãy chọn lại tỉnh/quận/phường trong danh sách nếu tên không khớp.");
      }
      return;
    }

    setAddrProvinceId(String(province.ProvinceID));
    const districtResponse = await axios.get(`${API_URLS.ORDER}/api/orders/shipping/locations/districts`, {
      params: { parentId: province.ProvinceID },
      headers: { Authorization: `Bearer ${getValidToken()}` },
    });
    const districts = Array.isArray(districtResponse.data?.data) ? districtResponse.data.data : [];
    setGhnDistricts(districts);
    let district = findMatch(districts, address.districtCandidates || [], "DistrictID", "DistrictName");
    let wards = [];
    let ward = null;

    if (district) {
      const wardResponse = await axios.get(`${API_URLS.ORDER}/api/orders/shipping/locations/wards`, {
        params: { parentId: district.DistrictID },
        headers: { Authorization: `Bearer ${getValidToken()}` },
      });
      wards = Array.isArray(wardResponse.data?.data) ? wardResponse.data.data : [];
      ward = findMatch(wards, address.wardCandidates || [], "WardCode", "WardName");
    }

    if ((!district || !ward) && (address.wardCandidates || []).length) {
      const resolveResponse = await axios.get(`${API_URLS.ORDER}/api/orders/shipping/locations/resolve-area`, {
        params: { parentId: province.ProvinceID, wardCandidates: address.wardCandidates.join("|") },
        headers: { Authorization: `Bearer ${getValidToken()}` },
      });
      const resolvedArea = resolveResponse.data?.data;
      if (resolvedArea?.district && resolvedArea?.ward) {
        district = resolvedArea.district;
        wards = Array.isArray(resolvedArea.wards) ? resolvedArea.wards : [];
        ward = resolvedArea.ward;
      }
    }

    if (!district) {
      setAddrDistrictId("");
      setAddrWardCode("");
      setGhnWards([]);
      setAddrDistrict(address.districtCandidates?.[0] || "");
      setAddrWard(address.wardCandidates?.[0] || "");
      setLocationError("Đã lấy vị trí; vui lòng chọn quận/huyện và phường/xã trong danh sách.");
      return;
    }

    setAddrDistrictId(String(district.DistrictID));
    setAddrDistrict(district.DistrictName);
    setGhnWards(wards);
    setAddrWardCode(ward?.WardCode || "");
    setAddrWard(ward?.WardName || address.wardCandidates?.[0] || "");
    if (!ward) setLocationError("Đã lấy vị trí; vui lòng xác nhận phường/xã trong danh sách.");
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt này không hỗ trợ định vị vị trí.");
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const position = { latitude: coords.latitude, longitude: coords.longitude };
        setDeliveryPosition(position);
        try {
          await updateAddressFromPosition(position);
        } catch (error) {
          setLocationError("Đã lấy tọa độ GPS, nhưng không tra được địa chỉ tự động. Bạn vẫn có thể ghim vị trí và nhập địa chỉ thủ công.");
        } finally {
          setLocationLoading(false);
        }
      },
      (geoError) => {
        const message = geoError.code === geoError.PERMISSION_DENIED
          ? "Bạn chưa cấp quyền vị trí cho trình duyệt."
          : "Không lấy được vị trí hiện tại. Hãy thử ghim trực tiếp trên bản đồ.";
        setLocationError(message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const effectiveRestaurantId = useMemo(() => {
    return (
      restaurantInfo.id ||
      cartItems[0]?.restaurantId ||
      (typeof cartItems[0]?.restaurant === "object" ? cartItems[0]?.restaurant?._id : cartItems[0]?.restaurant) ||
      ""
    );
  }, [restaurantInfo.id, cartItems]);

  const effectiveRestaurantName = useMemo(() => {
    return (
      restaurantInfo.name ||
      cartItems[0]?.restaurantName ||
      (typeof cartItems[0]?.restaurant === "object" ? cartItems[0]?.restaurant?.name : "") ||
      ""
    );
  }, [restaurantInfo.name, cartItems]);

  const hasDistanceBasedShipping = useMemo(() => {
    return Boolean(
      !hasMixedRestaurants &&
      deliveryPosition &&
      hasCoordinate(restaurantInfo.latitude) &&
      hasCoordinate(restaurantInfo.longitude)
    );
  }, [hasMixedRestaurants, deliveryPosition, restaurantInfo.latitude, restaurantInfo.longitude]);

  const deliveryDistanceKm = useMemo(() => {
    if (!hasDistanceBasedShipping) return null;
    return calculateDistanceKm(
      restaurantInfo.latitude,
      restaurantInfo.longitude,
      deliveryPosition.latitude,
      deliveryPosition.longitude
    );
  }, [hasDistanceBasedShipping, restaurantInfo.latitude, restaurantInfo.longitude, deliveryPosition]);

  const distanceBasedFee = useMemo(() => {
    if (!hasDistanceBasedShipping) return deliveryFee;
    return calculateDistanceShippingFee({
      restaurantLatitude: restaurantInfo.latitude,
      restaurantLongitude: restaurantInfo.longitude,
      deliveryLatitude: deliveryPosition.latitude,
      deliveryLongitude: deliveryPosition.longitude,
    });
  }, [hasDistanceBasedShipping, deliveryFee, deliveryPosition, restaurantInfo.latitude, restaurantInfo.longitude]);

  useEffect(() => {
    if (!addressDirectoryEnabled || addrProvinceId || !addrCity || !ghnProvinces.length) return;
    const currentProvince = normalizeProvinceName(addrCity);
    const match = ghnProvinces.find((province) => normalizeProvinceName(province.ProvinceName) === currentProvince);
    if (match) setAddrProvinceId(String(match.ProvinceID));
  }, [addressDirectoryEnabled, addrProvinceId, addrCity, ghnProvinces]);

  useEffect(() => {
    let isMounted = true;
    if (!addressDirectoryEnabled || !addrProvinceId) {
      setGhnDistricts([]);
      return undefined;
    }
    axios.get(`${API_URLS.ORDER}/api/orders/shipping/locations/districts`, {
      params: { parentId: addrProvinceId },
      headers: { Authorization: `Bearer ${getValidToken()}` },
    }).then((res) => {
      if (isMounted) setGhnDistricts(Array.isArray(res.data?.data) ? res.data.data : []);
    }).catch((err) => {
      if (isMounted) setGhnQuoteError(err.response?.data?.error || "Không thể tải danh sách quận/huyện GHN.");
    });
    return () => { isMounted = false; };
  }, [addressDirectoryEnabled, addrProvinceId]);

  useEffect(() => {
    let isMounted = true;
    if (!addressDirectoryEnabled || !addrDistrictId) {
      setGhnWards([]);
      return undefined;
    }
    axios.get(`${API_URLS.ORDER}/api/orders/shipping/locations/wards`, {
      params: { parentId: addrDistrictId },
      headers: { Authorization: `Bearer ${getValidToken()}` },
    }).then((res) => {
      if (isMounted) setGhnWards(Array.isArray(res.data?.data) ? res.data.data : []);
    }).catch((err) => {
      if (isMounted) setGhnQuoteError(err.response?.data?.error || "Không thể tải danh sách phường/xã GHN.");
    });
    return () => { isMounted = false; };
  }, [addressDirectoryEnabled, addrDistrictId]);

  const currentGhnQuoteKey = `${effectiveRestaurantId}|${addressDirectoryProvider}|${addrDistrictId}|${addrWardCode}`;

  useEffect(() => {
    if (!ghnEnabled || addressDirectoryProvider !== "GHN" || !effectiveRestaurantId || !addrDistrictId || !addrWardCode) {
      setGhnQuote(null);
      setGhnQuoteKey("");
      setGhnQuoteLoading(false);
      return undefined;
    }

    let isMounted = true;
    setGhnQuote(null);
    setGhnQuoteKey("");
    setGhnQuoteLoading(true);
    setGhnQuoteError("");
    const timer = setTimeout(() => {
      axios.post(`${API_URLS.ORDER}/api/orders/shipping/quote`, {
        restaurantId: effectiveRestaurantId,
        deliveryAreaProvider: addressDirectoryProvider,
        toDistrictId: Number(addrDistrictId),
        toWardCode: addrWardCode,
      }, { headers: { Authorization: `Bearer ${getValidToken()}` } }).then((res) => {
        if (isMounted) {
          setGhnQuote(Number(res.data?.deliveryFee) || 0);
          setGhnQuoteKey(currentGhnQuoteKey);
        }
      }).catch((err) => {
        if (isMounted) setGhnQuoteError(err.response?.data?.error || "Không thể báo giá GHN cho địa chỉ này.");
      }).finally(() => {
        if (isMounted) setGhnQuoteLoading(false);
      });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [ghnEnabled, addressDirectoryProvider, effectiveRestaurantId, addrDistrictId, addrWardCode, currentGhnQuoteKey]);

  const activeDeliveryFee = hasDistanceBasedShipping
    ? distanceBasedFee
    : (!hasMixedRestaurants && ghnEnabled
      ? (ghnQuoteKey === currentGhnQuoteKey && ghnQuote !== null ? ghnQuote : deliveryFee)
      : deliveryFee);
  const activeCouponDiscount = appliedCoupon?.discountType === "shipping" && (hasDistanceBasedShipping || ghnEnabled)
    ? (hasDistanceBasedShipping ? activeDeliveryFee : ((ghnQuoteKey === currentGhnQuoteKey && ghnQuote !== null ? activeDeliveryFee : 0)))
    : couponDiscount;

  // Pure authoritative total calculation: Subtotal + Delivery Fee - Coupon Discount
  const calculatedTotal = useMemo(() => {
    const total = subtotal + activeDeliveryFee;
    return Math.max(0, total - activeCouponDiscount);
  }, [subtotal, activeDeliveryFee, activeCouponDiscount]);

  const orderData = useMemo(() => ({
    orderId: currentOrderId,
    userId: authCustomer?.id || "",
    amount: calculatedTotal,
    currency: "vnd",
    firstName: firstName || "",
    lastName: lastName || "",
    email: customerEmail,
    phone: customerPhone,
    deliveryAddress,
    items: cartItems.map((it) => ({
      foodId: it._id || it.foodId || it.name,
      name: it.name,
      quantity: it.quantity || 1,
      price: Number(it.price) || 0,
      restaurantId: it.restaurantId || "",
      restaurantName: it.restaurantName || "",
    })),
    restaurantId: effectiveRestaurantId,
    restaurantName: effectiveRestaurantName,
    deliveryProvinceId: addrProvinceId ? Number(addrProvinceId) : null,
    deliveryDistrictId: addrDistrictId ? Number(addrDistrictId) : null,
    deliveryWardCode: addrWardCode || null,
    deliveryAreaProvider: addressDirectoryProvider || "MANUAL",
    deliveryLatitude: deliveryPosition?.latitude ?? null,
    deliveryLongitude: deliveryPosition?.longitude ?? null,
    couponCode: appliedCoupon?.code || null,
    discountAmount: activeCouponDiscount,
  }), [currentOrderId, calculatedTotal, firstName, lastName, customerEmail, customerPhone, deliveryAddress, cartItems, appliedCoupon, activeCouponDiscount, effectiveRestaurantId, effectiveRestaurantName, authCustomer, addrProvinceId, addrDistrictId, addrWardCode, addressDirectoryProvider, deliveryPosition]);

  // Keep validation in one place so every payment method uses the same order rules.
  const validateCheckout = useCallback(() => {
    if (!checkAuthOrRedirect()) return false;
    if (!cartItems.length) {
      setError("Giỏ hàng đang trống. Vui lòng chọn món trước khi thanh toán.");
      return false;
    }
    if (restaurantInfo.error) {
      setError(restaurantInfo.error);
      return false;
    }
    if (!addrCity.trim() || !addrDistrict.trim() || !addrDetail.trim()) {
      setError("Vui lòng nhập Tỉnh/Thành phố, Quận/Huyện và địa chỉ chi tiết trước khi thanh toán.");
      return false;
    }
    if (!effectiveRestaurantId) {
      setError("Không thể xác định nhà hàng của đơn. Vui lòng quay lại giỏ hàng và thử lại.");
      return false;
    }
    if (ghnConfigLoading) {
      setError("Đang kiểm tra cấu hình cước giao hàng. Vui lòng chờ.");
      return false;
    }
    if (!hasMixedRestaurants && !hasDistanceBasedShipping && ghnEnabled && (addressDirectoryProvider !== "GHN" || !addrProvinceId || !addrDistrictId || !addrWardCode || ghnQuoteKey !== currentGhnQuoteKey || ghnQuote === null)) {
      setError(ghnQuoteError || "Vui lòng chọn đầy đủ địa chỉ và chờ GHN báo giá trước khi thanh toán.");
      return false;
    }
    return true;
  }, [checkAuthOrRedirect, cartItems.length, hasMixedRestaurants, restaurantInfo.error, addrCity, addrDistrict, addrDetail, effectiveRestaurantId, ghnEnabled, ghnConfigLoading, addressDirectoryProvider, addrProvinceId, addrDistrictId, addrWardCode, ghnQuoteKey, currentGhnQuoteKey, ghnQuote, ghnQuoteError, hasDistanceBasedShipping]);

  const handleApplyCoupon = async (e, selectedCode = couponCode) => {
    if (e) e.preventDefault();
    if (!selectedCode.trim()) {
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
        code: selectedCode.trim(),
        orderAmount: subtotal,
        restaurantId: effectiveRestaurantId || cartItems[0]?.restaurantId || "",
        customerId: authCustomer?.id || "",
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

  const handleOpenCouponModal = async () => {
    setCouponModalOpen(true);
    if (availableCoupons.length > 0) return;
    setCouponListLoading(true);
    try {
      const endpoint = effectiveRestaurantId
        ? `${API_URLS.RESTAURANT}/api/coupons/restaurant/${effectiveRestaurantId}`
        : `${API_URLS.RESTAURANT}/api/coupons`;
      const res = await axios.get(endpoint);
      setAvailableCoupons(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setCouponFeedback({ type: "error", message: "Không thể tải danh sách voucher lúc này." });
    } finally {
      setCouponListLoading(false);
    }
  };

  const handleSelectCoupon = async (coupon) => {
    setCouponCode(coupon.code);
    setCouponModalOpen(false);
    await handleApplyCoupon(null, coupon.code);
  };

  // Create one child order per restaurant while keeping one checkout/payment id.
  // Order Service recalculates each child total from its own database prices.
  const buildGroupedOrderPayloads = useCallback((method, status = "Pending") => {
    const groups = new Map();
    orderData.items.forEach((item) => {
      const restaurantId = item.restaurantId || orderData.restaurantId || "restaurant_1";
      if (!groups.has(restaurantId)) {
        groups.set(restaurantId, {
          restaurantId,
          restaurantName: item.restaurantName || (restaurantId === orderData.restaurantId ? orderData.restaurantName : ""),
          items: [],
        });
      }
      groups.get(restaurantId).items.push(item);
    });

    const groupList = Array.from(groups.values());
    const couponRestaurantId = appliedCoupon?.coupon?.restaurantId || effectiveRestaurantId;
    const couponIndex = groupList.findIndex((group) => (
      appliedCoupon && (
        appliedCoupon.coupon?.restaurantId === "PLATFORM" ||
        String(group.restaurantId) === String(couponRestaurantId)
      )
    ));

    return groupList.map((group, index) => ({
      orderGroupId: orderData.orderId,
      restaurantId: group.restaurantId,
      restaurantName: group.restaurantName,
      customerName: `${orderData.firstName} ${orderData.lastName}`.trim(),
      customerEmail: orderData.email,
      customerPhone: orderData.phone,
      items: group.items.map((it) => ({
        foodId: it.foodId,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
      })),
      deliveryAddress: orderData.deliveryAddress,
      deliveryProvinceId: orderData.deliveryProvinceId,
      deliveryDistrictId: orderData.deliveryDistrictId,
      deliveryWardCode: orderData.deliveryWardCode,
      deliveryAreaProvider: orderData.deliveryAreaProvider,
      deliveryLatitude: orderData.deliveryLatitude,
      deliveryLongitude: orderData.deliveryLongitude,
      paymentMethod: method,
      paymentStatus: status === "Paid" ? "Paid" : "Pending",
      couponCode: index === couponIndex ? orderData.couponCode : null,
      status: status === "Paid" ? "Confirmed" : "Pending",
    }));
  }, [orderData, appliedCoupon, effectiveRestaurantId]);

  // Order creation helper — always sends Bearer token and rejects unauthenticated guests
  const createOrderInOrderService = useCallback(async (method, status = "Pending") => {
    const validToken = getValidToken();
    if (!validToken) {
      clearCustomerAuth();
      navigate(`/auth/login?redirect=/checkout&message=${encodeURIComponent("Vui lòng đăng nhập để đặt hàng.")}`, { replace: true });
      throw new Error("Vui lòng đăng nhập để đặt hàng.");
    }

    try {
      const payloads = buildGroupedOrderPayloads(method, status);
      const responses = await Promise.all(payloads.map((payload) => axios.post(
        `${API_URLS.ORDER}/api/orders`,
        payload,
        { headers: { Authorization: `Bearer ${validToken}` } }
      )));
      const orders = responses.map((response) => response.data?.order || response.data).filter(Boolean);
      return {
        orderGroupId: orderData.orderId,
        orders,
        totalAmount: orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
        primaryOrderId: orders[0]?._id || orderData.orderId,
      };
    } catch (err) {
      if (err.response?.status === 401) {
        clearCustomerAuth();
        navigate(`/auth/login?redirect=/checkout&message=${encodeURIComponent("Vui lòng đăng nhập để đặt hàng.")}`, { replace: true });
      }
      throw err;
    }
  }, [orderData, navigate, buildGroupedOrderPayloads]);



  // 2. Initialize VNPay QR
  const generateVNPayQR = useCallback(async () => {
    if (!validateCheckout()) return;
    try {
      setLoading(true);
      setError(null);
      await createOrderInOrderService("VNPAY", "Pending");
      const res = await axios.post(`${API_BASE_URL}/api/payment/vnpay/create`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
        bankCode: vnpBankCode,
        language: "vn",
      }, { headers: getAuthHeaders() });
      if (res.data.paymentUrl) {
        setVnpayQrUrl(res.data.paymentUrl);
        setPollingActive(true);
      }
    } catch (err) {
      console.warn("VNPay QR init note:", err.message);
      setError(err.response?.data?.error || "Không thể tạo mã VNPay lúc này. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [orderData, vnpBankCode, validateCheckout, createOrderInOrderService]);

  // 3. Initialize MoMo QR
  const generateMoMoQR = useCallback(async () => {
    if (!validateCheckout()) return;
    try {
      setLoading(true);
      setError(null);
      await createOrderInOrderService("MOMO", "Pending");
      const res = await axios.post(`${API_BASE_URL}/api/payment/momo/create`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
      }, { headers: getAuthHeaders() });
      if (res.data.payUrl) {
        setMomoQrUrl(res.data.payUrl);
        setPollingActive(true);
      }
    } catch (err) {
      console.warn("MoMo QR init note:", err.message);
      setError(err.response?.data?.error || "Không thể tạo mã MoMo lúc này. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [orderData, validateCheckout, createOrderInOrderService]);

  // 4. Initialize Bank Transfer / VietQR
  const generateBankTransferQR = useCallback(async () => {
    if (!validateCheckout()) return;
    try {
      setBankTransferLoading(true);
      setError(null);
      await createOrderInOrderService("BANK_TRANSFER", "Pending");
      const res = await axios.post(`${API_BASE_URL}/api/payment/bank-transfer/create`, {
        orderId: orderData.orderId,
        userId: orderData.userId,
        amount: orderData.amount,
        email: orderData.email,
        phone: orderData.phone,
      }, { headers: getAuthHeaders() });
      if (res.data.bankDetails) {
        setBankDetails(res.data.bankDetails);
      }
    } catch (err) {
      console.warn("Bank Transfer QR init note:", err.message);
      setError(err.response?.data?.error || "Không thể tạo thông tin chuyển khoản lúc này. Vui lòng thử lại.");
    } finally {
      setBankTransferLoading(false);
    }
  }, [orderData, validateCheckout, createOrderInOrderService]);

  // Customer clicked "Tôi đã chuyển khoản"
  const handleConfirmBankTransfer = async () => {
    if (!validateCheckout()) return;
    if (!bankDetails) {
      setError("Vui lòng tạo thông tin chuyển khoản trước khi xác nhận.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await axios.post(`${API_BASE_URL}/api/payment/bank-transfer/confirm-request`, {
        orderId: orderData.orderId,
      }, { headers: getAuthHeaders() });
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

  // Automatic polling effect for QR modes
  useEffect(() => {
    let interval = null;
    if (pollingActive && !disablePayment) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/payment/status/${orderData.orderId}`, { headers: getAuthHeaders() });
          if (res.data.paymentStatus === "Paid" && !completionInFlightRef.current) {
            completionInFlightRef.current = true;
            await createOrderInOrderService(paymentMethod, "Paid");
            const snapshot = {
              orderId: orderData.orderId,
              items: [...cartItems],
              subtotal,
              deliveryFee: activeDeliveryFee,
              couponDiscount: activeCouponDiscount,
              totalAmount: orderData.amount,
              paymentMethod,
              restaurantId: orderData.restaurantId,
              restaurantName: orderData.restaurantName || effectiveRestaurantName,
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
          completionInFlightRef.current = false;
        }
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pollingActive, disablePayment, orderData, paymentMethod, cartItems, subtotal, activeDeliveryFee, activeCouponDiscount, appliedCoupon, clearCart, createOrderInOrderService, effectiveRestaurantName]);

  // Status Polling for QR Modes
  const checkPaymentStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/payment/status/${orderData.orderId}`, { headers: getAuthHeaders() });
      if (res.data.paymentStatus === "Paid" && !completionInFlightRef.current) {
        completionInFlightRef.current = true;
        await createOrderInOrderService(paymentMethod, "Paid");
        const snapshot = {
          orderId: orderData.orderId,
          items: [...cartItems],
          subtotal,
          deliveryFee: activeDeliveryFee,
          couponDiscount: activeCouponDiscount,
          totalAmount: orderData.amount,
          paymentMethod,
          restaurantId: orderData.restaurantId,
          restaurantName: orderData.restaurantName || effectiveRestaurantName,
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
      completionInFlightRef.current = false;
      setError("Không thể kiểm tra trạng thái thanh toán lúc này.");
      setTimeout(() => setError(null), 4000);
    }
  };



  // VNPay Redirect Submission Handler
  const handleVNPayRedirect = async (event) => {
    event.preventDefault();
    if (!validateCheckout()) return;
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
      }, { headers: getAuthHeaders() });
      if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
      } else {
        setError("Không thể tạo liên kết chuyển hướng thanh toán VNPay.");
        setLoading(false);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Không thể kết nối đến cổng thanh toán VNPay. Vui lòng chọn phương thức khác.";
      setError(msg);
      setLoading(false);
    }
  };

  // MoMo Redirect Submission Handler
  const handleMoMoRedirect = async (event) => {
    event.preventDefault();
    if (!validateCheckout()) return;
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
      }, { headers: getAuthHeaders() });
      if (response.data.payUrl) {
        window.location.href = response.data.payUrl;
      } else {
        setError("Không thể khởi tạo giao dịch ví MoMo.");
        setLoading(false);
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Không thể kết nối đến dịch vụ MoMo. Vui lòng chọn phương thức khác.";
      setError(msg);
      setLoading(false);
    }
  };

  const handlePayOSRedirect = async (event) => {
    event.preventDefault();
    if (!validateCheckout()) return;
    if (loading || disablePayment) return;
    setLoading(true);
    setError(null);
    try {
      const createdOrder = await createOrderInOrderService("PAYOS", "Pending");
      if (!createdOrder?.orderGroupId) throw new Error("Không lấy được mã nhóm đơn hàng từ hệ thống.");
      const response = await axios.post(`${API_BASE_URL}/api/payment/payos/create`, {
        orderId: createdOrder.orderGroupId,
        amount: createdOrder.totalAmount,
        email: orderData.email,
        phone: orderData.phone,
      }, { headers: getAuthHeaders() });
      if (response.data.checkoutUrl) {
        sessionStorage.setItem(PAYOS_RETURN_PENDING_KEY, "1");
        window.location.href = response.data.checkoutUrl;
      } else {
        setError("Không thể tạo liên kết thanh toán PayOS.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Không thể kết nối đến PayOS. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  // Cash on Delivery (COD) Submission Handler
  const handleCODSubmit = async (event) => {
    event.preventDefault();
    if (!validateCheckout()) return;
    if (loading || disablePayment) return;

    setLoading(true);
    setError(null);
    setMessage("");

    try {
      // 1. Create order in order-service first with verified JWT
      await createOrderInOrderService("COD", "Pending");

      // 2. Process COD in payment-service
      const response = await axios.post(
        `${API_BASE_URL}/api/payment/cod/process`,
        {
          orderId: orderData.orderId,
          amount: orderData.amount,
          email: orderData.email,
          phone: orderData.phone,
        },
        { headers: getAuthHeaders() }
      );
      if (response.data.success || response.data.paymentStatus === "Pending") {
        const snapshot = {
          orderId: orderData.orderId,
          items: [...cartItems],
          subtotal,
          deliveryFee: activeDeliveryFee,
          couponDiscount: activeCouponDiscount,
          totalAmount: orderData.amount,
          paymentMethod: "COD",
          restaurantId: orderData.restaurantId,
          restaurantName: orderData.restaurantName || effectiveRestaurantName,
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
      if (err.response?.status === 401 || !getValidToken()) {
        clearCustomerAuth();
        navigate(`/auth/login?redirect=/checkout&message=${encodeURIComponent("Vui lòng đăng nhập để đặt hàng.")}`, { replace: true });
        return;
      }
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else {
        setError("Không thể đặt hàng lúc này. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };


  const displayedItems = placedOrder ? placedOrder.items : cartItems;
  const displayedSubtotal = placedOrder ? placedOrder.subtotal : subtotal;
  const displayedDeliveryFee = placedOrder ? placedOrder.deliveryFee : activeDeliveryFee;
  const displayedDiscount = placedOrder ? placedOrder.couponDiscount : activeCouponDiscount;
  const displayedTotal = placedOrder ? placedOrder.totalAmount : calculatedTotal;
  const displayedRestaurantName = placedOrder
    ? (placedOrder.restaurantName || placedOrder.restaurantId)
    : (restaurantInfo.name || cartItems[0]?.restaurantName || "");
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
            <span>Nhà hàng: <strong style={{ color: "#0f172a" }}>{placedOrder.restaurantName || placedOrder.restaurantId || "Nhà hàng đối tác SkyDish"}</strong></span>
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
    <div className="checkout-grid checkout-premium-grid">
      {/* LEFT COLUMN: Payment Configuration & Method Form */}
      <div className="checkout-card checkout-payment-card">
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
                  {vnpayQrUrl ? (
                    <img
                      src={`https://quickchart.io/qr?text=${encodeURIComponent(vnpayQrUrl)}&size=320&margin=2&ecLevel=M`}
                      alt="Mã QR VNPay"
                      style={{ width: "320px", height: "320px", maxWidth: "100%", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "200px", minHeight: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", textAlign: "center", color: "var(--sd-text-secondary)", padding: "1rem" }}>
                      <FaQrcode size={38} style={{ color: "var(--sd-primary)" }} />
                      <span style={{ fontSize: "0.8rem" }}>Nhập địa chỉ giao hàng rồi tạo mã thanh toán an toàn.</span>
                      <Button variant="primary" size="sm" disabled={loading || disablePayment} onClick={generateVNPayQR}>
                        Tạo mã QR
                      </Button>
                    </div>
                  )}
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
                    disabled={disablePayment || loading || !vnpayQrUrl}
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
                  {momoQrUrl ? (
                    <img
                      src={`https://quickchart.io/qr?text=${encodeURIComponent(momoQrUrl)}&size=200&margin=1`}
                      alt="Mã QR MoMo"
                      style={{ width: "200px", height: "200px", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "200px", minHeight: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", textAlign: "center", color: "var(--sd-text-secondary)", padding: "1rem" }}>
                      <FaQrcode size={38} style={{ color: "#a21caf" }} />
                      <span style={{ fontSize: "0.8rem" }}>Nhập địa chỉ giao hàng rồi tạo mã thanh toán an toàn.</span>
                      <Button variant="primary" size="sm" disabled={loading || disablePayment} onClick={generateMoMoQR} style={{ backgroundColor: "#a21caf", borderColor: "#a21caf" }}>
                        Tạo mã QR
                      </Button>
                    </div>
                  )}
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
                    disabled={disablePayment || loading || !momoQrUrl}
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
                          `https://img.vietqr.io/image/970422-0327242691-compact2.png?amount=${orderData.amount}&addInfo=SKYDISH-${orderData.orderId}&accountName=NGUYEN%20HUU%20SON%20NHAT`
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
                        {bankDetails?.accountNumber || "0327242691"}
                      </span>
                      <button
                        type="button"
                        className="bank-copy-btn"
                        onClick={() =>
                          copyToClipboard(
                            bankDetails?.accountNumber || "0327242691",
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
                      {bankDetails?.accountHolder || "NGUYEN HUU SON NHAT"}
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

              {!bankDetails && !bankTransferLoading && (
                <div style={{ padding: "0 1.5rem 1rem", textAlign: "center" }}>
                  <p style={{ margin: "0 0 0.7rem", color: "var(--sd-text-secondary)", fontSize: "0.82rem" }}>
                    Tạo thông tin riêng cho đơn này trước khi chuyển khoản để hệ thống đối soát chính xác.
                  </p>
                  <Button variant="primary" size="sm" icon={FaQrcode} onClick={generateBankTransferQR} disabled={loading || disablePayment}>
                    Tạo thông tin chuyển khoản
                  </Button>
                </div>
              )}

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
                    disabled={disablePayment || loading || !bankDetails}
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

        {paymentMethod === "PAYOS" && (
          <form onSubmit={handlePayOSRedirect} style={{ marginTop: "1.5rem" }}>
            <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.65rem" }}>
                <FaQrcode size={24} style={{ color: "#0068ff" }} />
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#1e3a8a" }}>
                  Thanh toán an toàn với PayOS
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#1d4ed8", lineHeight: "1.6" }}>
                Tiếp tục đến trang PayOS để quét VietQR hoặc chọn ứng dụng ngân hàng. Tổng thanh toán: <strong>{formatCurrency(displayedTotal)}</strong>.
              </p>
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={FaExternalLinkAlt}
              disabled={disablePayment || loading}
              style={{ width: "100%", backgroundColor: "#0068ff", borderColor: "#0068ff" }}
            >
              {loading ? "Đang kết nối PayOS..." : `Thanh toán qua PayOS (${formatCurrency(displayedTotal)})`}
            </Button>
          </form>
        )}

        {/* =========================================================================
            5. CASH ON DELIVERY (COD) FLOW
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

        {/* International card (Stripe) has been removed from Customer Checkout */}

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
      <div className="checkout-card checkout-summary-card">
        <h2 className="checkout-section-title">
          <FaReceipt style={{ color: "var(--sd-primary)" }} /> Tóm tắt đơn hàng
        </h2>

        {/* Restaurant name */}
        <div className="checkout-restaurant-summary" style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--sd-text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <span>Nhà hàng:</span>
          {restaurantInfo.loading ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--sd-primary)", fontWeight: "600", fontSize: "0.85rem" }}>
              <FaSpinner className="sd-spin" size={13} /> Đang tải thông tin...
            </span>
          ) : displayedRestaurantName ? (
            <strong style={{ color: "var(--sd-text-primary)", fontWeight: "700" }}>
              {displayedRestaurantName}
            </strong>
          ) : restaurantInfo.error ? (
            <span style={{ color: "var(--sd-danger)", fontSize: "0.82rem", fontWeight: "500" }}>
              {restaurantInfo.error}
            </span>
          ) : cartItems.length > 0 ? (
            <strong style={{ color: "var(--sd-text-primary)", fontWeight: "700" }}>
              Nhà hàng đối tác SkyDish
            </strong>
          ) : (
            <span style={{ color: "var(--sd-text-muted)" }}>Chưa có món trong giỏ</span>
          )}
        </div>
        {restaurantInfo.error && !placedOrder && (
          <p role="alert" style={{ margin: "-0.65rem 0 1rem", color: "var(--sd-danger)", fontSize: "0.8rem" }}>
            {restaurantInfo.error}
          </p>
        )}

        {/* Structured Delivery Address Form */}
        <div className="checkout-address-section" style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", fontWeight: "700", color: "var(--sd-text-secondary)", marginBottom: "0.5rem" }}>
            <FaMapMarkerAlt style={{ color: "var(--sd-primary)" }} /> Địa chỉ giao hàng
          </label>
          {placedOrder ? (
            <p style={{ fontSize: "0.85rem", color: "var(--sd-text-primary)", margin: 0, padding: "0.6rem 0.75rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid var(--sd-border)" }}>
              {displayedAddress}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {addressDirectoryEnabled ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "600", color: "#64748b", marginBottom: "0.25rem" }}>Tỉnh / Thành phố *</label>
                      <select className="stripe-input-box" style={{ width: "100%", fontSize: "0.83rem" }} value={addrProvinceId} onChange={(e) => {
                        const province = ghnProvinces.find((item) => String(item.ProvinceID) === e.target.value);
                        setAddrProvinceId(e.target.value);
                        setAddrCity(province?.ProvinceName || "");
                        setAddrDistrictId("");
                        setAddrWardCode("");
                        setAddrDistrict("");
                        setAddrWard("");
                      }}>
                        <option value="">Chọn tỉnh / thành phố</option>
                        {ghnProvinces.map((province) => <option key={province.ProvinceID} value={province.ProvinceID}>{province.ProvinceName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "600", color: "#64748b", marginBottom: "0.25rem" }}>Quận / Huyện *</label>
                      <select className="stripe-input-box" style={{ width: "100%", fontSize: "0.83rem" }} value={addrDistrictId} disabled={!addrProvinceId} onChange={(e) => {
                        const district = ghnDistricts.find((item) => String(item.DistrictID) === e.target.value);
                        setAddrDistrictId(e.target.value);
                        setAddrDistrict(district?.DistrictName || "");
                        setAddrWardCode("");
                        setAddrWard("");
                      }}>
                        <option value="">Chọn quận / huyện</option>
                        {ghnDistricts.map((district) => <option key={district.DistrictID} value={district.DistrictID}>{district.DistrictName}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "600", color: "#64748b", marginBottom: "0.25rem" }}>Phường / Xã *</label>
                    <select className="stripe-input-box" style={{ width: "100%", fontSize: "0.83rem" }} value={addrWardCode} disabled={!addrDistrictId} onChange={(e) => {
                      const ward = ghnWards.find((item) => item.WardCode === e.target.value);
                      setAddrWardCode(e.target.value);
                      setAddrWard(ward?.WardName || "");
                    }}>
                      <option value="">Chọn phường / xã</option>
                      {ghnWards.map((ward) => <option key={ward.WardCode} value={ward.WardCode}>{ward.WardName}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "600", color: "#64748b", marginBottom: "0.25rem" }}>Tỉnh / Thành phố *</label>
                    <input type="text" className="stripe-input-box" style={{ width: "100%", fontSize: "0.83rem" }} placeholder="VD: Hà Nội" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "600", color: "#64748b", marginBottom: "0.25rem" }}>Quận / Huyện *</label>
                    <input type="text" className="stripe-input-box" style={{ width: "100%", fontSize: "0.83rem" }} placeholder="VD: Hoàn Kiếm" value={addrDistrict} onChange={(e) => setAddrDistrict(e.target.value)} />
                  </div>
                </div>
              )}
              {!addressDirectoryEnabled && (
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "600", color: "#64748b", marginBottom: "0.25rem" }}>Phường / Xã</label>
                  <input type="text" className="stripe-input-box" style={{ width: "100%", fontSize: "0.83rem" }} placeholder="VD: Phường Tràng Tiền" value={addrWard} onChange={(e) => setAddrWard(e.target.value)} />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: "600", color: "#64748b", marginBottom: "0.25rem" }}>Địa chỉ chi tiết (số nhà, tên đường) *</label>
                <input
                  type="text"
                  className="stripe-input-box"
                  style={{ width: "100%", fontSize: "0.83rem" }}
                  placeholder="VD: 11B Tràng Tiền"
                  value={addrDetail}
                  onChange={(e) => setAddrDetail(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#334155" }}>Vị trí giao hàng trên bản đồ</span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locationLoading}
                  style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#334155", padding: "0.45rem 0.65rem", fontSize: "0.78rem", fontWeight: "700", cursor: locationLoading ? "wait" : "pointer" }}
                >
                  <FaMapMarkerAlt style={{ marginRight: "0.35rem", color: "#e94b24" }} />
                  {locationLoading ? "Đang lấy vị trí..." : "Lấy vị trí hiện tại"}
                </button>
              </div>
              <DeliveryLocationPicker
                position={deliveryPosition}
                restaurantPosition={
                  hasCoordinate(restaurantInfo.latitude) && hasCoordinate(restaurantInfo.longitude)
                    ? { latitude: Number(restaurantInfo.latitude), longitude: Number(restaurantInfo.longitude) }
                    : null
                }
                onChange={(position) => {
                  setDeliveryPosition(position);
                  setLocationError("");
                }}
              />
              {hasDistanceBasedShipping ? (
                <p style={{ fontSize: "0.78rem", color: "#334155", margin: 0 }}>
                  Khoảng cách đường chim bay đến <strong>{effectiveRestaurantName || "nhà hàng"}</strong>:{" "}
                  <strong style={{ color: "#e94b24" }}>{deliveryDistanceKm.toFixed(1)} km</strong>. Chạm vào bản đồ để đổi vị trí giao hàng và cập nhật khoảng cách.
                </p>
              ) : (
                <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
                  {!deliveryPosition
                    ? "Chọn vị trí hiện tại hoặc chạm vào bản đồ để xem khoảng cách đến nhà hàng."
                    : "Nhà hàng chưa có tọa độ bản đồ nên chưa thể tính khoảng cách."}
                </p>
              )}
              {locationError && (
                <p role="alert" style={{ fontSize: "0.72rem", color: "#b91c1c", margin: 0 }}>
                  {locationError}
                </p>
              )}
              {deliveryPosition ? (
                <p style={{ fontSize: "0.72rem", color: "#047857", margin: 0 }}>
                  Đã ghim: {deliveryPosition.latitude.toFixed(6)}, {deliveryPosition.longitude.toFixed(6)}
                </p>
              ) : !locationError && (
                <p style={{ fontSize: "0.72rem", color: "#64748b", margin: 0 }}>
                  Cho phép truy cập vị trí hoặc chạm lên bản đồ để ghim điểm giao.
                </p>
              )}
              {deliveryAddress && (
                <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.1rem 0 0 0" }}>
                  ↳ <em>{deliveryAddress}</em>
                </p>
              )}
              {ghnEnabled && (
                <p style={{ fontSize: "0.75rem", color: ghnQuoteError ? "#b91c1c" : "#64748b", margin: 0 }}>
                  {ghnQuoteLoading ? "Đang lấy báo giá GHN..." : ghnQuoteError || (ghnQuoteKey === currentGhnQuoteKey && ghnQuote !== null ? `Cước GHN: ${formatCurrency(ghnQuote)}` : "Chọn đầy đủ địa chỉ để xem cước GHN.")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="checkout-items-list" style={{ maxHeight: "240px", overflowY: "auto", marginBottom: "1.25rem", borderBottom: "1px solid var(--sd-border)", paddingBottom: "0.75rem" }}>
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
          <div className="checkout-coupon-box" style={{ marginBottom: "1.25rem" }}>
            <div className="checkout-coupon-heading">
              <span className="checkout-coupon-title"><FaTicketAlt /> Voucher giảm giá</span>
              <button type="button" className="checkout-coupon-picker" onClick={handleOpenCouponModal} disabled={!!appliedCoupon}>
                Chọn voucher <span aria-hidden="true">›</span>
              </button>
            </div>

            <div className="checkout-coupon-entry">
              <input
                type="text"
                placeholder="Nhập mã voucher"
                value={couponCode}
                disabled={!!appliedCoupon}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                aria-label="Mã voucher"
              />
              {appliedCoupon ? (
                <button type="button" className="checkout-coupon-remove" onClick={handleRemoveCoupon}>Hủy mã</button>
              ) : (
                <button type="button" className="checkout-coupon-apply" onClick={handleApplyCoupon} disabled={couponLoading}>
                  {couponLoading ? "Đang kiểm tra" : "Áp dụng"}
                </button>
              )}
            </div>

            {appliedCoupon && (
              <div className="checkout-coupon-applied"><FaCheckCircle /> Đã áp dụng {appliedCoupon.code}</div>
            )}
            {couponFeedback.message && (
              <p className={`checkout-coupon-feedback ${couponFeedback.type === "success" ? "is-success" : "is-error"}`}>
                {couponFeedback.message}
              </p>
            )}

            {couponModalOpen && (
              <div className="checkout-voucher-modal-backdrop" role="presentation" onClick={() => setCouponModalOpen(false)}>
                <section className="checkout-voucher-modal" role="dialog" aria-modal="true" aria-labelledby="voucher-modal-title" onClick={(e) => e.stopPropagation()}>
                  <div className="checkout-voucher-modal-header">
                    <div>
                      <span className="checkout-voucher-kicker">Ưu đãi dành cho bạn</span>
                      <h3 id="voucher-modal-title">Chọn voucher</h3>
                    </div>
                    <button type="button" className="checkout-voucher-close" onClick={() => setCouponModalOpen(false)} aria-label="Đóng danh sách voucher">
                      <FaTimes />
                    </button>
                  </div>

                  {couponListLoading ? (
                    <div className="checkout-voucher-empty">Đang tải voucher...</div>
                  ) : availableCoupons.length === 0 ? (
                    <div className="checkout-voucher-empty">Hiện chưa có voucher phù hợp cho nhà hàng này.</div>
                  ) : (
                    <div className="checkout-voucher-list">
                      {availableCoupons.map((coupon) => (
                        <article className="checkout-voucher-card" key={coupon._id || coupon.code}>
                          <div className="checkout-voucher-icon"><FaTicketAlt /></div>
                          <div className="checkout-voucher-content">
                            <div className="checkout-voucher-code-row">
                              <strong>{coupon.code}</strong>
                              <span>{coupon.restaurantId === "PLATFORM" ? "Toàn sàn" : "Voucher quán"}</span>
                            </div>
                            <h4>{couponDiscountLabel(coupon)}</h4>
                            <p>{coupon.description || "Ưu đãi đặc biệt cho đơn hàng của bạn"}</p>
                            <small>Đơn tối thiểu {formatCurrency(coupon.minOrderValue || 0)} · {couponExpiryLabel(coupon.endAt)}</small>
                          </div>
                          <button type="button" className="checkout-voucher-use" onClick={() => handleSelectCoupon(coupon)} disabled={couponLoading}>
                            Dùng ngay
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}

        {/* Price Breakdown */}
        <div className="checkout-price-breakdown" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem", color: "var(--sd-text-secondary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tạm tính</span>
            <span>{formatCurrency(displayedSubtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Phí giao hàng</span>
            <span>{formatCurrency(displayedDeliveryFee)}</span>
          </div>
          {!placedOrder && deliveryPosition && (hasDistanceBasedShipping ? (
            <small style={{ color: "var(--sd-text-muted)" }}>
              Ước tính {deliveryDistanceKm.toFixed(1)} km từ {effectiveRestaurantName || "nhà hàng"}.
            </small>
          ) : (
            <small style={{ color: "#b45309" }}>
              Chưa tính được theo km vì nhà hàng chưa có tọa độ; đang dùng phí mặc định.
            </small>
          ))}
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

        {/* Order history link only shown after order is placed (see placedOrder view above) */}
      </div>
    </div>
  );
};

export default function Checkout() {
  return (
    <div className="checkout-experience" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />
      <main className="checkout-page-wrapper">
        <div className="sd-container">
          <div className="checkout-breadcrumb" style={{ marginBottom: "1.5rem" }}>
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

          <CheckoutForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
