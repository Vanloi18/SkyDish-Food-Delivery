import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const DEMO_CUSTOMERS = [
  { firstName: "Minh", lastName: "Anh", email: "reviewer.minhanh@skydish.local", phone: "0900000101" },
  { firstName: "Thu", lastName: "Linh", email: "reviewer.thulinh@skydish.local", phone: "0900000102" },
  { firstName: "Quang", lastName: "Huy", email: "reviewer.quanghuy@skydish.local", phone: "0900000103" },
  { firstName: "Ngọc", lastName: "Mai", email: "reviewer.ngocmai@skydish.local", phone: "0900000104" },
  { firstName: "Gia", lastName: "Bảo", email: "reviewer.giabao@skydish.local", phone: "0900000105" },
];

const REVIEW_CONTENT = [
  { rating: 4, comment: "Món ngon, đóng gói sạch sẽ, giao đúng món. Mình sẽ thử thêm món khác lần sau.", images: ["https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&auto=format&fit=crop&q=80"] },
  { rating: 4, comment: "Hương vị ổn, khẩu phần vừa phải và giao khá nhanh. Đáng để đặt lại.", images: ["https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&auto=format&fit=crop&q=80"] },
  { rating: 5, comment: "Rất hài lòng, món còn nóng và nêm vừa vị. Tài xế giao nhanh.", images: ["https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&auto=format&fit=crop&q=80"] },
  { rating: 5, comment: "Món đúng mô tả, trình bày đẹp, đóng gói chắc chắn. Mình sẽ đặt lại.", images: ["https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80"] },
  { rating: 5, comment: "Trải nghiệm rất tốt, món ngon và giao đúng giờ. Highly recommend.", images: ["https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80"] },
];

export async function seedDemoReviews(db) {
  const password = await bcrypt.hash("password123", 10);
  const restaurants = await db.collection("restaurants").find({ availability: true }).sort({ createdAt: 1 }).limit(DEMO_CUSTOMERS.length).toArray();
  let customersCreated = 0;
  let ordersCreated = 0;
  let reviewsCreated = 0;

  for (let index = 0; index < DEMO_CUSTOMERS.length; index += 1) {
    const customerData = DEMO_CUSTOMERS[index];
    let customer = await db.collection("customers").findOne({ email: customerData.email });
    if (!customer) {
      const result = await db.collection("customers").insertOne({
        ...customerData,
        location: "Việt Nam",
        password,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      customer = { _id: result.insertedId };
      customersCreated += 1;
    }

    const restaurant = restaurants[index];
    if (!restaurant) continue;
    const food = await db.collection("fooditems").findOne({ restaurant: restaurant._id, availability: true });
    if (!food) continue;

    const orderId = `DEMO-DELIVERED-${String(index + 1).padStart(3, "0")}`;
    const customerId = customer._id.toString();
    const existingOrder = await db.collection("orders").findOne({ orderId });
    if (!existingOrder) {
      const subtotal = Number(food.price || 0);
      await db.collection("orders").insertOne({
        _id: new ObjectId(),
        orderId,
        customerId,
        customerName: `${customerData.firstName} ${customerData.lastName}`,
        customerEmail: customerData.email,
        customerPhone: customerData.phone,
        restaurantId: restaurant._id.toString(),
        restaurantName: restaurant.name,
        items: [{ foodId: food._id.toString(), name: food.name, quantity: 1, price: subtotal }],
        subtotal,
        deliveryFee: 15000,
        discount: 0,
        totalPrice: subtotal + 15000,
        paymentMethod: "COD",
        paymentStatus: "Paid",
        status: "Delivered",
        deliveryAddress: restaurant.location,
        emailConfirmationSent: true,
        createdAt: new Date(Date.now() - (index + 1) * 86400000),
        updatedAt: new Date(Date.now() - (index + 1) * 86400000),
      });
      ordersCreated += 1;
    }

    const review = REVIEW_CONTENT[index];
    const existingReview = await db.collection("reviews").findOne({ orderId, customerId });
    if (!existingReview) {
      await db.collection("reviews").insertOne({
        orderId,
        customerId,
        customerName: `${customerData.firstName} ${customerData.lastName}`,
        restaurantId: restaurant._id,
        rating: review.rating,
        comment: review.comment,
        status: "active",
        reply: { comment: "", repliedAt: null },
        createdAt: new Date(Date.now() - (index + 1) * 86400000),
        updatedAt: new Date(Date.now() - (index + 1) * 86400000),
      });
      reviewsCreated += 1;
    }
  }

  const allRestaurants = await db.collection("restaurants").find({ availability: true }).toArray();
  let foodReviewIndex = 0;
  for (const restaurant of allRestaurants) {
    const foods = await db.collection("fooditems").find({ restaurant: restaurant._id, availability: true }).toArray();
    for (const food of foods) {
      const customerData = DEMO_CUSTOMERS[foodReviewIndex % DEMO_CUSTOMERS.length];
      const customer = await db.collection("customers").findOne({ email: customerData.email });
      if (!customer) continue;
      const review = REVIEW_CONTENT[foodReviewIndex % REVIEW_CONTENT.length];
      const orderId = `DEMO-FOOD-${restaurant._id.toString().slice(-6)}-${food._id.toString().slice(-6)}`;
      const customerId = customer._id.toString();
      const existingOrder = await db.collection("orders").findOne({ orderId });
      if (!existingOrder) {
        const subtotal = Number(food.price || 0);
        await db.collection("orders").insertOne({
          _id: new ObjectId(), orderId, customerId,
          customerName: `${customerData.firstName} ${customerData.lastName}`,
          customerEmail: customerData.email, customerPhone: customerData.phone,
          restaurantId: restaurant._id.toString(), restaurantName: restaurant.name,
          items: [{ foodId: food._id.toString(), name: food.name, quantity: 1, price: subtotal }],
          subtotal, deliveryFee: 15000, discount: 0, totalPrice: subtotal + 15000,
          paymentMethod: "COD", paymentStatus: "Paid", status: "Delivered",
          deliveryAddress: restaurant.location, emailConfirmationSent: true,
          createdAt: new Date(Date.now() - (foodReviewIndex + 1) * 3600000),
          updatedAt: new Date(Date.now() - (foodReviewIndex + 1) * 3600000),
        });
        ordersCreated += 1;
      }
      const existingReview = await db.collection("reviews").findOne({ orderId, customerId });
      if (!existingReview) {
        await db.collection("reviews").insertOne({
          orderId, customerId, customerName: `${customerData.firstName} ${customerData.lastName}`,
          restaurantId: restaurant._id, rating: review.rating, comment: review.comment,
          status: "active", reply: { comment: "", repliedAt: null },
          createdAt: new Date(Date.now() - (foodReviewIndex + 1) * 3600000),
          updatedAt: new Date(Date.now() - (foodReviewIndex + 1) * 3600000),
        });
        reviewsCreated += 1;
      }
      foodReviewIndex += 1;
    }
  }

  const demoReviews = await db.collection("reviews").find({ orderId: { $regex: /^DEMO-/ } }).toArray();
  for (let index = 0; index < demoReviews.length; index += 1) {
    const content = REVIEW_CONTENT[index % REVIEW_CONTENT.length];
    await db.collection("reviews").updateOne({ _id: demoReviews[index]._id }, { $set: { rating: content.rating, comment: content.comment, images: content.images, updatedAt: new Date() } });
  }

  return { customersCreated, ordersCreated, reviewsCreated };
}
