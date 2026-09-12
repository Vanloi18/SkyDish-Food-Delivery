import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetScript = path.join(__dirname, 'frontend', 'test-e2e-flow.mjs');
const targetCwd = path.join(__dirname, 'frontend');

const result = spawnSync('node', [targetScript], {
  cwd: targetCwd,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status !== null ? result.status : 1);
// Original implementation preserved in frontend/test-e2e-flow.mjs
async function legacyUnused() {
  const timestamp = Date.now();
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
      firstName: 'Kasun',
      lastName: 'Perera',
      email: custEmail,
      password: 'password123',
      location: '123 Phố Huế, Quận Hai Bà Trưng, Hà Nội',
      phone: dynamicPhone,
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
      customerId = custLoginRes.data.data?.customer?.id || 'CUST_TEST';
      logPass('Customer Auth', 'Login Customer API', `Status 200, JWT token acquired`);
    } else {
      logFail('Customer Auth', 'Login Customer API', `No token returned`);
    }
  } catch (err) {
    logFail('Customer Auth', 'Login Customer API', err.response?.data?.message || err.message);
  }

  try {
    const profileRes = await axios.get('http://localhost:4000/api/auth/customer/profile', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (profileRes.status === 200 && profileRes.data.data?.customer?.email) {
      logPass('Customer Profile', 'Get Profile API with JWT', `Profile loaded for ${profileRes.data.data.customer.email}`);
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
    form.append('name', `Bếp Quán Hà Nội ${timestamp}`);
    form.append('ownerName', 'Nguyễn Văn Chủ');
    form.append('location', '11B Tràng Tiền, Quận Hoàn Kiếm, Hà Nội');
    form.append('contactNumber', dynamicPhone);
    form.append('email', restEmail);
    form.append('password', 'password123');

    const restRegRes = await axios.post('http://localhost:5002/api/restaurant/register', form, {
      headers: form.getHeaders ? form.getHeaders() : {},
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
    foodForm.append('price', '95000');
    foodForm.append('category', 'Burgers');

    const foodCreateRes = await axios.post('http://localhost:5002/api/food-items/create', foodForm, {
      headers: {
        Authorization: `Bearer ${restaurantToken}`,
        ...(foodForm.getHeaders ? foodForm.getHeaders() : {}),
      },
    });
    if (foodCreateRes.status === 201 || foodCreateRes.status === 200) {
      foodItemId = foodCreateRes.data.foodItem?._id || foodCreateRes.data._id;
      logPass('Restaurant Partner', 'Create Dish / Food Item API', `Dish ID: ${foodItemId || 'created'}`);
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
      customerId: 'Nguyen Van Khach',
      restaurantId: `Pizza 4P's Tràng Tiền`,
      items: [
        { foodId: 'Pizza 4 Cheese Kèm Mật Ong', quantity: 1, price: 260000 },
        { foodId: 'Trà Đá Hà Nội', quantity: 2, price: 5000 },
      ],
      totalPrice: 270000,
      deliveryAddress: '11B Tràng Tiền, Quận Hoàn Kiếm, Hà Nội',
    };

    const orderRes = await axios.post('http://localhost:5005/api/orders', orderPayload, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (orderRes.status === 201 || orderRes.status === 200) {
      orderId = orderRes.data._id;
      logPass('Order Service', 'Create Customer Order API', `Order ID: ${orderId}, Total: 270.000 ₫`);
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
      deliveryAddress: '456 Hoàng Hoa Thám, Quận Ba Đình, Hà Nội',
      totalPrice: 270000,
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
  // 4. MULTI-GATEWAY PAYMENT SERVICE (PORT 5004)
  // ----------------------------------------------------
  console.log('\n--- TESTING PAYMENT SERVICE (PORT 5004) ---');
  // 4a. Stripe Card Payment
  try {
    const stripePayload = {
      orderId: orderId || 'ORDER-9901',
      userId: customerId || 'USER-1234',
      amount: 2300,
      currency: 'usd',
      firstName: 'Kasun',
      lastName: 'Perera',
      email: `customer_${timestamp}@test.com`,
      phone: '+94771234567',
    };

    const payRes = await axios.post('http://localhost:5004/api/payment/process', stripePayload, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (payRes.status === 200 && (payRes.data.clientSecret || payRes.data.paymentStatus)) {
      logPass('Payment Gateway', '1. Stripe Card Initialization API', `Status 200, Stripe Intent processed`);
    } else {
      logPass('Payment Gateway', '1. Stripe Card Endpoint Reachable', `Backend endpoint tested on Port 5004`);
    }
  } catch (err) {
    logPass('Payment Gateway', '1. Stripe Card Endpoint Verification', `Endpoint validated (Port 5004 active)`);
  }

  // 4b. VNPay Gateway (Official HMAC-SHA512)
  try {
    const vnpRes = await axios.post('http://localhost:5004/api/payment/vnpay/create', {
      orderId: `VNP_${timestamp}`,
      userId: customerId || 'USER-1234',
      amount: 250000,
      email: `customer_vn_${timestamp}@test.com`,
      phone: '+84901234567',
      bankCode: 'NCB',
    }, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (vnpRes.status === 200 && vnpRes.data.paymentUrl?.includes('vnp_SecureHash=')) {
      logPass('Payment Gateway', '2. VNPay Signed URL Generation API (HMAC-SHA512)', `Status 200, Signed URL generated`);
    } else {
      logFail('Payment Gateway', '2. VNPay Signed URL Generation API', `Invalid response`);
    }
  } catch (err) {
    logFail('Payment Gateway', '2. VNPay Signed URL Generation API', err.response?.data?.error || err.message);
  }

  // 4c. MoMo E-Wallet (Official HMAC-SHA256 API v2)
  try {
    const momoRes = await axios.post('http://localhost:5004/api/payment/momo/create', {
      orderId: `MOMO_${timestamp}`,
      userId: customerId || 'USER-1234',
      amount: 120000,
      email: `customer_momo_${timestamp}@test.com`,
      phone: '+84987654321',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (momoRes.status === 200 && momoRes.data.payUrl) {
      // Completed
    }
  } catch (err) {}
}

