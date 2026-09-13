import { io } from '../frontend/node_modules/socket.io-client/build/esm/index.js';

const PUBLIC_BASE_URL = process.env.PUBLIC_URL || 'https://nonobstructive-helena-unstacked.ngrok-free.dev';

async function runPublicProductionVerification() {
  console.log('====================================================');
  console.log('🌐 SKYDISH CLOUD DEPLOYMENT — PUBLIC PRODUCTION VERIFICATION');
  console.log(`🎯 Target URL: ${PUBLIC_BASE_URL}`);
  console.log('====================================================\n');

  const checklist = [];
  function record(category, testName, pass, details = '') {
    checklist.push({ category, testName, pass, details });
    console.log(`[${category}] ${pass ? '✅ PASS' : '❌ FAIL'}: ${testName} ${details ? `(${details})` : ''}`);
  }

  const commonHeaders = {
    'ngrok-skip-browser-warning': '1',
    'Content-Type': 'application/json'
  };

  // 1. PUBLIC HTTPS & TLS
  console.log('\n--- Phase 10 & 12: Public TLS & Static Asset Serving ---');
  try {
    const t0 = Date.now();
    const spaRes = await fetch(`${PUBLIC_BASE_URL}/`, { headers: commonHeaders });
    const spaHtml = await spaRes.text();
    const spaLatency = Date.now() - t0;
    const isSpaValid = spaRes.status === 200 && spaHtml.includes('<div id="root">') && spaHtml.toLowerCase().includes('<!doctype html>');
    record('TLS/Gateway', 'Public HTTPS Gateway & React SPA Root', isSpaValid, `HTTP ${spaRes.status}, ${spaLatency}ms, size=${spaHtml.length}`);
  } catch (err) {
    record('TLS/Gateway', 'Public HTTPS Gateway & React SPA Root', false, err.message);
  }

  // 2. LIVE HEALTH MATRIX
  console.log('\n--- Phase 13: Live Microservices Health Matrix (Reverse Proxy) ---');
  const healthEndpoints = [
    { service: 'auth-service', path: '/api/auth/health' },
    { service: 'restaurant-service', path: '/api/restaurant/health' },
    { service: 'order-service', path: '/api/orders/health' },
    { service: 'delivery-service', path: '/api/delivery/health' },
    { service: 'payment-service', path: '/api/payment/health' }
  ];

  for (const ep of healthEndpoints) {
    try {
      const t0 = Date.now();
      const res = await fetch(`${PUBLIC_BASE_URL}${ep.path}`, { headers: commonHeaders });
      const lat = Date.now() - t0;
      const data = await res.json();
      const isOk = res.status === 200 && data.status === 'ok' && data.service === ep.service;
      record('Health Matrix', `Health Check: ${ep.service}`, isOk, `HTTP ${res.status}, ${lat}ms, ts=${data.timestamp}`);
    } catch (err) {
      record('Health Matrix', `Health Check: ${ep.service}`, false, err.message);
    }
  }

  // 3. LIVE CUSTOMER AUTH & RBAC
  console.log('\n--- Phase 14: Live Auth & RBAC (Customer & Driver) ---');
  const customerEmail = `pub_cust_${Date.now()}@skydish.vn`;
  const customerPassword = 'Password123!';
  let customerToken = null;
  let customerProfile = null;

  try {
    const regRes = await fetch(`${PUBLIC_BASE_URL}/api/auth/register/customer`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({
        firstName: 'Tran',
        lastName: 'Van Public',
        email: customerEmail,
        password: customerPassword,
        phone: '0912345678'
      })
    });
    const regData = await regRes.json();
    customerToken = regData.token;
    customerProfile = regData.data?.customer || regData.customer;
    record('Auth & RBAC', 'Customer Registration over Public HTTPS', regRes.status === 201 && !!customerToken, `HTTP ${regRes.status}, id=${customerProfile?.id}`);

    // Customer Login
    const loginRes = await fetch(`${PUBLIC_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ email: customerEmail, password: customerPassword })
    });
    const loginData = await loginRes.json();
    customerToken = loginData.token || customerToken;
    record('Auth & RBAC', 'Customer Login & JWT Issuance', loginRes.status === 200 && !!customerToken, `JWT length=${customerToken?.length}`);

    // Customer Protected Profile
    const profRes = await fetch(`${PUBLIC_BASE_URL}/api/auth/customer/profile`, {
      headers: { ...commonHeaders, 'Authorization': `Bearer ${customerToken}` }
    });
    const profData = await profRes.json();
    const fetchedEmail = profData.data?.customer?.email || profData.customer?.email;
    record('Auth & RBAC', 'Customer Profile Access with Bearer Token', profRes.status === 200 && fetchedEmail === customerEmail, `email=${fetchedEmail}`);

    // RBAC Security: Reject without token
    const unauthRes = await fetch(`${PUBLIC_BASE_URL}/api/auth/customer/profile`, { headers: commonHeaders });
    record('Security', 'Unauthorized Rejection without JWT', unauthRes.status === 401, `HTTP ${unauthRes.status}`);
  } catch (err) {
    record('Auth & RBAC', 'Customer Auth Flow', false, err.message);
  }

  // Driver Auth
  const driverEmail = `pub_driver_${Date.now()}@skydish.vn`;
  const driverPassword = 'DriverPassword123!';
  let driverToken = null;
  let driverId = null;

  try {
    const dRegRes = await fetch(`${PUBLIC_BASE_URL}/api/delivery/auth/register`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({
        name: 'Nguyen Van Shipper Public',
        email: driverEmail,
        password: driverPassword,
        phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
        vehicleType: 'bike',
        vehicleNumber: `29A-${Math.floor(10000 + Math.random() * 90000)}`
      })
    });
    const dRegData = await dRegRes.json();
    driverToken = dRegData.token;
    driverId = dRegData.data?.id;
    record('Auth & RBAC', 'Driver Registration over Public HTTPS', dRegRes.status === 201 && !!driverToken, `driverId=${driverId}`);

    // Driver Login
    const dLoginRes = await fetch(`${PUBLIC_BASE_URL}/api/delivery/auth/login`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ email: driverEmail, password: driverPassword })
    });
    const dLoginData = await dLoginRes.json();
    driverToken = dLoginData.token || driverToken;
    record('Auth & RBAC', 'Driver Login & JWT Issuance', dLoginRes.status === 200 && !!driverToken, `token length=${driverToken?.length}`);

    // Driver Protected Profile
    const dProfRes = await fetch(`${PUBLIC_BASE_URL}/api/delivery/auth/profile`, {
      headers: { ...commonHeaders, 'Authorization': `Bearer ${driverToken}` }
    });
    const dProfData = await dProfRes.json();
    record('Auth & RBAC', 'Driver Profile Access with Token', dProfRes.status === 200 && !!dProfData.data?.name, `driverName=${dProfData.data?.name}`);
  } catch (err) {
    record('Auth & RBAC', 'Driver Auth Flow', false, err.message);
  }

  // 4. LIVE RESTAURANT CATALOG & MENUS
  console.log('\n--- Phase 15: Catalog Discovery over Public HTTPS ---');
  let selectedRestaurant = null;
  let selectedDish = null;

  try {
    const restRes = await fetch(`${PUBLIC_BASE_URL}/api/restaurant`, { headers: commonHeaders });
    const restList = await restRes.json();
    selectedRestaurant = restList[0];
    record('Catalog', 'Public Restaurant Directory Discovery', restRes.status === 200 && restList.length > 0, `Total restaurants=${restList.length}, sample="${selectedRestaurant?.name}"`);

    const foodRes = await fetch(`${PUBLIC_BASE_URL}/api/food-items/restaurant/${selectedRestaurant._id}`, { headers: commonHeaders });
    const foodList = await foodRes.json();
    selectedDish = foodList[0];
    record('Catalog', 'Public Restaurant Menu Retrieval', foodRes.status === 200 && foodList.length > 0, `Total dishes=${foodList.length}, item="${selectedDish?.name}" @ ${selectedDish?.price} VND`);
  } catch (err) {
    record('Catalog', 'Catalog Discovery', false, err.message);
  }

  // 5. LIVE PRICING AUTHORITY & COD REGRESSION AUDIT
  console.log('\n--- Phase 16: Live Pricing Authority Regression Audit ---');
  let publicOrder = null;
  try {
    const qty = 2;
    const itemOfficialPrice = Number(selectedDish.price);
    const expectedSubtotal = itemOfficialPrice * qty;
    const expectedDeliveryFee = expectedSubtotal >= 300000 ? 0 : 15000;
    const expectedDiscount = 0;
    const expectedTotal = expectedSubtotal + expectedDeliveryFee - expectedDiscount;

    console.log(`   Official DB price: ${itemOfficialPrice} VND x ${qty} = ${expectedSubtotal} VND`);
    console.log(`   Sending malicious client request with manipulated price: 1 VND`);

    const orderRes = await fetch(`${PUBLIC_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        customerId: customerProfile?.id,
        customerName: customerProfile?.name || 'Tran Van Public',
        customerEmail: customerEmail,
        phone: '0912345678',
        restaurantId: selectedRestaurant._id,
        items: [
          {
            foodId: selectedDish._id,
            name: selectedDish.name,
            quantity: qty,
            price: 1 // Malicious price tampering attempt
          }
        ],
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        deliveryAddress: '456 Le Duan, Ben Nghe, District 1, Ho Chi Minh City'
      })
    });

    publicOrder = await orderRes.json();
    const subtotalMatch = publicOrder.subtotal === expectedSubtotal;
    const deliveryFeeMatch = publicOrder.deliveryFee === expectedDeliveryFee;
    const discountMatch = publicOrder.discount === expectedDiscount;
    const totalMatch = publicOrder.totalPrice === expectedTotal;
    const isAuthoritative = subtotalMatch && deliveryFeeMatch && discountMatch && totalMatch;

    record('Pricing Authority', 'Server Price Recalculation (Anti-Tampering)', isAuthoritative, `Subtotal: ${publicOrder.subtotal} VND, Total: ${publicOrder.totalPrice} VND (Expected: ${expectedTotal} VND)`);
    record('Pricing Authority', 'Delivery Fee Integrity & Rule Preservation', deliveryFeeMatch, `Fee: ${publicOrder.deliveryFee} VND`);
    record('Pricing Authority', 'COD Zero Mutation Guarantee', isAuthoritative && publicOrder.paymentMethod === 'COD', `paymentMethod=${publicOrder.paymentMethod}, status=${publicOrder.paymentStatus}`);
  } catch (err) {
    record('Pricing Authority', 'Pricing Regression Audit', false, err.message);
  }

  // 6. LIVE PAYMENT INTEGRATION
  console.log('\n--- Phase 17: Live Payment Gateway Execution ---');
  try {
    // COD Process
    const codRes = await fetch(`${PUBLIC_BASE_URL}/api/payment/cod/process`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        orderId: publicOrder._id,
        amount: publicOrder.totalPrice,
        currency: 'vnd',
        phone: '0912345678',
        email: customerEmail
      })
    });
    const codData = await codRes.json();
    record('Payment Gateways', 'COD Order Processing over Public HTTPS', codRes.status === 200 && codData.paymentMethod === 'COD', `paymentId=${codData.paymentId}`);

    // VietQR Bank Transfer
    const qrRes = await fetch(`${PUBLIC_BASE_URL}/api/payment/bank-transfer/create`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        orderId: `ORD_PUB_QR_${Date.now()}`,
        amount: 150000,
        currency: 'vnd',
        phone: '0912345678',
        email: customerEmail
      })
    });
    const qrData = await qrRes.json();
    record('Payment Gateways', 'VietQR Dynamic Banking Code Generation', qrRes.status === 200 && !!qrData.qrUrl, `Bank=${qrData.bankDetails?.bankName}, Code=${qrData.bankDetails?.bankCode}`);

    // VNPay Payment URL
    const vnpayRes = await fetch(`${PUBLIC_BASE_URL}/api/payment/vnpay/create`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        orderId: `ORD_PUB_VNP_${Date.now()}`,
        amount: 200000,
        orderInfo: 'Thanh toan don hang SkyDish public live'
      })
    });
    const vnpayData = await vnpayRes.json();
    record('Payment Gateways', 'VNPay Sandbox Gateway URL Generation', vnpayRes.status === 200 && !!vnpayData.paymentUrl, `URL starts with: ${vnpayData.paymentUrl?.slice(0, 40)}...`);

    // MoMo Payment URL
    const momoRes = await fetch(`${PUBLIC_BASE_URL}/api/payment/momo/create`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        orderId: `ORD_PUB_MOMO_${Date.now()}`,
        amount: 120000,
        orderInfo: 'Thanh toan don hang MoMo public live'
      })
    });
    const momoData = await momoRes.json();
    record('Payment Gateways', 'MoMo Sandbox Gateway URL Generation', momoRes.status === 200 && (!!momoData.payUrl || !!momoData.qrCodeUrl), `payUrl=${momoData.payUrl ? 'generated' : 'fallback-ok'}`);
  } catch (err) {
    record('Payment Gateways', 'Payment Gateway Integration', false, err.message);
  }

  // 7. LIVE DELIVERY TRACKING & ASSIGNMENT
  console.log('\n--- Phase 18: Live Delivery Task Lifecycle ---');
  let publicDelivery = null;
  try {
    const delvRes = await fetch(`${PUBLIC_BASE_URL}/api/delivery/create`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        orderId: publicOrder._id,
        customerId: customerProfile?.id || 'cust_pub_1',
        driverId: driverId,
        pickupAddress: selectedRestaurant.location || 'Pizza 4Ps Trang Tien, Hanoi',
        deliveryAddress: publicOrder.deliveryAddress
      })
    });
    const delvData = await delvRes.json();
    publicDelivery = delvData.delivery;
    record('Delivery Flow', 'Delivery Task Creation for Order', delvRes.status === 201 && !!publicDelivery?._id, `deliveryId=${publicDelivery?._id}, status=${publicDelivery?.status}`);

    // Driver Status Update (To be delivered -> Picked-up)
    const updateRes = await fetch(`${PUBLIC_BASE_URL}/api/delivery/${publicDelivery._id}/status`, {
      method: 'PUT',
      headers: { ...commonHeaders, 'Authorization': `Bearer ${driverToken}` },
      body: JSON.stringify({
        status: 'Picked-up'
      })
    });
    const updateData = await updateRes.json();
    record('Delivery Flow', 'Driver Status Transition: Picked-up', updateRes.status === 200 && updateData.delivery?.status === 'Picked-up', `newStatus=${updateData.delivery?.status}`);
  } catch (err) {
    record('Delivery Flow', 'Delivery Flow Lifecycle', false, err.message);
  }

  // 8. LIVE ENGAGEMENT & PROMOTIONS
  console.log('\n--- Phase 19: Live Engagement & Promotional Features ---');
  try {
    // Coupon Validation
    const couponRes = await fetch(`${PUBLIC_BASE_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ code: 'SKYDISH20K', orderAmount: 150000 })
    });
    const couponData = await couponRes.json();
    record('Engagement', 'Promotional Coupon Validation ("SKYDISH20K")', couponRes.status === 200 && couponData.valid === true, `Discount: ${couponData.discountAmount} VND, Type=${couponData.discountType}`);

    // Notification Feed
    const notifRes = await fetch(`${PUBLIC_BASE_URL}/api/notifications?userId=${customerProfile?.id}&role=customer`, { headers: commonHeaders });
    const notifData = await notifRes.json();
    record('Engagement', 'Customer Notification Stream Retrieval', notifRes.status === 200 && Array.isArray(notifData.notifications), `Notifications count=${notifData.notifications?.length}`);

    // Reviews Query
    const reviewRes = await fetch(`${PUBLIC_BASE_URL}/api/reviews/restaurant/${selectedRestaurant._id}`, { headers: commonHeaders });
    const reviewData = await reviewRes.json();
    record('Engagement', 'Restaurant Customer Reviews Retrieval', reviewRes.status === 200 && Array.isArray(reviewData.reviews), `Reviews count=${reviewData.reviews?.length}`);
  } catch (err) {
    record('Engagement', 'Engagement Features', false, err.message);
  }

  // 9. LIVE REALTIME SOCKET.IO / WSS
  console.log('\n--- Phase 11: Realtime WebSockets over Public HTTPS ---');
  try {
    // Order Service WebSocket
    const orderSocket = io(PUBLIC_BASE_URL, {
      extraHeaders: { 'ngrok-skip-browser-warning': '1' },
      transports: ['websocket', 'polling'],
      timeout: 6000
    });

    const orderWsSuccess = await new Promise((resolve) => {
      orderSocket.on('connect', () => {
        const id = orderSocket.id;
        orderSocket.disconnect();
        resolve({ pass: true, id });
      });
      orderSocket.on('connect_error', (err) => resolve({ pass: false, error: err.message }));
      setTimeout(() => { orderSocket.disconnect(); resolve({ pass: false, error: 'Timeout' }); }, 6000);
    });
    record('Realtime / WSS', 'Order Service Realtime Channel (/socket.io/)', orderWsSuccess.pass, `Socket ID: ${orderWsSuccess.id || orderWsSuccess.error}`);

    // Delivery Service WebSocket
    const delvSocket = io(PUBLIC_BASE_URL, {
      path: '/delivery-socket.io',
      extraHeaders: { 'ngrok-skip-browser-warning': '1' },
      transports: ['websocket', 'polling'],
      timeout: 6000
    });

    const delvWsSuccess = await new Promise((resolve) => {
      delvSocket.on('connect', () => {
        const id = delvSocket.id;
        delvSocket.disconnect();
        resolve({ pass: true, id });
      });
      delvSocket.on('connect_error', (err) => resolve({ pass: false, error: err.message }));
      setTimeout(() => { delvSocket.disconnect(); resolve({ pass: false, error: 'Timeout' }); }, 6000);
    });
    record('Realtime / WSS', 'Delivery Service Realtime Channel (/delivery-socket.io/)', delvWsSuccess.pass, `Socket ID: ${delvWsSuccess.id || delvWsSuccess.error}`);
  } catch (err) {
    record('Realtime / WSS', 'WebSocket Verification', false, err.message);
  }

  // 10. PERFORMANCE & LATENCY BASELINE
  console.log('\n--- Phase 22: Performance & Latency Baseline ---');
  const latencies = [];
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    await fetch(`${PUBLIC_BASE_URL}/api/restaurant`, { headers: commonHeaders });
    latencies.push(Date.now() - t0);
  }
  const avgLat = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLat = Math.min(...latencies);
  const maxLat = Math.max(...latencies);
  record('Performance', 'Public Network Roundtrip Latency (5 runs)', avgLat < 2000, `Min=${minLat}ms, Avg=${avgLat}ms, Max=${maxLat}ms`);

  // SUMMARY
  console.log('\n====================================================');
  console.log('📊 FINAL PUBLIC PRODUCTION VERIFICATION SUMMARY');
  console.log('====================================================');
  const total = checklist.length;
  const passed = checklist.filter(c => c.pass).length;
  const failed = total - passed;

  console.log(`Total Checks: ${total}`);
  console.log(`Passed Checks: ${passed}`);
  console.log(`Failed Checks: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
  console.log(`Target Public Domain: ${PUBLIC_BASE_URL}`);
  console.log(`Overall Gate Status: ${failed === 0 ? '🟢 100% PASS — PRODUCTION LIVE' : '🔴 FAIL'}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPublicProductionVerification().catch(err => {
  console.error('Fatal public verification error:', err);
  process.exit(1);
});
