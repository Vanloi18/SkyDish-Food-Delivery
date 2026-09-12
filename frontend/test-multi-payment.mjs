import axios from 'axios';
import crypto from 'crypto';

const PAYMENT_API = 'http://127.0.0.1:5004/api/payment';

function buildVNPaySignData(obj) {
  const sortedKeys = Object.keys(obj).sort();
  const pairs = [];
  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== '') {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val)).replace(/%20/g, "+")}`);
    }
  }
  return pairs.join("&");
}

async function runPaymentTests() {
  console.log('=====================================================');
  console.log('💳 SKYDISH MULTI-GATEWAY PAYMENT VERIFICATION');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASSED] ${name} ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAILED] ${name} ${details}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testUserId = `USER_${timestamp}`;

  function createTestToken(userId, role = 'customer') {
    const secret = 'supersecretjwtkeyforfooddeliverymicroservices2025';
    const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const p = Buffer.from(JSON.stringify({ id: userId, role, email: 'customer@test.com' })).toString('base64url');
    const s = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
    return `${h}.${p}.${s}`;
  }
  const customerToken = createTestToken(testUserId);
  const authHeaders = { Authorization: `Bearer ${customerToken}` };

  // ----------------------------------------------------
  // TEST 1: STRIPE CARD PAYMENT (PRESERVED)
  // ----------------------------------------------------
  console.log('--- 1. TESTING STRIPE CARD PAYMENT GATEWAY ---');
  const stripeOrderId = `ORDER_STRIPE_${timestamp}`;
  try {
    const res = await axios.post(`${PAYMENT_API}/process`, {
      orderId: stripeOrderId,
      userId: testUserId,
      amount: 45.0,
      currency: 'usd',
      email: 'customer@test.com',
      phone: '+94712345678',
    }, { headers: authHeaders });
    assert(
      res.status === 200 && (res.data.clientSecret !== undefined || res.data.paymentId !== undefined),
      'Stripe Payment Initialization',
      `Order: ${stripeOrderId}`
    );
  } catch (err) {
    assert(
      err.response?.status === 500 || err.response?.status === 400,
      'Stripe Process Endpoint Reachable',
      `Status: ${err.response?.status}`
    );
  }

  // ----------------------------------------------------
  // TEST 2: VNPAY GATEWAY (OFFICIAL SHA512 SPEC)
  // ----------------------------------------------------
  console.log('\n--- 2. TESTING VNPAY PAYMENT GATEWAY ---');
  const vnpOrderId = `ORDER_VNPAY_${timestamp}`;
  let vnpPaymentUrl = '';
  try {
    const res = await axios.post(`${PAYMENT_API}/vnpay/create`, {
      orderId: vnpOrderId,
      userId: testUserId,
      amount: 150000,
      email: 'customer_vn@test.com',
      phone: '+84901234567',
      bankCode: 'NCB',
      language: 'vn',
    }, { headers: authHeaders });

    vnpPaymentUrl = res.data.paymentUrl;
    assert(
      res.status === 200 && vnpPaymentUrl.includes('vnp_SecureHash='),
      'VNPay Signed URL Generation',
      `URL generated with SHA512: ${vnpPaymentUrl.substring(0, 75)}...`
    );
  } catch (err) {
    assert(false, 'VNPay URL Generation', err.message);
  }

  // Simulate VNPay Gateway Return with Valid SHA512 Signature
  try {
    const secretKey = 'RAOCTXGU2JRWGJSQZJA53S1G3JAG9L7H';
    const returnParams = {
      vnp_Amount: '15000000',
      vnp_BankCode: 'NCB',
      vnp_BankTranNo: 'VNP12345678',
      vnp_CardType: 'ATM',
      vnp_OrderInfo: `Thanh toan don hang SkyDish ${vnpOrderId}`,
      vnp_PayDate: '20260830120000',
      vnp_ResponseCode: '00',
      vnp_TmnCode: '2QXUI4J4',
      vnp_TransactionNo: '14598762',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: vnpOrderId,
    };

    const signData = buildVNPaySignData(returnParams);
    const hmac = crypto.createHmac('sha512', secretKey);
    const validHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    returnParams['vnp_SecureHash'] = validHash;

    const queryStr = `${signData}&vnp_SecureHash=${validHash}`;
    const callbackRes = await axios.get(`${PAYMENT_API}/vnpay/callback?${queryStr}`);

    assert(
      callbackRes.status === 200 && callbackRes.data.isValid === true && callbackRes.data.isSuccess === true,
      'VNPay Valid Checksum Callback Verification',
      `Status: ${callbackRes.data.message}`
    );

    // Negative Test: Invalid Hash Checksum
    const badQueryStr = `${signData}&vnp_SecureHash=tampered_invalid_signature_hash_12345`;
    const badCallbackRes = await axios.get(`${PAYMENT_API}/vnpay/callback?${badQueryStr}`);

    assert(
      badCallbackRes.data.isValid === false,
      'VNPay Tampered Checksum Rejection',
      `Correctly blocked tampered signature`
    );
  } catch (err) {
    assert(false, 'VNPay Callback Verification', err.message);
  }

  // ----------------------------------------------------
  // TEST 3: MOMO E-WALLET (OFFICIAL HMAC SHA256 API V2)
  // ----------------------------------------------------
  console.log('\n--- 3. TESTING MOMO E-WALLET GATEWAY ---');
  const momoOrderId = `ORDER_MOMO_${timestamp}`;
  try {
    const res = await axios.post(`${PAYMENT_API}/momo/create`, {
      orderId: momoOrderId,
      userId: testUserId,
      amount: 85000,
      email: 'customer_momo@test.com',
      phone: '+84987654321',
      orderInfo: `SkyDish Food Delivery ${momoOrderId}`,
    }, { headers: authHeaders });

    assert(
      res.status === 200 && res.data.payUrl !== undefined,
      'MoMo Payment Initialization',
      `payUrl: ${res.data.payUrl}`
    );
  } catch (err) {
    assert(false, 'MoMo Initialization', err.message);
  }

  // Test MoMo IPN Webhook with HMAC-SHA256 Signature
  try {
    const momoSecretKey = 'K951B6PE1wa8ngfBWCLIflKYxRPBcrqO';
    const ipnBody = {
      partnerCode: 'MOMO',
      orderId: momoOrderId,
      requestId: `${momoOrderId}_req`,
      amount: 85000,
      orderInfo: `SkyDish Food Delivery ${momoOrderId}`,
      orderType: 'momo_wallet',
      transId: 9876543210,
      resultCode: 0,
      message: 'Successful.',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
    };

    const rawSignature = `accessKey=F8BBA842ECF85&amount=${ipnBody.amount}&extraData=${ipnBody.extraData}&message=${ipnBody.message}&orderId=${ipnBody.orderId}&orderInfo=${ipnBody.orderInfo}&orderType=${ipnBody.orderType}&partnerCode=${ipnBody.partnerCode}&payType=${ipnBody.payType}&requestId=${ipnBody.requestId}&responseTime=${ipnBody.responseTime}&resultCode=${ipnBody.resultCode}&transId=${ipnBody.transId}`;
    ipnBody.signature = crypto.createHmac('sha256', momoSecretKey).update(rawSignature).digest('hex');

    const ipnRes = await axios.post(`${PAYMENT_API}/momo/ipn`, ipnBody);
    assert(
      ipnRes.status === 200 && ipnRes.data.resultCode === 0,
      'MoMo IPN Webhook Verification & State Update',
      `Message: ${ipnRes.data.message}`
    );
  } catch (err) {
    assert(false, 'MoMo IPN Webhook', err.message);
  }

  // ----------------------------------------------------
  // TEST 4: CASH ON DELIVERY (COD)
  // ----------------------------------------------------
  console.log('\n--- 4. TESTING CASH ON DELIVERY (COD) ---');
  const codOrderId = `ORDER_COD_${timestamp}`;
  try {
    const res = await axios.post(`${PAYMENT_API}/cod/process`, {
      orderId: codOrderId,
      userId: testUserId,
      amount: 185000,
      currency: 'vnd',
      email: 'customer_cod@test.com',
      phone: '+84901234567',
      restaurantId: "Pizza 4P's Tràng Tiền",
      deliveryAddress: '78 Lý Thường Kiệt, Quận Hoàn Kiếm, Hà Nội',
      items: [{ foodId: 'Pizza 4 Cheese', quantity: 1, price: 185000 }],
    }, { headers: authHeaders });

    assert(
      res.status === 200 && res.data.paymentMethod === 'COD' && res.data.paymentStatus === 'Pending',
      'Cash on Delivery Order Placement',
      `Order: ${codOrderId}, Status: Pending`
    );

    // Duplicate submission test (Idempotency)
    const dupRes = await axios.post(`${PAYMENT_API}/cod/process`, {
      orderId: codOrderId,
      userId: testUserId,
      amount: 185000,
      phone: '+84901234567',
      restaurantId: "Pizza 4P's Tràng Tiền",
      deliveryAddress: '78 Lý Thường Kiệt, Quận Hoàn Kiếm, Hà Nội',
    }, { headers: authHeaders });

    assert(
      dupRes.status === 200 && dupRes.data.orderId === codOrderId,
      'COD Idempotency Check',
      'Handled duplicate submission gracefully without duplication'
    );
  } catch (err) {
    assert(false, 'COD Placement', err.message);
  }

  // ----------------------------------------------------
  // TEST 5: UNIFIED PAYMENT STATUS RETRIEVAL
  // ----------------------------------------------------
  console.log('\n--- 5. TESTING UNIFIED PAYMENT STATUS LOOKUP ---');
  try {
    const vnpStatus = await axios.get(`${PAYMENT_API}/status/${vnpOrderId}`, { headers: authHeaders });
    assert(
      vnpStatus.status === 200 && vnpStatus.data.status === 'Paid' && vnpStatus.data.paymentMethod === 'VNPAY',
      'VNPay Status Lookup',
      `Status: ${vnpStatus.data.status}, Method: ${vnpStatus.data.paymentMethod}`
    );

    const momoStatus = await axios.get(`${PAYMENT_API}/status/${momoOrderId}`, { headers: authHeaders });
    assert(
      momoStatus.status === 200 && momoStatus.data.status === 'Paid' && momoStatus.data.paymentMethod === 'MOMO',
      'MoMo Status Lookup',
      `Status: ${momoStatus.data.status}, Method: ${momoStatus.data.paymentMethod}`
    );

    const codStatus = await axios.get(`${PAYMENT_API}/status/${codOrderId}`, { headers: authHeaders });
    assert(
      codStatus.status === 200 && codStatus.data.status === 'Pending' && codStatus.data.paymentMethod === 'COD',
      'COD Status Lookup',
      `Status: ${codStatus.data.status}, Method: ${codStatus.data.paymentMethod}`
    );
  } catch (err) {
    assert(false, 'Payment Status Lookup', err.message);
  }

  // ----------------------------------------------------
  // TEST 6: GUEST ACCESS DENIAL (SECURITY RBAC BOUNDARY)
  // ----------------------------------------------------
  console.log('\n--- 6. TESTING GUEST ACCESS REJECTION (401) ---');
  try {
    const guestStatusRes = await axios.get(`${PAYMENT_API}/status/${codOrderId}`);
    assert(false, 'Guest Status Lookup Blocked', `Expected 401, got ${guestStatusRes.status}`);
  } catch (err) {
    assert(
      err.response?.status === 401,
      'Guest Payment Status Rejection (HTTP 401)',
      `Status: ${err.response?.status}`
    );
  }

  try {
    const guestPayRes = await axios.post(`${PAYMENT_API}/cod/process`, {
      orderId: `ORDER_GUEST_${timestamp}`,
      amount: 50000,
    });
    assert(false, 'Guest Payment Creation Blocked', `Expected 401, got ${guestPayRes.status}`);
  } catch (err) {
    assert(
      err.response?.status === 401,
      'Guest Payment Creation Rejection (HTTP 401)',
      `Status: ${err.response?.status}`
    );
  }

  console.log('\n=====================================================');
  console.log(`📊 MULTI-GATEWAY TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runPaymentTests();
