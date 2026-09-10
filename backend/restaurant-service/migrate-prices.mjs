import mongoose from 'mongoose';

async function migrate() {
  await mongoose.connect('mongodb://127.0.0.1:27000/food_delivery_db');
  console.log('Connected to MongoDB');

  const foodItems = await mongoose.connection.db.collection('fooditems').find({}).toArray();
  let updatedCount = 0;
  for (const item of foodItems) {
    if (item.price < 10000) {
      const newPrice = item.price * 100;
      await mongoose.connection.db.collection('fooditems').updateOne(
        { _id: item._id },
        { $set: { price: newPrice } }
      );
      updatedCount++;
      console.log(`Updated ${item.name}: ${item.price} -> ${newPrice}`);
    }
  }
  console.log(`✅ Normalized ${updatedCount} food item prices to VND.`);

  // Also normalize legacy demo orders if totalPrice < 10000
  const orders = await mongoose.connection.db.collection('orders').find({}).toArray();
  let updatedOrders = 0;
  for (const ord of orders) {
    if (ord.totalPrice < 10000) {
      const newTotal = ord.totalPrice * 100;
      const newItems = ord.items?.map(it => ({
        ...it,
        price: it.price < 10000 ? it.price * 100 : it.price
      }));
      await mongoose.connection.db.collection('orders').updateOne(
        { _id: ord._id },
        { $set: { totalPrice: newTotal, items: newItems } }
      );
      updatedOrders++;
      console.log(`Updated Order ${ord._id}: ${ord.totalPrice} -> ${newTotal}`);
    }
  }
  console.log(`✅ Normalized ${updatedOrders} legacy order totals to VND.`);

  await mongoose.disconnect();
}

migrate().catch(console.error);
