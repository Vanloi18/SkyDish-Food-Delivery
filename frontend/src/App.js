import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { GoogleOAuthProvider } from "@react-oauth/google";

// ============================================================
// CONTEXTS
// ============================================================

import { CartProvider } from "./pages/contexts/CartContext";

// ============================================================
// COMMON PAGES
// ============================================================

import Home from "./pages/Home";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ContactAndFeedback from "./pages/ContactAndFeedback";

// ============================================================
// CUSTOMER & AUTH
// ============================================================

import AuthLogin from "./pages/auth/AuthLogin";
import AuthRegister from "./pages/auth/AuthRegister";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyOTP from "./pages/auth/VerifyOTP";
import ResetPassword from "./pages/auth/ResetPassword";
import CustomerProfile from "./pages/auth/CustomerProfile";

import CustomerGuard from "./layouts/CustomerLayout/CustomerGuard";

import CustomerHome from "./pages/customer/customerHome";
import FoodItemList from "./pages/customer/foodItemList";
import AddToCartPage from "./pages/customer/AddToCartPage";

// ============================================================
// PAYMENT
// ============================================================

import Checkout from "./pages/payment/Checkout";
import VNPayCallback from "./pages/payment/VNPayCallback";
import MoMoCallback from "./pages/payment/MoMoCallback";

// ============================================================
// ORDER MANAGEMENT
// ============================================================

import OrderHome from "./pages/orderManagement/OrderHome";
import OrderForm from "./components/OrderForm";
import DeleteOrder from "./components/DeleteOrder";
import OrderDetails from "./components/OrderDetails";

// ============================================================
// RESTAURANT PARTNER
// ============================================================

import IndexPage from "./pages/restaurant/components/IndexPage";
import RestaurantLogin from "./pages/restaurant/components/RestaurantLogin";
import RestaurantRegister from "./pages/restaurant/components/RestaurantRegister";
import RestaurantDashboard from "./pages/restaurant/pages/RestaurantDashboard";

import RestaurantPartnerGuard from "./layouts/RestaurantPartnerLayout/RestaurantPartnerGuard";

// ============================================================
// DELIVERY PARTNER
// ============================================================

import DriverLogin from "./pages/delivery/DriverLogin";
import DriverRegister from "./pages/delivery/DriverRegister";
import DriverDashboard from "./pages/delivery/DriverDashboard";
import DeliveryDetails from "./pages/delivery/DeliveryDetails";
import DriverSimulator from "./pages/delivery/DriverSimulator";

// ============================================================
// SUPER ADMIN
// ============================================================

import SuperAdminLogin from "./pages/restaurant/components/SuperAdminLogin";
import SuperAdminRegister from "./pages/restaurant/components/SuperAdminRegister";
import AdminDashboard from "./pages/admin/AdminDashboard";

import AdminGuard from "./layouts/AdminLayout/AdminGuard";

// ============================================================
// TOAST
// ============================================================

import { ToastProvider } from "./components/common";

// ============================================================
// GOOGLE OAUTH
// ============================================================
//
// Tạo file:
// frontend/.env
//
// Nội dung:
//
// REACT_APP_GOOGLE_CLIENT_ID=CLIENT_ID_THAT_CUA_BAN
//
// Sau khi sửa .env phải restart npm start.
//
// ============================================================

