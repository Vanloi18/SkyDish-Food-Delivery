import fs from 'fs';
import path from 'path';

async function testUploadAndSanitization() {
  console.log('🧪 Starting Restaurant Service upload and sanitization test...');
  const timestamp = Date.now();
  const restEmail = `test_partner_${timestamp}@skydish.vn`;
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  // 1x1 minimal valid PNG
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // 1. Register a test restaurant with a profile picture upload
  const regBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nBếp Thử Nghiệm ${timestamp}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="ownerName"\r\n\r\nTrần Văn Chủ\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="location"\r\n\r\n123 Phố Huế, Hà Nội\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="contactNumber"\r\n\r\n0988776655\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="email"\r\n\r\n${restEmail}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="password"\r\n\r\npassword123\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="profilePicture"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\n`),
    png1x1,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const regRes = await fetch('http://localhost:5002/api/restaurant/register', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: regBuffer
  });
  const regData = await regRes.json();
  console.log('Register status:', regRes.status, regData.message);
  if (!regRes.ok) {
    throw new Error('Restaurant register failed: ' + JSON.stringify(regData));
  }
  console.log('✅ Restaurant registered with profile picture file successfully (NO ENOENT)!');

  // 2. Login
  const loginRes = await fetch('http://localhost:5002/api/restaurant/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: restEmail, password: 'password123' })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    throw new Error('Restaurant login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('✅ Logged in successfully. Token acquired.');

  // 3. Create food item with file attachment
  const foodBoundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const foodBuffer = Buffer.concat([
    Buffer.from(`--${foodBoundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nPhở Gà Ta Thượng Hạng\r\n`),
    Buffer.from(`--${foodBoundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nNước dùng đậm đà thịt gà ta thơm ngọt\r\n`),
    Buffer.from(`--${foodBoundary}\r\nContent-Disposition: form-data; name="price"\r\n\r\n65000\r\n`),
    Buffer.from(`--${foodBoundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nPhở & Bún\r\n`),
    Buffer.from(`--${foodBoundary}\r\nContent-Disposition: form-data; name="image"; filename="pho_ga.png"\r\nContent-Type: image/png\r\n\r\n`),
    png1x1,
    Buffer.from(`\r\n--${foodBoundary}--\r\n`)
  ]);

  const foodRes = await fetch('http://localhost:5002/api/food-items/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${foodBoundary}`
    },
    body: foodBuffer
  });
  const foodData = await foodRes.json();
  console.log('Food create status:', foodRes.status);
  if (!foodRes.ok || !foodData.newFoodItem) {
    throw new Error('Upload food item failed: ' + JSON.stringify(foodData));
  }
  const foodItem = foodData.newFoodItem;
  console.log('✅ Food item created with image path:', foodItem.image);

  // 4. Verify static file serving
  const imgUrl = `http://localhost:5002${foodItem.image}`;
  const imgRes = await fetch(imgUrl);
  console.log(`Image fetch [${imgUrl}] status:`, imgRes.status, 'ContentType:', imgRes.headers.get('content-type'));
  if (imgRes.status !== 200) {
    throw new Error(`Failed to fetch uploaded image from ${imgUrl}`);
  }
  console.log('✅ Static /uploads route serves the uploaded file perfectly without ENOENT!');

  // 5. Test rejection of Windows local path (e.g. F:\Downloads\ga.jpg)
  const winPathRes = await fetch('http://localhost:5002/api/food-items/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Windows Path Test Item',
      description: 'Testing sanitization',
      price: 50000,
      category: 'Phở & Bún',
      image: 'F:\\Downloads\\ga.jpg'
    })
  });
  const winPathData = await winPathRes.json();
  console.log('Windows path creation image value:', JSON.stringify(winPathData.newFoodItem?.image));
  if (winPathData.newFoodItem?.image !== '') {
    throw new Error('Windows path was NOT stripped!');
  }
  console.log('✅ Windows local path "F:\\Downloads\\ga.jpg" successfully sanitized to empty string!');

  // Clean up
  await fetch(`http://localhost:5002/api/food-items/${foodItem._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (winPathData.newFoodItem?._id) {
    await fetch(`http://localhost:5002/api/food-items/${winPathData.newFoodItem._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  console.log('🧹 Cleaned up test food items.');
  console.log('🎉 All upload and sanitization tests PASSED 100%!');
}

testUploadAndSanitization().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
