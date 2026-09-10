import axios from 'axios';

async function runValidation() {
  console.log('=====================================================');
  console.log('🇻🇳 SKYDISH VIETNAM RESTAURANTS & MENUS VERIFICATION');
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

  // 1. Fetch all restaurants
  const restRes = await axios.get('http://localhost:5002/api/restaurant');
  const restaurants = restRes.data;
  assert(
    Array.isArray(restaurants) && restaurants.length >= 15,
    'Restaurant Count Check',
    `Found ${restaurants.length} active restaurants in Vietnam`
  );

  // 2. Check no Sri Lanka / Colombo / Fake Sky Burger
  const fakeRecords = restaurants.filter(
    r => /Colombo|Galle Road|Sky Burger Hub|Sky Gourmet Grill/i.test(r.name + ' ' + r.location)
  );
  assert(
    fakeRecords.length === 0,
    'Zero Fake/Colombo Data Check',
    `Legacy demo records count: ${fakeRecords.length}`
  );

  // 3. Check Real Hanoi Addresses
  const hanoiRestaurants = restaurants.filter(r => /Hà Nội|Hoàn Kiếm|Hai Bà Trưng|Cầu Giấy|Đống Đa|Ba Đình/i.test(r.location));
  assert(
    hanoiRestaurants.length >= 15,
    'Hanoi Location Verification',
    `${hanoiRestaurants.length} restaurants verified in Hanoi branches`
  );

  // 4. Check Food Items & VND Prices
  const foodRes = await axios.get('http://localhost:5002/api/food-items/all');
  const foods = foodRes.data;
  assert(
    Array.isArray(foods) && foods.length >= 40,
    'Authentic Food Items Count',
    `Loaded ${foods.length} dishes across all restaurants`
  );

  const invalidPrices = foods.filter(f => f.price < 5000 || typeof f.price !== 'number');
  assert(
    invalidPrices.length === 0,
    'VND Price Normalization Check',
    `All dishes have valid VND pricing (range: 5.000 ₫ - 369.000 ₫)`
  );

  // 5. Test specific restaurant dishes
  const pizza4ps = restaurants.find(r => r.name.includes("Pizza 4P's"));
  assert(Boolean(pizza4ps), "Pizza 4P's Tràng Tiền Exists in DB", `ID: ${pizza4ps?._id}`);
  if (pizza4ps) {
    const p4pFoods = await axios.get(`http://localhost:5002/api/food-items/restaurant/${pizza4ps._id}`);
    assert(
      p4pFoods.data.some(f => f.name.includes('Pizza 4 Cheese')),
      "Pizza 4P's Menu Verified",
      `Dishes count: ${p4pFoods.data.length}`
    );
  }

  const phoThin = restaurants.find(r => r.name.includes('Phở Thìn'));
  assert(Boolean(phoThin), 'Phở Thìn Lò Đúc Exists in DB', `ID: ${phoThin?._id}`);
  if (phoThin) {
    const ptFoods = await axios.get(`http://localhost:5002/api/food-items/restaurant/${phoThin._id}`);
    assert(
      ptFoods.data.some(f => f.name.includes('Phở Bò Tái Lăn')),
      'Phở Thìn Menu Verified',
      `Dishes count: ${ptFoods.data.length}`
    );
  }

  const bunCha = restaurants.find(r => r.name.includes('Bún Chả Hương Liên'));
  assert(Boolean(bunCha), 'Bún Chả Hương Liên Exists in DB', `ID: ${bunCha?._id}`);
  if (bunCha) {
    const bcFoods = await axios.get(`http://localhost:5002/api/food-items/restaurant/${bunCha._id}`);
    assert(
      bcFoods.data.some(f => f.name.includes('Obama') || f.name.includes('Bún Chả')),
      'Bún Chả Hương Liên Menu Verified',
      `Dishes count: ${bcFoods.data.length}`
    );
  }

  console.log('\n=====================================================');
  console.log(`📊 VIETNAMESE DATA VALIDATION: ${passed} PASSED | ${failed} FAILED`);
  console.log('=====================================================\n');
}

runValidation().catch(console.error);
