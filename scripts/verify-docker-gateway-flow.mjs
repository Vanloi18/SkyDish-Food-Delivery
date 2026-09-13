/**
 * Verify Browser / Gateway Flow through Nginx Reverse Proxy on Port 3000
 */

import { io } from '../frontend/node_modules/socket.io-client/build/esm/index.js';

const GATEWAY_URL = 'http://localhost:3000';

async function verifyGatewayFlow() {
  console.log('===========================================================');
  console.log('🌐 SKYDISH DOCKER: FRONTEND -> BACKEND REVERSE PROXY AUDIT');
  console.log('===========================================================\n');

  const testEmail = `docker_browser_${Date.now()}@skydish.vn`;
  const testPassword = 'Password123!';

  // 1. Auth: Registration through Gateway
  console.log('1. Testing Auth Registration via Gateway (/api/auth/register/customer)...');
  const regRes = await fetch(`${GATEWAY_URL}/api/auth/register/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Docker',
      lastName: 'Customer',
      email: testEmail,
      password: testPassword,
      phone: '0901234567'
    })
  });
  const regData = await regRes.json();
  console.log(`Registration status: ${regRes.status}`, regData.status || regData.message);
  if (regRes.status !== 201 || !regData.token) {
    throw new Error(`Gateway registration failed: ${JSON.stringify(regData)}`);
  }
  let token = regData.token;
  const user = regData.data?.customer;

  // 2. Auth: Login through Gateway
  console.log('2. Testing Auth Login via Gateway (/api/auth/login)...');
  const loginRes = await fetch(`${GATEWAY_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();
  console.log(`Login status: ${loginRes.status}, token length: ${loginData.token?.length}`);
  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error(`Gateway login failed: ${JSON.stringify(loginData)}`);
  }
  token = loginData.token;

  // 3. Restaurant API through Gateway
  console.log('3. Testing Restaurant API via Gateway (/api/restaurant)...');
  const restRes = await fetch(`${GATEWAY_URL}/api/restaurant`);
  const restData = await restRes.json();
  const restaurants = Array.isArray(restData) ? restData : restData.data || [];
  console.log(`Restaurant API status: ${restRes.status}, count: ${restaurants.length}`);
  if (restRes.status !== 200 || restaurants.length === 0) {
    throw new Error('Gateway restaurant retrieval failed');
  }
  const restaurant = restaurants[0];

  // 4. Food Items API through Gateway
  console.log('4. Testing Food Items API via Gateway (/api/food-items/all)...');
  const foodRes = await fetch(`${GATEWAY_URL}/api/food-items/all`);
  const foodData = await foodRes.json();
  const foodItems = Array.isArray(foodData) ? foodData : foodData.data || [];
  console.log(`Food Items status: ${foodRes.status}, count: ${foodItems.length}`);
  if (foodRes.status !== 200 || foodItems.length === 0) {
    throw new Error('Gateway food items retrieval failed');
  }
  const foodItem = foodItems[0];
  console.log(`Selected item: "${foodItem.name}" - ${foodItem.price} VND`);

  // 5. Search API through Gateway
  console.log('5. Testing Search API via Gateway (/api/search)...');
  const searchRes = await fetch(`${GATEWAY_URL}/api/search?q=${encodeURIComponent(foodItem.name.substring(0, 4))}`);
  console.log(`Search status: ${searchRes.status}`);
  if (searchRes.status !== 200) {
    throw new Error(`Gateway search returned ${searchRes.status}`);
  }

  // 6. Order Creation through Gateway
  console.log('6. Testing Order Creation via Gateway (/api/orders)...');
  const qty = 2;
  const expectedSubtotal = Number(foodItem.price) * qty;
  const expectedDeliveryFee = expectedSubtotal >= 300000 ? 0 : 15000;
  const expectedTotal = expectedSubtotal + expectedDeliveryFee;

  const orderRes = await fetch(`${GATEWAY_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      customerId: user?.id,
      customerName: 'Docker Customer',
      customerEmail: testEmail,
      phone: '0901234567',
      restaurantId: foodItem.restaurant?._id || foodItem.restaurant || restaurant._id,
      items: [
        {
          foodId: foodItem._id,
          name: foodItem.name,
          quantity: qty,
          price: 1 // Malicious price attempt
        }
      ],
      paymentMethod: 'COD',
      paymentStatus: 'Pending',
      deliveryAddress: '456 Le Duan, District 1, Ho Chi Minh City'
    })
  });
  const orderData = await orderRes.json();
  console.log(`Order status: ${orderRes.status}, Order ID: ${orderData._id}`);
  console.log(`Subtotal: ${orderData.subtotal}, Delivery Fee: ${orderData.deliveryFee}, Total: ${orderData.totalPrice}`);
  if (orderRes.status !== 201 || orderData.totalPrice !== expectedTotal) {
    throw new Error(`Order creation through gateway failed: expected ${expectedTotal} VND, got ${orderData.totalPrice}`);
  }

  // 7. Payment through Gateway
  console.log('7. Testing Payment via Gateway (/api/payment/cod/process)...');
  const paymentRes = await fetch(`${GATEWAY_URL}/api/payment/cod/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      orderId: orderData._id,
      amount: orderData.totalPrice,
      currency: 'vnd',
      phone: '0901234567',
      email: testEmail
    })
  });
  const paymentData = await paymentRes.json();
  console.log(`Payment status: ${paymentRes.status}, Payment ID: ${paymentData.paymentId}`);
  if (paymentRes.status !== 200 || !paymentData.paymentId) {
    throw new Error('Gateway payment processing failed');
  }

  // 8. Delivery through Gateway
  console.log('8. Testing Delivery Assignment via Gateway (/api/delivery/create)...');
  const delvRes = await fetch(`${GATEWAY_URL}/api/delivery/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      orderId: orderData._id,
      customerId: user?.id || orderData.customerId,
      pickupAddress: 'Ben Thanh Market, District 1, HCMC',
      deliveryAddress: orderData.deliveryAddress
    })
  });
  const delvData = await delvRes.json();
  console.log(`Delivery status: ${delvRes.status}, Delivery ID: ${delvData.delivery?._id}`);
  if (delvRes.status !== 201 || !delvData.delivery?._id) {
    throw new Error('Gateway delivery creation failed');
  }

  // 9. Realtime Socket.IO Connection
  console.log('9. Testing Socket.IO Connection in Docker...');
  const testSocket = (url, name) => new Promise((resolve, reject) => {
    const s = io(url, { timeout: 3000, reconnection: false });
    s.on('connect', () => {
      console.log(`✅ Socket.IO connected to ${name} (${url})`);
      s.disconnect();
      resolve(true);
    });
    s.on('connect_error', (err) => {
      console.warn(`Socket.IO error on ${name}:`, err.message);
      resolve(false);
    });
    setTimeout(() => {
      s.disconnect();
      resolve(false);
    }, 3500);
  });

  const orderSocketOk = await testSocket('http://localhost:5005', 'Order Service (port 5005)');
  const delvSocketOk = await testSocket('http://localhost:5003', 'Delivery Service (port 5003)');
  if (!orderSocketOk || !delvSocketOk) {
    throw new Error('Socket.IO connection failed in Docker');
  }

  console.log('\n🎉 ALL 9 FRONTEND -> BACKEND DOCKER GATEWAY FLOWS PASSED!');
}

verifyGatewayFlow().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
