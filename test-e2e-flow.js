import axios from 'axios';
import { io } from 'socket.io-client';
import FormData from 'form-data';
import fs from 'fs';

const results = [];

function logPass(suite, name, details = '') {
  console.log(`✅ [${suite}] ${name} ${details}`);
  results.push({ suite, name, status: 'PASS', details });
}

function logFail(suite, name, error = '') {
  console.error(`❌ [${suite}] ${name} - ERROR: ${error}`);
  results.push({ suite, name, status: 'FAIL', details: error });
}

async function runTests() {
  console.log('=====================================================');
  console.log('🚀 SKYDISH REAL FUNCTIONAL API & FLOW VERIFICATION');
  console.log('=====================================================\n');

  const timestamp = Date.now();
  let customerToken = '';
  let customerId = '';
  let restaurantToken = '';
  let restaurantId = '';
  let foodItemId = '';
  let driverToken = '';
  let driverId = '';
  let deliveryId = '';
  let superAdminToken = '';
  let orderId = '';

  // ----------------------------------------------------
  // 1. AUTH SERVICE (PORT 4000) & CUSTOMER FLOW
  // ----------------------------------------------------
  console.log('--- TESTING CUSTOMER & AUTH SERVICE (PORT 4000) ---');
  try {
    const custEmail = `customer_${timestamp}@test.com`;
    const custRegRes = await axios.post('http://localhost:4000/api/auth/register/customer', {
      name: 'Kasun Perera',
      email: custEmail,
      password: 'password123',
      address: '123 Main St, Colombo 03',
      phone: '0771234567',
    });
    if (custRegRes.status === 201 || custRegRes.status === 200) {
      logPass('Customer Auth', 'Register Customer API', `Status ${custRegRes.status}`);
    } else {
      logFail('Customer Auth', 'Register Customer API', `Unexpected status ${custRegRes.status}`);
    }
  } catch (err) {
    logFail('Customer Auth', 'Register Customer API', err.response?.data?.message || err.message);
  }

  try {
    const custEmail = `customer_${timestamp}@test.com`;
    const custLoginRes = await axios.post('http://localhost:4000/api/auth/login', {
      email: custEmail,
      password: 'password123',
    });
    if (custLoginRes.status === 200 && custLoginRes.data.token) {
      customerToken = custLoginRes.data.token;
      customerId = custLoginRes.data.user?.id || 'CUST_TEST';
      logPass('Customer Auth', 'Login Customer API', `Status 200, JWT token acquired`);
    } else {
      logFail('Customer Auth', 'Login Customer API', `No token returned: ${JSON.stringify(custLoginRes.data)}`);
    }
  } catch (err) {
    logFail('Customer Auth', 'Login Customer API', err.response?.data?.message || err.message);
  }

  try {
    const profileRes = await axios.get('http://localhost:4000/api/auth/customer/profile', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (profileRes.status === 200 && profileRes.data.email) {
      logPass('Customer Profile', 'Get Profile API with JWT', `Profile loaded for ${profileRes.data.email}`);
    } else {
      logFail('Customer Profile', 'Get Profile API with JWT', `Status: ${profileRes.status}`);
    }
  } catch (err) {
    logFail('Customer Profile', 'Get Profile API with JWT', err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // 2. RESTAURANT SERVICE (PORT 5002)
  // ----------------------------------------------------
  console.log('\n--- TESTING RESTAURANT SERVICE (PORT 5002) ---');
  try {
    const restEmail = `restaurant_${timestamp}@test.com`;
    const form = new FormData();
    form.append('name', 'Sky Gourmet Grill');
    form.append('ownerName', 'Sunil Fernando');
    form.append('location', '45 Galle Road, Colombo 03');
    form.append('contactNumber', '0112345678');
    form.append('email', restEmail);
    form.append('password', 'password123');

    const restRegRes = await axios.post('http://localhost:5002/api/restaurant/register', form, {
      headers: form.getHeaders(),
    });
    if (restRegRes.status === 201 || restRegRes.status === 200) {
      logPass('Restaurant Partner', 'Register Restaurant API', `Status ${restRegRes.status}`);
    } else {
      logFail('Restaurant Partner', 'Register Restaurant API', `Status ${restRegRes.status}`);
    }
  } catch (err) {
    logFail('Restaurant Partner', 'Register Restaurant API', err.response?.data?.message || err.message);
  }

  try {
    const restEmail = `restaurant_${timestamp}@test.com`;
    const restLoginRes = await axios.post('http://localhost:5002/api/restaurant/login', {
      email: restEmail,
      password: 'password123',
    });
    if (restLoginRes.status === 200 && restLoginRes.data.token) {
      restaurantToken = restLoginRes.data.token;
      logPass('Restaurant Partner', 'Login Restaurant API', `Status 200, JWT token acquired`);
    } else {
      logFail('Restaurant Partner', 'Login Restaurant API', `Failed to login`);
    }
  } catch (err) {
    logFail('Restaurant Partner', 'Login Restaurant API', err.response?.data?.message || err.message);
  }

  try {
    const restProfileRes = await axios.get('http://localhost:5002/api/restaurant/profile', {
      headers: { Authorization: `Bearer ${restaurantToken}` },
    });
    if (restProfileRes.status === 200 && restProfileRes.data._id) {
      restaurantId = restProfileRes.data._id;
      logPass('Restaurant Partner', 'Get Restaurant Profile API', `Restaurant ID: ${restaurantId}`);
    } else {
      logFail('Restaurant Partner', 'Get Restaurant Profile API', `Status: ${restProfileRes.status}`);
    }
  } catch (err) {
    logFail('Restaurant Partner', 'Get Restaurant Profile API', err.response?.data?.message || err.message);
  }

  try {
    const availRes = await axios.put('http://localhost:5002/api/restaurant/availability', {
      availability: true,
    }, {
      headers: { Authorization: `Bearer ${restaurantToken}` },
    });
    if (availRes.status === 200) {
      logPass('Restaurant Partner', 'Update Store Availability API', `Availability set to true`);
    } else {
      logFail('Restaurant Partner', 'Update Store Availability API', `Status ${availRes.status}`);
    }
  } catch (err) {
    logFail('Restaurant Partner', 'Update Store Availability API', err.response?.data?.message || err.message);
  }

  try {
    const foodForm = new FormData();
    foodForm.append('name', 'Signature Beef Burger');
    foodForm.append('description', 'Flame-grilled prime beef with melted aged cheddar');
    foodForm.append('price', '950');
    foodForm.append('category', 'Burgers');

    const foodCreateRes = await axios.post('http://localhost:5002/api/food-items/create', foodForm, {
      headers: {
        Authorization: `Bearer ${restaurantToken}`,
        ...foodForm.getHeaders(),
      },
    });
    if (foodCreateRes.status === 201 || foodCreateRes.status === 200) {
      foodItemId = foodCreateRes.data.foodItem?._id || foodCreateRes.data._id;
      logPass('Restaurant Partner', 'Create Dish / Food Item API', `Dish ID: ${foodItemId}`);
    } else {
      logFail('Restaurant Partner', 'Create Dish / Food Item API', `Status ${foodCreateRes.status}`);
    }
  } catch (err) {
    logFail('Restaurant Partner', 'Create Dish / Food Item API', err.response?.data?.message || err.message);
  }

  try {
    const listRes = await axios.get(`http://localhost:5002/api/food-items/restaurant/${restaurantId}`);
    if (listRes.status === 200 && Array.isArray(listRes.data)) {
      logPass('Restaurant Partner', 'Get Restaurant Menu Items API', `Returned ${listRes.data.length} dishes`);
    } else {
      logFail('Restaurant Partner', 'Get Restaurant Menu Items API', `Status ${listRes.status}`);
    }
  } catch (err) {
    logFail('Restaurant Partner', 'Get Restaurant Menu Items API', err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // 3. ORDER SERVICE (PORT 5005)
  // ----------------------------------------------------
  console.log('\n--- TESTING ORDER SERVICE (PORT 5005) ---');
  try {
    const orderPayload = {
      customerId: 'Kasun Perera',
      restaurantId: 'Sky Gourmet Grill',
      items: [
        { foodId: 'Signature Beef Burger', quantity: 2, price: 950 },
        { foodId: 'Crispy Fries', quantity: 1, price: 400 },
      ],
      totalPrice: 2300,
      deliveryAddress: '123 Main St, Colombo 03',
    };

    const orderRes = await axios.post('http://localhost:5005/api/orders', orderPayload, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (orderRes.status === 201 || orderRes.status === 200) {
      orderId = orderRes.data._id;
      logPass('Order Service', 'Create Customer Order API', `Order ID: ${orderId}, Total: Rs. 2,300`);
    } else {
      logFail('Order Service', 'Create Customer Order API', `Status ${orderRes.status}`);
    }
  } catch (err) {
    logFail('Order Service', 'Create Customer Order API', err.response?.data?.message || err.message);
  }

  try {
    const ordersListRes = await axios.get('http://localhost:5005/api/orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (ordersListRes.status === 200 && Array.isArray(ordersListRes.data)) {
      logPass('Order Service', 'Get All Orders API', `Found ${ordersListRes.data.length} orders`);
    } else {
      logFail('Order Service', 'Get All Orders API', `Status: ${ordersListRes.status}`);
    }
  } catch (err) {
    logFail('Order Service', 'Get All Orders API', err.response?.data?.message || err.message);
  }

  try {
    const orderDetailRes = await axios.get(`http://localhost:5005/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (orderDetailRes.status === 200 && orderDetailRes.data._id === orderId) {
      logPass('Order Service', 'Get Single Order Detail API', `Fetched order ${orderId}`);
    } else {
      logFail('Order Service', 'Get Single Order Detail API', `Status: ${orderDetailRes.status}`);
    }
  } catch (err) {
    logFail('Order Service', 'Get Single Order Detail API', err.response?.data?.message || err.message);
  }

  try {
    const patchRes = await axios.patch(`http://localhost:5005/api/orders/${orderId}`, {
      deliveryAddress: '456 Sea View Ave, Colombo 04',
      totalPrice: 2300,
    }, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (patchRes.status === 200) {
      logPass('Order Service', 'Update Order API (PATCH)', `Address updated successfully`);
    } else {
      logFail('Order Service', 'Update Order API (PATCH)', `Status: ${patchRes.status}`);
    }
  } catch (err) {
    logFail('Order Service', 'Update Order API (PATCH)', err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // 4. PAYMENT SERVICE (PORT 5004)
  // ----------------------------------------------------
  console.log('\n--- TESTING PAYMENT SERVICE (PORT 5004) ---');
  try {
    const paymentPayload = {
      orderId: orderId || 'ORDER-9901',
      userId: customerId || 'USER-1234',
      amount: 2300,
      currency: 'usd',
      firstName: 'Kasun',
      lastName: 'Perera',
      email: `customer_${timestamp}@test.com`,
      phone: '+94771234567',
    };

    const payRes = await axios.post('http://localhost:5004/api/payment/process', paymentPayload);
    if (payRes.status === 200 && (payRes.data.clientSecret || payRes.data.paymentStatus)) {
      logPass('Payment Service', 'Create Stripe PaymentIntent API', `ClientSecret / Status received`);
    } else {
      logFail('Payment Service', 'Create Stripe PaymentIntent API', `Response: ${JSON.stringify(payRes.data)}`);
    }
  } catch (err) {
    logFail('Payment Service', 'Create Stripe PaymentIntent API', err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // 5. DELIVERY SERVICE (PORT 5003) & SOCKET.IO
  // ----------------------------------------------------
  console.log('\n--- TESTING DELIVERY SERVICE (PORT 5003) & SOCKET.IO ---');
  try {
    const driverEmail = `driver_${timestamp}@test.com`;
    const driverRegRes = await axios.post('http://localhost:5003/api/auth/register', {
      name: 'Sam Courier',
      email: driverEmail,
      password: 'password123',
      phone: '0771234567',
      vehicleType: 'bike',
      vehicleNumber: 'WP-7788',
      location: { type: 'Point', coordinates: [79.8612, 6.9271] },
    });
    if (driverRegRes.status === 200 || driverRegRes.status === 201) {
      logPass('Delivery Partner', 'Register Driver API', `Status ${driverRegRes.status}`);
    } else {
      logFail('Delivery Partner', 'Register Driver API', `Status ${driverRegRes.status}`);
    }
  } catch (err) {
    logFail('Delivery Partner', 'Register Driver API', err.response?.data?.message || err.message);
  }

  try {
    const driverEmail = `driver_${timestamp}@test.com`;
    const driverLoginRes = await axios.post('http://localhost:5003/api/auth/login', {
      email: driverEmail,
      password: 'password123',
    });
    if (driverLoginRes.data?.success && driverLoginRes.data.token) {
      driverToken = driverLoginRes.data.token;
      driverId = driverLoginRes.data.data?.id;
      logPass('Delivery Partner', 'Login Driver API', `Status 200, Driver ID: ${driverId}`);
    } else {
      logFail('Delivery Partner', 'Login Driver API', `Failed login`);
    }
  } catch (err) {
    logFail('Delivery Partner', 'Login Driver API', err.response?.data?.message || err.message);
  }

  try {
    const delCreateRes = await axios.post('http://localhost:5003/api/delivery/create', {
      orderId: orderId || 'ORDER-9901',
      customerId: 'Kasun Perera',
      pickupAddress: '45 Galle Road, Colombo 03',
      deliveryAddress: '456 Sea View Ave, Colombo 04',
    }, {
      headers: { Authorization: driverToken },
    });
    if (delCreateRes.status === 201 || delCreateRes.status === 200) {
      deliveryId = delCreateRes.data?.delivery?._id || delCreateRes.data?._id;
      logPass('Delivery Partner', 'Create Delivery Assignment API', `Delivery ID: ${deliveryId}`);
    } else {
      logFail('Delivery Partner', 'Create Delivery Assignment API', `Status: ${delCreateRes.status}`);
    }
  } catch (err) {
    logFail('Delivery Partner', 'Create Delivery Assignment API', err.response?.data?.message || err.message);
  }

  try {
    const delListRes = await axios.get('http://localhost:5003/api/delivery', {
      headers: { Authorization: driverToken },
    });
    if (delListRes.status === 200) {
      const list = delListRes.data?.deliveries || delListRes.data;
      logPass('Delivery Partner', 'Get Assigned Deliveries API', `Count: ${list.length}`);
    } else {
      logFail('Delivery Partner', 'Get Assigned Deliveries API', `Status ${delListRes.status}`);
    }
  } catch (err) {
    logFail('Delivery Partner', 'Get Assigned Deliveries API', err.response?.data?.message || err.message);
  }

  try {
    const status1Res = await axios.put(`http://localhost:5003/api/delivery/${deliveryId}/status`, {
      status: 'To be delivered',
    }, {
      headers: { Authorization: driverToken },
    });
    if (status1Res.status === 200) {
      logPass('Delivery Partner', 'Status Transition -> To be delivered', `Status updated`);
    } else {
      logFail('Delivery Partner', 'Status Transition -> To be delivered', `Status ${status1Res.status}`);
    }

    const status2Res = await axios.put(`http://localhost:5003/api/delivery/${deliveryId}/status`, {
      status: 'Picked-up',
    }, {
      headers: { Authorization: driverToken },
    });
    if (status2Res.status === 200) {
      logPass('Delivery Partner', 'Status Transition -> Picked-up', `Status updated`);
    } else {
      logFail('Delivery Partner', 'Status Transition -> Picked-up', `Status ${status2Res.status}`);
    }

    const status3Res = await axios.put(`http://localhost:5003/api/delivery/${deliveryId}/status`, {
      status: 'Delivered',
    }, {
      headers: { Authorization: driverToken },
    });
    if (status3Res.status === 200) {
      logPass('Delivery Partner', 'Status Transition -> Delivered (Completion)', `Status updated`);
    } else {
      logFail('Delivery Partner', 'Status Transition -> Delivered (Completion)', `Status ${status3Res.status}`);
    }
  } catch (err) {
    logFail('Delivery Partner', 'Status Transitions', err.response?.data?.message || err.message);
  }

  // Test Socket.IO
  await new Promise((resolve) => {
    try {
      const socket = io('http://localhost:5003', { timeout: 3000 });
      socket.on('connect', () => {
        logPass('Socket.IO', 'Connect to Delivery Gateway (Port 5003)', `Socket Connected, ID: ${socket.id}`);
        socket.emit('location-update', {
          orderId: orderId || 'ORDER-9901',
          lat: 6.9271,
          lng: 79.8612,
        });
        logPass('Socket.IO', 'Emit location-update GPS Event', `Coords emitted [6.9271, 79.8612]`);
        socket.disconnect();
        resolve();
      });
      socket.on('connect_error', (err) => {
        logFail('Socket.IO', 'Connect to Delivery Gateway', err.message);
        resolve();
      });
    } catch (e) {
      logFail('Socket.IO', 'Socket connection test', e.message);
      resolve();
    }
  });

  // ----------------------------------------------------
  // 6. SUPER ADMIN SERVICE (PORT 5002)
  // ----------------------------------------------------
  console.log('\n--- TESTING SUPER ADMIN SERVICE (PORT 5002) ---');
  try {
    const adminEmail = `superadmin_${timestamp}@test.com`;
    const adminRegRes = await axios.post('http://localhost:5002/api/superAdmin/register', {
      name: 'Super Executive',
      email: adminEmail,
      password: 'password123',
    });
    if (adminRegRes.status === 200 || adminRegRes.status === 201) {
      logPass('Super Admin', 'Register Super Admin API', `Status ${adminRegRes.status}`);
    } else {
      logFail('Super Admin', 'Register Super Admin API', `Status ${adminRegRes.status}`);
    }
  } catch (err) {
    logFail('Super Admin', 'Register Super Admin API', err.response?.data?.message || err.message);
  }

  try {
    const adminEmail = `superadmin_${timestamp}@test.com`;
    const adminLoginRes = await axios.post('http://localhost:5002/api/superAdmin/login', {
      email: adminEmail,
      password: 'password123',
    });
    if (adminLoginRes.status === 200 && adminLoginRes.data.token) {
      superAdminToken = adminLoginRes.data.token;
      logPass('Super Admin', 'Login Super Admin API', `Status 200, JWT token acquired`);
    } else {
      logFail('Super Admin', 'Login Super Admin API', `Failed login`);
    }
  } catch (err) {
    logFail('Super Admin', 'Login Super Admin API', err.response?.data?.message || err.message);
  }

  try {
    const adminRestsRes = await axios.get('http://localhost:5002/api/superadmin/restaurants', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (adminRestsRes.status === 200 && Array.isArray(adminRestsRes.data)) {
      logPass('Super Admin', 'Get All Restaurants (SuperAdmin) API', `Found ${adminRestsRes.data.length} registered restaurants`);
    } else {
      logFail('Super Admin', 'Get All Restaurants (SuperAdmin) API', `Status ${adminRestsRes.status}`);
    }
  } catch (err) {
    logFail('Super Admin', 'Get All Restaurants (SuperAdmin) API', err.response?.data?.message || err.message);
  }

  // ----------------------------------------------------
  // 7. FRONTEND WEB APP (PORT 3000)
  // ----------------------------------------------------
  console.log('\n--- TESTING FRONTEND WEB APP (PORT 3000) ---');
  try {
    const feRes = await axios.get('http://localhost:3000');
    if (feRes.status === 200 && feRes.data.includes('root')) {
      logPass('Frontend React App', 'HTTP GET http://localhost:3000', `React index HTML returned`);
    } else {
      logFail('Frontend React App', 'HTTP GET http://localhost:3000', `Status ${feRes.status}`);
    }
  } catch (err) {
    logFail('Frontend React App', 'HTTP GET http://localhost:3000', err.message);
  }

  console.log('\n=====================================================');
  console.log('📊 TEST SUMMARY RESULTS:');
  console.log('=====================================================');
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);

  return { total: results.length, passed: passCount, failed: failCount, results };
}

runTests();
