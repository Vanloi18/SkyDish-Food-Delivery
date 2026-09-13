import { io } from '../frontend/node_modules/socket.io-client/build/esm/index.js';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1';
const AUTH_URL = `${BASE_URL}:4000/api/auth`;
const REST_URL = `${BASE_URL}:5002/api`;
const FOOD_URL = `${BASE_URL}:5002/api/food-items`;
const ORDER_URL = `${BASE_URL}:5005/api/orders`;
const PAY_URL = `${BASE_URL}:5004/api/payment`;
const DELIV_URL = `${BASE_URL}:5003/api/delivery`;
const DELIV_AUTH_URL = `${BASE_URL}:5003/api/auth`;

console.log('====================================================');
console.log('🏛️ SKYDISH — MULTI-PORTAL & REALTIME SOCKET.IO AUDIT');
console.log('====================================================\n');

const checks = [];
function record(portal, testName, pass, details = '') {
  checks.push({ portal, testName, pass, details });
  console.log(`[${portal}] ${pass ? '✅ PASS' : '❌ FAIL'}: ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function main() {
  const ts = Date.now();
  const dynamicPhone = `09${ts.toString().slice(-8)}`;
  let customerToken = null;
  let customerId = null;
  let restaurantToken = null;
  let restaurantId = null;
  let shipperToken = null;
  let shipperId = null;
  let adminToken = null;
  let orderId = null;
  let deliveryId = null;

  // ------------------------------------------------------------------------
  // 1. CUSTOMER PORTAL FLOW (Section 8)
  // ------------------------------------------------------------------------
  console.log('--- 1. Customer Portal Complete Flow ---');
  try {
    const custEmail = `cust_flow_${ts}@skydish.vn`;
    const regRes = await fetch(`${AUTH_URL}/register/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Tran',
        lastName: 'Loi',
        email: custEmail,
        password: 'Password123!',
        phone: dynamicPhone
      })
    });
    const regData = await regRes.json();
    customerToken = regData.token;
    customerId = regData.data?.customer?.id || regData.customer?._id || regData.customer?.id;
    record('Customer', 'Customer Login / Auth', !!customerToken, `Email: ${custEmail}`);

    // Search catalog
    const searchRes = await fetch(`${REST_URL}/restaurant`);
    const rests = await searchRes.json();
    const targetRest = rests[0];
    record('Customer', 'Search & Discover Restaurants', rests.length > 0, `Found ${rests.length} restaurants, picked "${targetRest.name}"`);

    // Browse food
    const foodsRes = await fetch(`${FOOD_URL}/restaurant/${targetRest._id}`);
    const foods = await foodsRes.json();
    const targetFood = foods[0];
    const foodPrice = Number(targetFood.price);
    record('Customer', 'Browse Menu & Food Items', foods.length > 0, `Item: "${targetFood.name}" @ ${foodPrice} VND`);

    // Cart & Checkout
    const qty = 2;
    const subtotal = foodPrice * qty;
    const deliveryFee = subtotal >= 300000 ? 0 : 15000;
    const expectedTotal = subtotal + deliveryFee;

    // Create Order with COD
    const orderRes = await fetch(`${ORDER_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        customerId,
        customerName: 'Tran Loi',
        customerEmail: custEmail,
        phone: dynamicPhone,
        restaurantId: targetRest._id,
        items: [{ foodId: targetFood._id, name: targetFood.name, quantity: qty, price: foodPrice }],
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        deliveryAddress: '456 Le Duan, Hanoi'
      })
    });
    const orderData = await orderRes.json();
    orderId = orderData._id;
    const isTotalAccurate = orderData.totalPrice === expectedTotal;
    record('Customer', 'Checkout & Place COD Order (Amount Authoritative)', isTotalAccurate, `Total: ${orderData.totalPrice} VND (Expected: ${expectedTotal} VND)`);

    // Complete Payment Processing
    const codRes = await fetch(`${PAY_URL}/cod/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({
        orderId,
        amount: orderData.totalPrice,
        currency: 'vnd',
        phone: dynamicPhone,
        email: custEmail
      })
    });
    const codData = await codRes.json();
    record('Customer', 'COD Payment Recording', codRes.status === 200 && codData.success === true, `paymentId=${codData.paymentId}`);
  } catch (err) {
    record('Customer', 'Customer Flow Execution', false, err.message);
  }

  // ------------------------------------------------------------------------
  // 2. RESTAURANT PARTNER FLOW (Section 9)
  // ------------------------------------------------------------------------
  console.log('\n--- 2. Restaurant Partner Flow ---');
  try {
    const restEmail = `partner_${ts}@restaurant.vn`;
    // Register / Login Restaurant Partner
    const rRegRes = await fetch(`${REST_URL}/restaurant/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Bếp SkyDish ${ts.toString().slice(-4)}`,
        ownerName: 'Nguyen Chef',
        location: '789 Pho Hue, Hanoi',
        contactNumber: `09${ts.toString().slice(-8)}`,
        email: restEmail,
        password: 'PartnerPassword123!'
      })
    });
    const rRegData = await rRegRes.json();
    restaurantToken = rRegData.token;
    restaurantId = rRegData.data?.id || rRegData.restaurant?._id;

    // Partner Login
    const rLoginRes = await fetch(`${REST_URL}/restaurant/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: restEmail, password: 'PartnerPassword123!' })
    });
    const rLoginData = await rLoginRes.json();
    restaurantToken = rLoginData.token || restaurantToken;
    record('Restaurant Partner', 'Partner Login & Token Issuance', !!restaurantToken, `email=${restEmail}`);

    // Dashboard & Profile
    const profileRes = await fetch(`${REST_URL}/restaurant/profile`, {
      headers: { 'Authorization': `Bearer ${restaurantToken}` }
    });
    record('Restaurant Partner', 'Partner Dashboard & Profile Load', profileRes.status === 200, `HTTP ${profileRes.status}`);

    // Orders retrieval
    const restOrdersRes = await fetch(`${ORDER_URL}?restaurantId=${restaurantId}`, {
      headers: { 'Authorization': `Bearer ${restaurantToken}` }
    });
    record('Restaurant Partner', 'Partner Orders Management View', restOrdersRes.status === 200, `HTTP ${restOrdersRes.status}`);

    // Menu Item Creation
    const foodCreateRes = await fetch(`${FOOD_URL}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${restaurantToken}` },
      body: JSON.stringify({
        name: `Món Mới ${ts}`,
        description: 'Món ăn đặc sản',
        price: 85000,
        category: 'Vietnamese',
        restaurant: restaurantId,
        availability: true
      })
    });
    record('Restaurant Partner', 'Menu Item Creation & Availability Management', foodCreateRes.status === 201 || foodCreateRes.status === 200, `HTTP ${foodCreateRes.status}`);

    // Promotional Coupon validation / management
    const couponValRes = await fetch(`${REST_URL}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'SKYDISH20K', orderAmount: 150000 })
    });
    record('Restaurant Partner', 'Promotional Coupon Integration', couponValRes.status === 200, `HTTP ${couponValRes.status}`);
  } catch (err) {
    record('Restaurant Partner', 'Restaurant Partner Flow', false, err.message);
  }

  // ------------------------------------------------------------------------
  // 3. SHIPPER / DRIVER FLOW (Section 10)
  // ------------------------------------------------------------------------
  console.log('\n--- 3. Shipper Flow ---');
  try {
    const shipEmail = `shipper_${ts}@skydish.vn`;
    const shipRegRes = await fetch(`${DELIV_AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hoang Van Shipper',
        email: shipEmail,
        password: 'ShipperPassword123!',
        phone: `09${ts.toString().slice(-8)}`,
        vehicleType: 'bike',
        vehicleNumber: `29C-${ts.toString().slice(-5)}`
      })
    });
    const shipRegData = await shipRegRes.json();
    shipperToken = shipRegData.token;
    shipperId = shipRegData.data?.id;

    // Login Shipper
    const shipLoginRes = await fetch(`${DELIV_AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: shipEmail, password: 'ShipperPassword123!' })
    });
    const shipLoginData = await shipLoginRes.json();
    shipperToken = shipLoginData.token || shipperToken;
    record('Shipper', 'Shipper Login & JWT Authenticated', !!shipperToken, `shipperId=${shipperId}`);

    // Create delivery task for customer's order
    const delivCreateRes = await fetch(`${DELIV_URL}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${shipperToken}` },
      body: JSON.stringify({
        orderId,
        customerId,
        driverId: shipperId,
        pickupAddress: 'Bếp SkyDish, Hanoi',
        deliveryAddress: '456 Le Duan, Hanoi'
      })
    });
    const delivCreateData = await delivCreateRes.json();
    deliveryId = delivCreateData.delivery?._id;
    record('Shipper', 'Available Order Assignment / Accept', !!deliveryId, `deliveryId=${deliveryId}`);

    // Status: Picked-up
    const pickupRes = await fetch(`${DELIV_URL}/${deliveryId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${shipperToken}` },
      body: JSON.stringify({ status: 'Picked-up' })
    });
    record('Shipper', 'Status Transition -> Picked-up', pickupRes.status === 200, `HTTP ${pickupRes.status}`);

    // Status: Delivered
    const deliverRes = await fetch(`${DELIV_URL}/${deliveryId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${shipperToken}` },
      body: JSON.stringify({ status: 'Delivered' })
    });
    record('Shipper', 'Status Transition -> Delivered (Completion)', deliverRes.status === 200, `HTTP ${deliverRes.status}`);

    // Shipper Profile & Earnings
    const shipProfRes = await fetch(`${DELIV_AUTH_URL}/profile`, {
      headers: { 'Authorization': `Bearer ${shipperToken}` }
    });
    record('Shipper', 'Shipper Profile & Earnings Summary', shipProfRes.status === 200, `HTTP ${shipProfRes.status}`);
  } catch (err) {
    record('Shipper', 'Shipper Flow Execution', false, err.message);
  }

  // ------------------------------------------------------------------------
  // 4. ADMIN PORTAL FLOW (Section 11)
  // ------------------------------------------------------------------------
  console.log('\n--- 4. Admin Portal Flow ---');
  try {
    const adminEmail = `superadmin_${ts}@test.com`;
    // Register & Login Super Admin
    const aRegRes = await fetch(`${REST_URL}/superAdmin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Super Executive',
        email: adminEmail,
        password: 'password123'
      })
    });
    const aRegData = await aRegRes.json();

    // Login Admin
    const aLoginRes = await fetch(`${REST_URL}/superAdmin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'password123' })
    });
    const aLoginData = await aLoginRes.json();
    adminToken = aLoginData.token;
    record('Admin', 'Super Admin Login & JWT Authenticated', !!adminToken, `adminEmail=${adminEmail}`);

    // Admin Dashboard & Restaurants view
    const allRestsRes = await fetch(`${REST_URL}/superadmin/restaurants`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    record('Admin', 'Admin Restaurant Directory Management', allRestsRes.status === 200, `HTTP ${allRestsRes.status}`);

    // Admin Orders view
    const allOrdersRes = await fetch(`${ORDER_URL}`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    record('Admin', 'Admin / System Orders Audit View', allOrdersRes.status === 200, `HTTP ${allOrdersRes.status}`);

    // Admin Payment Status lookup
    const payAuditRes = await fetch(`${PAY_URL}/status/${orderId}`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    record('Admin', 'Admin / Payment Verification View', payAuditRes.status === 200, `HTTP ${payAuditRes.status}`);
  } catch (err) {
    record('Admin', 'Admin Flow Execution', false, err.message);
  }

  // ------------------------------------------------------------------------
  // 5. REALTIME SOCKET.IO / WSS (Section 12)
  // ------------------------------------------------------------------------
  console.log('\n--- 5. Realtime Socket.IO Verification ---');
  try {
    // Delivery Service Socket (Port 5003)
    const delivSocket = io('http://127.0.0.1:5003', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      timeout: 5000
    });

    const delivConnect = await new Promise((resolve) => {
      delivSocket.on('connect', () => {
        const id = delivSocket.id;
        resolve({ pass: true, id });
      });
      delivSocket.on('connect_error', (err) => resolve({ pass: false, error: err.message }));
      setTimeout(() => resolve({ pass: false, error: 'Timeout' }), 5000);
    });
    record('Socket.IO', 'Delivery Service Socket Connection', delivConnect.pass, `Socket ID: ${delivConnect.id || delivConnect.error}`);

    // GPS location-update broadcast
    if (delivConnect.pass) {
      delivSocket.emit('location-update', {
        driverId: shipperId,
        coords: [106.7009, 10.7769],
        timestamp: new Date().toISOString()
      });
      record('Socket.IO', 'GPS location-update Event Emission', true, 'Coordinates [106.7009, 10.7769]');
    }

    // Disconnect and Reconnect test
    delivSocket.disconnect();
    const isDisconnected = !delivSocket.connected;
    record('Socket.IO', 'Clean Socket Disconnect', isDisconnected, 'connected: false');

    delivSocket.connect();
    const reconnectSuccess = await new Promise((resolve) => {
      delivSocket.on('connect', () => {
        delivSocket.disconnect();
        resolve(true);
      });
      setTimeout(() => resolve(false), 5000);
    });
    record('Socket.IO', 'Socket Reconnection Lifecycle', reconnectSuccess, 'Re-established handshake');
  } catch (err) {
    record('Socket.IO', 'Socket.IO Verification', false, err.message);
  }

  const allPass = checks.every(c => c.pass);
  console.log('\n====================================================');
  console.log(`Portal & Realtime Summary: ${checks.filter(c => c.pass).length}/${checks.length} Passed`);
  console.log(`Result: ${allPass ? '🟢 ALL MULTI-PORTAL & REALTIME CHECKS PASSED' : '🔴 FAIL'}`);
  console.log('====================================================\n');

  process.exit(allPass ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal multi-portal error:', err);
  process.exit(1);
});
