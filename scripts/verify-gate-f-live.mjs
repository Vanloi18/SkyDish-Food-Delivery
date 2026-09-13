import { io } from '../frontend/node_modules/socket.io-client/build/esm/index.js';

const AUTH_URL = 'http://127.0.0.1:4000';
const REST_URL = 'http://127.0.0.1:5002';
const DELV_URL = 'http://127.0.0.1:5003';
const PMNT_URL = 'http://127.0.0.1:5004';
const ORDR_URL = 'http://127.0.0.1:5005';

async function runLiveVerification() {
  console.log('====================================================');
  console.log('🚀 GATE F: LIVE FUNCTIONAL & COD REGRESSION AUDIT');
  console.log('====================================================\n');

  const checklist = [];
  function record(item, pass, details = '') {
    checklist.push({ item, pass, details });
    console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${item} ${details ? `(${details})` : ''}`);
  }

  // 1. Health Checks
  console.log('--- Step 1: Health Checks ---');
  const services = [
    { name: 'auth-service', url: `${AUTH_URL}/health` },
    { name: 'restaurant-service', url: `${REST_URL}/health` },
    { name: 'delivery-service', url: `${DELV_URL}/health` },
    { name: 'payment-service', url: `${PMNT_URL}/health` },
    { name: 'order-service', url: `${ORDR_URL}/health` }
  ];

  for (const s of services) {
    try {
      const res = await fetch(s.url);
      const data = await res.json();
      record(`Health: ${s.name}`, res.status === 200 && data.status === 'ok', `status=${res.status}`);
    } catch (err) {
      record(`Health: ${s.name}`, false, err.message);
    }
  }

  // 2. Register New User
  console.log('\n--- Step 2: User Registration ---');
  const testEmail = `test_live_${Date.now()}@skydish.vn`;
  const testPassword = 'Password123!';
  let registeredUser = null;
  let authToken = null;
  let userProfile = null;
  try {
    const res = await fetch(`${AUTH_URL}/api/auth/register/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Nguyen',
        lastName: 'Van Test',
        email: testEmail,
        password: testPassword,
        phone: '0901234567'
      })
    });
    const data = await res.json();
    registeredUser = data;
    authToken = data.token;
    userProfile = data.data?.customer;
    record('User Registration', res.status === 201 && !!authToken, `status=${res.status}, user=${userProfile?.email}`);
  } catch (err) {
    record('User Registration', false, err.message);
  }

  // 3. User Login & JWT Token
  console.log('\n--- Step 3: User Login ---');
  try {
    const res = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      userProfile = data.user || data.data?.customer || userProfile;
    }
    record('User Login & JWT', res.status === 200 && !!authToken, `token received, length=${authToken?.length || 0}`);
  } catch (err) {
    record('User Login & JWT', false, err.message);
  }

  // 4. Browse Restaurants & Food Items
  console.log('\n--- Step 4: Catalog & Restaurant Browsing ---');
  let testRestaurant = null;
  let testFoodItem = null;
  try {
    const restRes = await fetch(`${REST_URL}/api/restaurant`);
    const restData = await restRes.json();
    const restaurants = Array.isArray(restData) ? restData : restData.data || [];
    testRestaurant = restaurants[0];
    record('Browse Restaurants', restRes.status === 200 && restaurants.length > 0, `found ${restaurants.length} restaurants`);

    const foodRes = await fetch(`${REST_URL}/api/food-items/all`);
    const foodData = await foodRes.json();
    const foodItems = Array.isArray(foodData) ? foodData : foodData.data || [];
    testFoodItem = foodItems[0];
    record('Browse Food Items', foodRes.status === 200 && foodItems.length > 0, `item: "${testFoodItem?.name}" price: ${testFoodItem?.price} VND`);
  } catch (err) {
    record('Browse Restaurants & Food', false, err.message);
  }

  // 5. CRITICAL COD REGRESSION AUDIT
  console.log('\n--- Step 5: CRITICAL COD Price Regression Audit ---');
  let codOrder = null;
  try {
    const qty = 2;
    const itemOfficialPrice = Number(testFoodItem.price);
    const expectedSubtotal = itemOfficialPrice * qty;
    const expectedDeliveryFee = expectedSubtotal >= 300000 ? 0 : 15000;
    const expectedDiscount = 0;
    const expectedTotal = expectedSubtotal + expectedDeliveryFee - expectedDiscount;

    console.log(`[Trace] Item: "${testFoodItem.name}" @ ${itemOfficialPrice} VND x ${qty}`);
    console.log(`[Trace] Expected Subtotal: ${expectedSubtotal} VND`);
    console.log(`[Trace] Expected Delivery Fee: ${expectedDeliveryFee} VND`);
    console.log(`[Trace] Expected Discount: ${expectedDiscount} VND`);
    console.log(`[Trace] Expected Total: ${expectedTotal} VND`);

    // Submit COD order with malicious client-side price attempts (attempting 1 VND)
    const orderRes = await fetch(`${ORDR_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        customerId: userProfile?.id,
        customerName: userProfile?.name,
        customerEmail: userProfile?.email,
        phone: '0901234567',
        restaurantId: testFoodItem.restaurant || testRestaurant?._id,
        items: [
          {
            foodId: testFoodItem._id,
            name: testFoodItem.name,
            quantity: qty,
            price: 1 // Attempted price tampering to test Server Authority
          }
        ],
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        deliveryAddress: '123 Nguyen Hue, Ben Nghe, District 1, Ho Chi Minh City'
      })
    });

    codOrder = await orderRes.json();

    const subtotalMatch = codOrder.subtotal === expectedSubtotal;
    const deliveryFeeMatch = codOrder.deliveryFee === expectedDeliveryFee;
    const discountMatch = codOrder.discount === expectedDiscount;
    const totalMatch = codOrder.totalPrice === expectedTotal;
    const codMethodMatch = codOrder.paymentMethod === 'COD';
    const pendingStatusMatch = codOrder.paymentStatus === 'Pending';

    console.log(`[Server Result] Order ID: ${codOrder._id}`);
    console.log(`[Server Result] Server Subtotal: ${codOrder.subtotal} (Match: ${subtotalMatch})`);
    console.log(`[Server Result] Server Delivery Fee: ${codOrder.deliveryFee} (Match: ${deliveryFeeMatch})`);
    console.log(`[Server Result] Server Discount: ${codOrder.discount} (Match: ${discountMatch})`);
    console.log(`[Server Result] Server Total Price: ${codOrder.totalPrice} (Match: ${totalMatch})`);

    record('COD Server Price Authority (No Tampering)', subtotalMatch && totalMatch, `expected ${expectedTotal} VND === actual ${codOrder.totalPrice} VND`);
    record('COD Fee Integrity (Delivery fee preserved)', deliveryFeeMatch, `deliveryFee: ${codOrder.deliveryFee} VND`);
    record('COD Zero Mutation Guarantee', subtotalMatch && deliveryFeeMatch && discountMatch && totalMatch, 'Price components exact');
  } catch (err) {
    record('CRITICAL COD Regression', false, err.message);
  }

  // 6. Payment Service: Process COD Record & Bank Transfer / VietQR
  console.log('\n--- Step 6: Payment Gateway Execution ---');
  try {
    const codPaymentRes = await fetch(`${PMNT_URL}/api/payment/cod/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        orderId: codOrder._id,
        amount: codOrder.totalPrice,
        currency: 'vnd',
        phone: '0901234567',
        email: testEmail
      })
    });
    const codPaymentData = await codPaymentRes.json();
    record('Payment: COD Creation', codPaymentRes.status === 200 && codPaymentData.paymentMethod === 'COD', `paymentId=${codPaymentData.paymentId}`);

    const qrRes = await fetch(`${PMNT_URL}/api/payment/bank-transfer/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        orderId: `ORD_QR_${Date.now()}`,
        amount: 85000,
        currency: 'vnd',
        phone: '0901234567',
        email: testEmail
      })
    });
    const qrData = await qrRes.json();
    record('Payment: VietQR Generation', qrRes.status === 200 && !!qrData.qrUrl && !!qrData.bankDetails, `Bank: ${qrData.bankDetails?.bankCode}, QR: ${qrData.qrUrl?.substring(0, 30)}...`);
  } catch (err) {
    record('Payment Gateway Execution', false, err.message);
  }

  // 7. Delivery Assignment
  console.log('\n--- Step 7: Driver Assignment ---');
  try {
    const delvRes = await fetch(`${DELV_URL}/api/delivery/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        orderId: codOrder._id,
        customerId: userProfile?.id || codOrder.customerId || 'cust_test_1',
        pickupAddress: '78 Le Loi, District 1, HCMC',
        deliveryAddress: codOrder.deliveryAddress
      })
    });
    const delvData = await delvRes.json();
    record('Delivery Assignment', delvRes.status === 201 && delvData.delivery?._id, `deliveryId=${delvData.delivery?._id}`);
  } catch (err) {
    record('Delivery Assignment', false, err.message);
  }

  // 8. Realtime Socket.IO Connection
  console.log('\n--- Step 8: Socket.IO Realtime Connection ---');
  try {
    const testSocketConnect = (url, name) => new Promise((resolve) => {
      const socket = io(url, { timeout: 3000, reconnection: false });
      socket.on('connect', () => {
        socket.disconnect();
        resolve({ pass: true, error: null });
      });
      socket.on('connect_error', (err) => {
        resolve({ pass: false, error: err.message });
      });
      setTimeout(() => {
        socket.disconnect();
        resolve({ pass: false, error: 'Timeout' });
      }, 3000);
    });

    const orderSocketResult = await testSocketConnect(ORDR_URL, 'order-service');
    record('Socket.IO: Order Service (5005)', orderSocketResult.pass, orderSocketResult.error || 'Connected');

    const delvSocketResult = await testSocketConnect(DELV_URL, 'delivery-service');
    record('Socket.IO: Delivery Service (5003)', delvSocketResult.pass, delvSocketResult.error || 'Connected');
  } catch (err) {
    record('Socket.IO Connections', false, err.message);
  }

  // Summary
  console.log('\n====================================================');
  console.log('📊 GATE F VERIFICATION SUMMARY');
  console.log('====================================================');
  const allPass = checklist.every(c => c.pass);
  const passCount = checklist.filter(c => c.pass).length;
  console.log(`Total Checks: ${checklist.length} | Passed: ${passCount} | Failed: ${checklist.length - passCount}`);
  console.log(`Overall Status: ${allPass ? 'PASS' : 'FAIL'}\n`);

  if (!allPass) {
    process.exit(1);
  }
}

runLiveVerification().catch(err => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});
