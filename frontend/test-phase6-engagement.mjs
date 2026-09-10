import axios from 'axios';

const RESTAURANT_URL = 'http://localhost:5002';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASSED] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAILED] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=====================================================');
  console.log('🚀 PHASE 6: CUSTOMER ENGAGEMENT & DISCOVERY BACKEND TESTS');
  console.log('=====================================================\n');

  let testRestaurantId = '';
  let testRestaurantToken = '';

  // 0. Setup: Get a real restaurant
  try {
    const res = await axios.get(`${RESTAURANT_URL}/api/restaurant`);
    if (res.data && res.data.length > 0) {
      testRestaurantId = res.data[0]._id;
    }
  } catch (e) {
    console.error('Setup error getting restaurant:', e.message);
  }

  // --- 1. TEST ADVANCED SEARCH ---
  console.log('--- 1. TESTING ADVANCED SEARCH & DISCOVERY ---');
  try {
    const searchRes = await axios.get(`${RESTAURANT_URL}/api/search?q=phở`);
    assert(searchRes.status === 200, 'Search endpoint returns status 200');
    assert(Array.isArray(searchRes.data.restaurants), 'Search returns restaurants array');
    assert(Array.isArray(searchRes.data.foods), 'Search returns foods array');
    assert(searchRes.data.totalResults >= 0, `Search totalResults: ${searchRes.data.totalResults}`);

    const suggestRes = await axios.get(`${RESTAURANT_URL}/api/search/suggest?q=p`);
    assert(suggestRes.status === 200, 'Suggest endpoint returns status 200');
    assert(Array.isArray(suggestRes.data.suggestions), 'Suggestions returns array of items');
  } catch (err) {
    assert(false, `Search failed: ${err.message}`);
  }

  // --- 2. TEST COUPONS & DISCOUNT ENGINE ---
  console.log('\n--- 2. TESTING COUPON & DISCOUNT ENGINE ---');
  try {
    // A. Valid Coupon SKYDISH20K on 150.000 ₫ order
    const valRes = await axios.post(`${RESTAURANT_URL}/api/coupons/validate`, {
      code: 'SKYDISH20K',
      orderAmount: 150000,
      restaurantId: testRestaurantId,
      customerId: 'test_cust_001',
    });
    assert(valRes.status === 200 && valRes.data.valid === true, 'SKYDISH20K validates successfully');
    assert(valRes.data.discountAmount === 20000, 'Discount amount is exactly 20.000 ₫');
    assert(valRes.data.finalAmount === 130000, 'Final amount correctly calculated to 130.000 ₫');

    // B. Minimum Order Restriction
    try {
      await axios.post(`${RESTAURANT_URL}/api/coupons/validate`, {
        code: 'SKYDISH20K',
        orderAmount: 50000, // Below 100k
        restaurantId: testRestaurantId,
      });
      assert(false, 'Should reject order below minOrderValue');
    } catch (minErr) {
      assert(minErr.response?.status === 400, 'Correctly rejected order below minimum value 100.000 ₫');
    }

    // C. Non-existent Coupon
    try {
      await axios.post(`${RESTAURANT_URL}/api/coupons/validate`, {
        code: 'INVALID_COUPON_123',
        orderAmount: 200000,
      });
      assert(false, 'Should reject non-existent coupon');
    } catch (invErr) {
      assert(invErr.response?.status === 404, 'Correctly rejected non-existent coupon code');
    }

    // D. Fetch all public coupons
    const listRes = await axios.get(`${RESTAURANT_URL}/api/coupons`);
    assert(listRes.status === 200 && listRes.data.length >= 4, `Coupons list returned ${listRes.data.length} coupons`);
  } catch (err) {
    assert(false, `Coupon testing error: ${err.message}`);
  }

  // --- 3. TEST IN-APP NOTIFICATIONS & PERSISTENCE ---
  console.log('\n--- 3. TESTING NOTIFICATIONS & PERSISTENCE ---');
  let testNotifId = '';
  try {
    const testUserId = `cust_${Date.now()}`;

    // A. Create notification
    const createNotif = await axios.post(`${RESTAURANT_URL}/api/notifications/create`, {
      userId: testUserId,
      role: 'customer',
      type: 'order',
      title: 'Đơn hàng đã được xác nhận!',
      message: 'Nhà hàng đang chuẩn bị món cho bạn.',
      entityType: 'order',
      entityId: 'ord_999',
    });
    assert(createNotif.status === 201, 'Created persistent notification in database');
    testNotifId = createNotif.data.notification._id;

    // B. Get notifications for user
    const getNotifs = await axios.get(`${RESTAURANT_URL}/api/notifications?userId=${testUserId}`);
    assert(getNotifs.data.notifications.length === 1, 'Retrieved persisted notification across session');
    assert(getNotifs.data.unreadCount === 1, 'Unread count is 1');

    // C. Mark as read
    const readRes = await axios.put(`${RESTAURANT_URL}/api/notifications/${testNotifId}/read`);
    assert(readRes.status === 200 && readRes.data.notification.isRead === true, 'Marked single notification as read');

    // D. Verify unread count is now 0
    const unreadRes = await axios.get(`${RESTAURANT_URL}/api/notifications/unread-count?userId=${testUserId}`);
    assert(unreadRes.data.unreadCount === 0, 'Unread count correctly updated to 0');
  } catch (err) {
    assert(false, `Notification testing error: ${err.message}`);
  }

  // --- 4. TEST RATINGS & REVIEWS ---
  console.log('\n--- 4. TESTING RATINGS & REVIEWS ---');
  try {
    const testOrderId = `ord_review_${Date.now()}`;
    const testCustomerId = `cust_${Date.now()}`;

    // A. Submit Review
    const submitRev = await axios.post(`${RESTAURANT_URL}/api/reviews`, {
      orderId: testOrderId,
      customerId: testCustomerId,
      customerName: 'Nguyễn Văn Test',
      restaurantId: testRestaurantId,
      rating: 5,
      comment: 'Món ăn rất ngon và nóng hổi, phục vụ nhanh!',
    });
    assert(submitRev.status === 201, 'Customer successfully submitted review for completed order');

    // B. Anti-duplicate check on same order
    try {
      await axios.post(`${RESTAURANT_URL}/api/reviews`, {
        orderId: testOrderId,
        customerId: testCustomerId,
        restaurantId: testRestaurantId,
        rating: 4,
        comment: 'Thử gửi đánh giá lần 2',
      });
      assert(false, 'Should block duplicate review on same order');
    } catch (dupErr) {
      assert(dupErr.response?.status === 400, 'Anti-abuse correctly prevented duplicate review on same order');
    }

    // C. Get reviews and calculated rating for restaurant
    const revSummary = await axios.get(`${RESTAURANT_URL}/api/reviews/restaurant/${testRestaurantId}`);
    assert(revSummary.status === 200, 'Fetched restaurant reviews');
    assert(revSummary.data.totalReviews >= 1, `Total reviews recorded: ${revSummary.data.totalReviews}`);
    assert(revSummary.data.averageRating >= 1 && revSummary.data.averageRating <= 5, `Calculated average rating: ${revSummary.data.averageRating}⭐`);
    assert(revSummary.data.distribution[5] >= 1, 'Rating distribution includes 5-star review');
  } catch (err) {
    assert(false, `Review testing error: ${err.message}`);
  }

  console.log('\n=====================================================');
  console.log(`📊 PHASE 6 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests();
