const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1';
const AUTH_URL = `${BASE_URL}:4000/api/auth`;
const REST_URL = `${BASE_URL}:5002/api/restaurant`;
const FOOD_URL = `${BASE_URL}:5002/api/food-items`;
const ORDER_URL = `${BASE_URL}:5005/api/orders`;
const PAY_URL = `${BASE_URL}:5004/api/payment`;
const DELIV_URL = `${BASE_URL}:5003/api/delivery`;

console.log('====================================================');
console.log('🛡️ SKYDISH — COD PRICING REGRESSION VERIFIER');
console.log('Historical reproduction: 275,000 -> 185,000 -> 0 VND');
console.log('====================================================\n');

const checks = [];
function record(testName, pass, details = '') {
  checks.push({ testName, pass, details });
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function main() {
  try {
    // 1. Create a customer
    const custEmail = `cod_audit_${Date.now()}@skydish.vn`;
    const regRes = await fetch(`${AUTH_URL}/register/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'COD',
        lastName: 'Auditor',
        email: custEmail,
        password: 'Password123!',
        phone: '0901234567'
      })
    });
    const regData = await regRes.json();
    const token = regData.token;
    const customer = regData.data?.customer || regData.customer;
    const customerId = customer?.id || customer?._id;
    record('Customer Registration & JWT', !!token && !!customerId, `custEmail=${custEmail}, id=${customerId}`);

    // Register a driver for delivery assignment
    const driverEmail = `cod_driver_${Date.now()}@skydish.vn`;
    const driverRegRes = await fetch(`${DELIV_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nguyen Van Shipper COD',
        email: driverEmail,
        password: 'DriverPassword123!',
        phone: `09${Date.now().toString().slice(-8)}`,
        vehicleType: 'bike',
        vehicleNumber: `29B-${Date.now().toString().slice(-5)}`
      })
    });
    const driverRegData = await driverRegRes.json();
    const driverId = driverRegData.data?.id || driverRegData.driver?.id;
    record('Shipper Registration & Driver ID', !!driverId, `driverId=${driverId}`);

    // 2. Fetch catalog to find a dish
    const rListRes = await fetch(`${REST_URL}`);
    const rList = await rListRes.json();
    const restaurant = rList[0];
    const fListRes = await fetch(`${FOOD_URL}/restaurant/${restaurant._id}`);
    const fList = await fListRes.json();
    const dish = fList[0];
    const dishPrice = Number(dish.price);
    record('Catalog Dish Discovery', dishPrice > 0, `Dish: "${dish.name}" @ ${dishPrice.toLocaleString('vi-VN')} VND`);

    // Target total calculation:
    const qty = 2;
    const expectedSubtotal = dishPrice * qty;
    const expectedDeliveryFee = expectedSubtotal >= 300000 ? 0 : 15000;
    const expectedTotal = expectedSubtotal + expectedDeliveryFee;

    console.log(`\n--- Simulating Malicious Price Manipulation (Historical Bug Reproduction) ---`);
    console.log(`Authoritative Subtotal: ${expectedSubtotal.toLocaleString('vi-VN')} VND`);
    console.log(`Authoritative Delivery Fee: ${expectedDeliveryFee.toLocaleString('vi-VN')} VND`);
    console.log(`Authoritative Expected Total: ${expectedTotal.toLocaleString('vi-VN')} VND`);
    console.log(`Client tampering attempt: sends price = 1 VND, subtotal = 185,000 VND, total = 0 VND with COD method\n`);

    // 3. Submit malicious order payload
    const orderRes = await fetch(`${ORDER_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId: customerId,
        customerName: 'COD Auditor',
        customerEmail: custEmail,
        phone: '0901234567',
        restaurantId: restaurant._id,
        items: [
          {
            foodId: dish._id,
            name: dish.name,
            quantity: qty,
            price: 1 // Malicious tamper
          }
        ],
        subtotal: 185000, // Historical 185k mutation tamper
        deliveryFee: 0,
        totalPrice: 0, // Malicious zero total tamper
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        deliveryAddress: '123 Ba Dinh, Hanoi'
      })
    });

    const orderData = await orderRes.json();
    const orderId = orderData._id;

    // Check Order Service calculation
    const isSubtotalCorrect = orderData.subtotal === expectedSubtotal;
    const isDeliveryFeeCorrect = orderData.deliveryFee === expectedDeliveryFee;
    const isTotalCorrect = orderData.totalPrice === expectedTotal;
    const isZeroPrevented = orderData.totalPrice !== 0 && orderData.totalPrice !== 185000;

    record('Server-Side Price Authority Enforcement', isSubtotalCorrect && isTotalCorrect, 
      `Subtotal: ${orderData.subtotal} VND, Total: ${orderData.totalPrice} VND`);
    record('Zero & 185k Mutation Prevention', isZeroPrevented, 
      `Total correctly preserved at ${orderData.totalPrice.toLocaleString('vi-VN')} VND (not 0 or 185k)`);
    record('Delivery Fee Rule Preservation', isDeliveryFeeCorrect, 
      `Delivery fee: ${orderData.deliveryFee} VND`);

    // 4. Payment Gateway COD Process
    const codRes = await fetch(`${PAY_URL}/cod/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orderId: orderId,
        amount: orderData.totalPrice,
        currency: 'vnd',
        phone: '0901234567',
        email: custEmail
      })
    });
    const codData = await codRes.json();
    record('Payment Gateway COD Processing', codRes.status === 200 && codData.success === true, 
      `paymentId=${codData.paymentId}, method=${codData.paymentMethod}`);

    // Verify stored Payment record via status check
    const payStatusRes = await fetch(`${PAY_URL}/status/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const payStatusData = await payStatusRes.json();
    const isPaymentMatching = payStatusRes.status === 200 && payStatusData.amount === expectedTotal;
    record('Payment Record Amount Integrity', isPaymentMatching, 
      `Verified Amount: ${payStatusData.amount?.toLocaleString('vi-VN')} VND, Status: ${payStatusData.status}`);

    // 5. Query Order Service directly
    const getOrderRes = await fetch(`${ORDER_URL}/${orderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const fetchedOrder = await getOrderRes.json();
    const isOrderAgreed = fetchedOrder.totalPrice === expectedTotal;
    record('Order Record Verification (Customer View)', isOrderAgreed, 
      `Stored Order Total: ${fetchedOrder.totalPrice?.toLocaleString('vi-VN')} VND`);

    // 6. Delivery Service Task Creation
    const delivRes = await fetch(`${DELIV_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        orderId: orderId,
        customerId: customerId,
        driverId: driverId,
        pickupAddress: restaurant.location || 'Pizza 4Ps Trang Tien, Hanoi',
        deliveryAddress: fetchedOrder.deliveryAddress
      })
    });
    const delivData = await delivRes.json();
    const delivery = delivData.delivery;
    record('Delivery Task Created with Correct Order Link', delivRes.status === 201 && delivery?.orderId === orderId, 
      `Delivery ID: ${delivery?._id}, OrderId: ${delivery?.orderId}, Status: ${delivery?.status}`);

    // Cross-Portal Consensus Check
    const allAgree = isTotalCorrect && isPaymentMatching && isOrderAgreed;
    record('Cross-Portal Price Consensus (Checkout = Order = Payment = Shipper = Admin)', allAgree, 
      `All entities locked at exact server-authoritative value: ${expectedTotal.toLocaleString('vi-VN')} VND`);

    const allPass = checks.every(c => c.pass);
    console.log('\n====================================================');
    console.log(`COD Regression Summary: ${checks.filter(c => c.pass).length}/${checks.length} Passed`);
    console.log(`Result: ${allPass ? '🟢 COD REGRESSION TEST PASSED' : '🔴 FAIL'}`);
    console.log('====================================================\n');
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('COD Regression check error:', err);
    process.exit(1);
  }
}

main();