const GOOGLE_CLIENT_ID =
  process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <CartProvider>
          <Router>
            <Routes>

              {/* =====================================================
                  COMMON
              ===================================================== */}

              <Route
                path="/"
                element={<Home />}
              />

              <Route
                path="/about"
                element={<About />}
              />

              <Route
                path="/privacy"
                element={<PrivacyPolicy />}
              />

              <Route
                path="/contact"
                element={<ContactAndFeedback />}
              />

              {/* =====================================================
                  CUSTOMER AUTHENTICATION
              ===================================================== */}

              {/* Login */}
              <Route
                path="/auth/login"
                element={<AuthLogin />}
              />

              {/* Old login URL -> new login */}
              <Route
                path="/customer/login"
                element={
                  <Navigate
                    to="/auth/login"
                    replace
                  />
                }
              />

              {/* Register */}
              <Route
                path="/auth/register"
                element={<AuthRegister />}
              />

              {/* Forgot Password */}
              <Route
                path="/auth/forgot-password"
                element={<ForgotPassword />}
              />

              {/* Verify OTP */}
              <Route
                path="/auth/verify-otp"
                element={<VerifyOTP />}
              />

              {/* Reset Password */}
              <Route
                path="/auth/reset-password"
                element={<ResetPassword />}
              />

              {/* =====================================================
                  CUSTOMER PROFILE
              ===================================================== */}

              <Route
                path="/customer/profile"
                element={
                  <CustomerGuard>
                    <CustomerProfile />
                  </CustomerGuard>
                }
              />

              {/* =====================================================
                  CUSTOMER HOME / RESTAURANT / FOOD
              ===================================================== */}

              <Route
                path="/customer/home"
                element={<CustomerHome />}
              />

              <Route
                path="/restaurants"
                element={<CustomerHome />}
              />

              <Route
                path="/customer/restaurant/:restaurantId/foods"
                element={<FoodItemList />}
              />

              {/* =====================================================
                  CART
              ===================================================== */}

              <Route
                path="/customer/cart"
                element={<AddToCartPage />}
              />

              <Route
                path="/cart"
                element={<AddToCartPage />}
              />

              {/* =====================================================
                  PAYMENT
              ===================================================== */}

              <Route
                path="/checkout"
                element={
                  <CustomerGuard>
                    <Checkout />
                  </CustomerGuard>
                }
              />

              <Route
                path="/payment/vnpay/callback"
                element={<VNPayCallback />}
              />
              <Route
                path="/payment/vnpay/return"
                element={<VNPayCallback />}
              />

              <Route
                path="/payment/momo/callback"
                element={<MoMoCallback />}
              />

              {/* =====================================================
                  ORDER MANAGEMENT
              ===================================================== */}

              <Route
                path="/orders"
                element={
                  <CustomerGuard>
                    <OrderHome />
                  </CustomerGuard>
                }
              />

              <Route
                path="/orders/new"
                element={
                  <CustomerGuard>
                    <OrderForm />
                  </CustomerGuard>
                }
              />

              <Route
                path="/orders/edit/:id"
                element={
                  <Navigate to="/orders" replace />
                }
              />

              <Route
                path="/orders/delete/:id"
                element={
                  <CustomerGuard>
                    <DeleteOrder />
                  </CustomerGuard>
                }
              />

              <Route
                path="/orders/details/:id"
                element={
                  <CustomerGuard>
                    <OrderDetails />
                  </CustomerGuard>
                }
              />

              {/* =====================================================
                  RESTAURANT PARTNER
              ===================================================== */}

              <Route
                path="/restaurant/home"
                element={<IndexPage />}
              />

              <Route
                path="/restaurant/login"
                element={<RestaurantLogin />}
              />

              <Route
                path="/restaurant/register"
                element={<RestaurantRegister />}
              />

              <Route
                path="/restaurant/dashboard"
                element={
                  <RestaurantPartnerGuard>
                    <RestaurantDashboard />
                  </RestaurantPartnerGuard>
                }
              />

              <Route
                path="/restaurant/orders"
                element={
                  <RestaurantPartnerGuard>
                    <RestaurantDashboard />
                  </RestaurantPartnerGuard>
                }
              />

              <Route
                path="/restaurant/menu"
                element={
                  <RestaurantPartnerGuard>
                    <RestaurantDashboard />
                  </RestaurantPartnerGuard>
                }
              />

              <Route
                path="/restaurant/profile"
                element={
                  <RestaurantPartnerGuard>
                    <RestaurantDashboard />
                  </RestaurantPartnerGuard>
                }
              />

              <Route
                path="/restaurant/reviews"
                element={
                  <RestaurantPartnerGuard>
                    <RestaurantDashboard />
                  </RestaurantPartnerGuard>
                }
              />

              <Route
                path="/restaurant/promotions"
                element={
                  <RestaurantPartnerGuard>
                    <RestaurantDashboard />
                  </RestaurantPartnerGuard>
                }
              />

              <Route
                path="/restaurant/analytics"
                element={
                  <RestaurantPartnerGuard>
                    <RestaurantDashboard />
                  </RestaurantPartnerGuard>
                }
              />

              <Route
                path="/restaurant/notifications"
                element={
                  <RestaurantPartnerGuard>
                    <RestaurantDashboard />
                  </RestaurantPartnerGuard>
                }
              />

              {/* =====================================================
                  DELIVERY PARTNER
              ===================================================== */}

              <Route
                path="/delivery/login"
                element={<DriverLogin />}
              />

              <Route
                path="/delivery/register"
                element={<DriverRegister />}
              />

              <Route
                path="/signup-delivery"
                element={<DriverRegister />}
              />

              <Route
                path="/delivery/dashboard"
                element={<DriverDashboard />}
              />

              <Route
                path="/delivery/details/:id"
                element={<DeliveryDetails />}
              />

              <Route
                path="/delivery/simulator"
                element={<DriverSimulator />}
              />

              {/* =====================================================
                  SUPER ADMIN
              ===================================================== */}

              <Route
                path="/superadmin/login"
                element={<SuperAdminLogin />}
              />

              <Route
                path="/superadmin/register"
                element={<SuperAdminRegister />}
              />

              <Route
                path="/superadmin/dashboard"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/users"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/restaurants"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/foods"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/orders"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/payments"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/shippers"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/delivery"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/reports"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/audit-logs"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/settings"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              <Route
                path="/superadmin/profile"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              {/* Compatibility URL */}
              <Route
                path="/super-admin/dashboard"
                element={
                  <AdminGuard>
                    <AdminDashboard />
                  </AdminGuard>
                }
              />

              {/* /superadmin -> dashboard */}
              <Route
                path="/superadmin"
                element={
                  <Navigate
                    to="/superadmin/dashboard"
                    replace
                  />
                }
              />

              {/* =====================================================
                  FALLBACK
              ===================================================== */}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />

            </Routes>
          </Router>
        </CartProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
}

export default App;