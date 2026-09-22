import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DEMO_PASSWORD = 'password123';

const VIETNAM_RESTAURANTS = [
  {
    name: "Pizza 4P's Tràng Tiền",
    ownerName: "Yosuke Masuko",
    location: "11B Tràng Tiền, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "02836220500",
    profilePicture: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=700&auto=format&fit=crop&q=80",
    email: "trangtien@pizza4ps.com",
    availability: true,
    foods: [
      {
        name: "Pizza 4 Cheese Kèm Mật Ong",
        description: "Pizza 4 loại phô mai thủ công hảo hạng kèm mật ong ngọt dịu",
        price: 260000,
        category: "Pizza",
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Pizza Gà Teriyaki Rong Biển",
        description: "Gà sốt teriyaki thơm lừng kết hợp rong biển và sốt mayonnaise",
        price: 220000,
        category: "Pizza",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Mỳ Ý Cua Sốt Kem Cà Chua",
        description: "Thịt cua tươi đậm đà quyện sốt kem cà chua béo ngậy",
        price: 245000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Salad Phô Mai Burrata Trái Cây",
        description: "Phô mai Burrata tươi ăn kèm trái cây nhiệt đới và sốt balsamic",
        price: 185000,
        category: "Tráng miệng",
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Phở Thìn Lò Đúc",
    ownerName: "Nguyễn Trọng Thìn",
    location: "13 Lò Đúc, Phường Phạm Đình Hổ, Quận Hai Bà Trưng, Hà Nội",
    contactNumber: "0979668868",
    profilePicture: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=700&auto=format&fit=crop&q=80",
    email: "phothin13loduc@gmail.com",
    availability: true,
    foods: [
      {
        name: "Phở Bò Tái Lăn Truyền Thống",
        description: "Bò xào lăn lửa lớn ngập tràn hành hoa và nước dùng đậm đà",
        price: 85000,
        category: "Phở",
        image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Quẩy Giòn Ăn Kèm",
        description: "Quẩy giòn rụm chiên mới thơm nức ăn cùng nước phở",
        price: 10000,
        category: "Món phụ",
        image: "https://upload.wikimedia.org/wikipedia/commons/7/78/Youtiao.jpg",
      },
      {
        name: "Trứng Chần Béo Ngậy",
        description: "Trứng gà ta chần lòng đào cùng nước dùng phở bò nóng hổi",
        price: 15000,
        category: "Món phụ",
        image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80",
      }
    ],
  },
  {
    name: "Bún Chả Hương Liên (Obama)",
    ownerName: "Nguyễn Thị Hằng Nga",
    location: "24 Lê Văn Hưu, Phan Chu Trinh, Hai Bà Trưng, Hà Nội",
    contactNumber: "02439434106",
    profilePicture: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&auto=format&fit=crop&q=80",
    email: "bunchahuonglien@gmail.com",
    availability: true,
    foods: [
      {
        name: "Suất Bún Chả Đặc Biệt Obama",
        description: "Chả miếng, chả viên nướng than hoa ăn cùng nem cua bể giòn rụm",
        price: 90000,
        category: "Bún & Mì",
        image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Nem Cua Bể Hải Phòng",
        description: "Nem cua bể gói vuông nhân thịt cua tươi thơm lừng",
        price: 35000,
        category: "Món phụ",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
      }
    ],
  },
  {
    name: "Cơm Tấm Phúc Lộc Thọ",
    ownerName: "Phúc Lộc Thọ Group",
    location: "223 Nguyễn Trãi, Phường 2, Quận 5, TP.HCM",
    contactNumber: "19006552",
    profilePicture: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=700&auto=format&fit=crop&q=80",
    email: "comtamphucloctho@gmail.com",
    availability: true,
    foods: [
      {
        name: "Cơm Tấm Sườn Bì Chả Đặc Biệt",
        description: "Sườn nướng mật ong đậm vị, bì thơm giòn, chả trứng hấp béo bùi",
        price: 65000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Canh Khổ Qua Nhồi Thịt",
        description: "Canh khổ qua giải nhiệt, nước hầm thanh ngọt tự nhiên",
        price: 25000,
        category: "Món phụ",
        image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=80",
      }
    ]
  },
  {
    name: "The Coffee House",
    ownerName: "Nguyễn Hải Ninh",
    location: "86 Cao Thắng, Phường 4, Quận 3, TP.HCM",
    contactNumber: "18006936",
    profilePicture: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=700&auto=format&fit=crop&q=80",
    email: "contact@thecoffeehouse.vn",
    availability: true,
    foods: [
      {
        name: "Cà Phê Sữa Đá Đậm Đà",
        description: "Cà phê Robusta Đắk Lắk truyền thống thơm nồng quyện sữa đặc",
        price: 39000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Trà Đào Cam Sả Tươi Mát",
        description: "Trà đen thơm ngọt ngào kết hợp đào vàng giòn giòn, sả thơm",
        price: 52000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80",
      }
    ]
  }
];

const DEFAULT_COUPONS = [
  {
    code: 'SKYDISH20K',
    description: 'Giảm 20.000 ₫ cho đơn hàng từ 100.000 ₫',
    discountType: 'fixed',
    discountValue: 20000,
    minOrderValue: 100000,
    restaurantId: 'PLATFORM',
    usageLimit: 1000,
    isActive: true,
  },
  {
    code: 'FREESHIP',
    description: 'Miễn phí vận chuyển 25.000 ₫ cho đơn từ 150.000 ₫',
    discountType: 'shipping',
    discountValue: 25000,
    minOrderValue: 150000,
    restaurantId: 'PLATFORM',
    usageLimit: 1000,
    isActive: true,
  },
  {
    code: 'SKYDISH10',
    description: 'Giảm 10% tối đa 50.000 ₫ cho đơn từ 200.000 ₫',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 200000,
    maxDiscount: 50000,
    restaurantId: 'PLATFORM',
    usageLimit: 500,
    isActive: true,
  },
  {
    code: 'AMTHUC15K',
    description: 'Giảm ngay 15.000 ₫ cho mọi đơn hàng từ 80.000 ₫',
    discountType: 'fixed',
    discountValue: 15000,
    minOrderValue: 80000,
    restaurantId: 'PLATFORM',
    usageLimit: 1000,
    isActive: true,
  }
];

export async function seedAll() {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const db = mongoose.connection.db;

  console.log('🌱 Starting Idempotent SkyDish Seed Process...');

  // 1. Super Admin Account
  const adminExists = await db.collection('superadmins').findOne({ email: 'admin@skydish.com' });
  if (!adminExists) {
    await db.collection('superadmins').insertOne({
      name: 'SkyDish Super Admin',
      email: 'admin@skydish.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Created Demo Super Admin: admin@skydish.com');
  } else {
    console.log('ℹ️ Demo Super Admin already exists.');
  }

  // 2. Customer Account
  const customerExists = await db.collection('customers').findOne({ email: 'customer@skydish.com' });
  if (!customerExists) {
    await db.collection('customers').insertOne({
      firstName: 'Lợi',
      lastName: 'Lê Văn',
      email: 'customer@skydish.com',
      phone: '0932366523',
      location: 'Hà Nội, Việt Nam',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Created Demo Customer: customer@skydish.com');
  } else {
    console.log('ℹ️ Demo Customer already exists.');
  }

  // 3. Driver / Shipper Account
  const driverExists = await db.collection('drivers').findOne({ email: 'driver@skydish.com' });
  if (!driverExists) {
    await db.collection('drivers').insertOne({
      name: 'Trần Văn Giao Hàng',
      email: 'driver@skydish.com',
      phone: '0987654321',
      vehicleType: 'bike',
      password: hashedPassword,
      status: 'Available',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Created Demo Shipper: driver@skydish.com');
  } else {
    console.log('ℹ️ Demo Shipper already exists.');
  }

  // 4. Coupons
  for (const c of DEFAULT_COUPONS) {
    await db.collection('coupons').updateOne(
      { code: c.code },
      { $set: { ...c, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }
  console.log(`✅ Seeded ${DEFAULT_COUPONS.length} Platform Coupons`);

  // 5. Authentic Vietnamese Restaurants & Foods
  let seededRests = 0;
  let seededFoods = 0;

  for (const r of VIETNAM_RESTAURANTS) {
    let restaurant = await db.collection('restaurants').findOne({
      $or: [{ name: r.name }, { email: r.email }, { 'admin.email': r.email }]
    });

    let rId;
    if (!restaurant) {
      const insRes = await db.collection('restaurants').insertOne({
        name: r.name,
        ownerName: r.ownerName,
        location: r.location,
        contactNumber: r.contactNumber,
        profilePicture: r.profilePicture,
        email: r.email,
        admin: {
          email: r.email,
          password: hashedPassword,
        },
        availability: r.availability,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      rId = insRes.insertedId;
      seededRests++;
    } else {
      rId = restaurant._id;
      await db.collection('restaurants').updateOne(
        { _id: rId },
        {
          $set: {
            name: r.name,
            ownerName: r.ownerName,
            location: r.location,
            contactNumber: r.contactNumber,
            profilePicture: r.profilePicture,
            availability: r.availability,
            updatedAt: new Date(),
          }
        }
      );
    }

    for (const f of r.foods) {
      const foodExists = await db.collection('fooditems').findOne({
        restaurant: rId,
        name: f.name,
      });

      if (!foodExists) {
        await db.collection('fooditems').insertOne({
          restaurant: rId,
          name: f.name,
          description: f.description,
          price: f.price,
          category: f.category,
          image: f.image,
          availability: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        seededFoods++;
      } else {
        await db.collection('fooditems').updateOne(
          { _id: foodExists._id },
          {
            $set: {
              description: f.description,
              price: f.price,
              category: f.category,
              image: f.image,
              availability: true,
              updatedAt: new Date(),
            }
          }
        );
      }
    }
  }

  console.log(`✅ Seeded ${VIETNAM_RESTAURANTS.length} Restaurants & Dishes successfully!`);
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith('seed-all.mjs')) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27000/food_delivery_db';
  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  mongoose.connect(mongoUri)
    .then(async () => {
      await seedAll();
      console.log('🎉 Seeding complete!');
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    });
}
