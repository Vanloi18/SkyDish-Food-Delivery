const REAL_RESTAURANTS = [
  {
    name: "Bánh Mì Huỳnh Hoa",
    ownerName: "Huỳnh Hoa",
    location: "26 Lê Thị Riêng, Phường Bến Thành, Quận 1, TP.HCM",
    contactNumber: "02839250998",
    profilePicture: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&auto=format&fit=crop&q=85",
    email: "partner.banhmi.huynhhoa@skydish.local",
    foods: [
      { name: "Bánh Mì Đặc Biệt Huỳnh Hoa", description: "Bánh mì kẹp nhiều loại chả, thịt nguội, pate và đồ chua theo phong cách Huỳnh Hoa.", price: 58000, category: "Bánh mì", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&auto=format&fit=crop&q=85" },
      { name: "Bánh Mì Thịt Nguội", description: "Bánh mì vỏ giòn với thịt nguội, pate, bơ và rau dưa.", price: 45000, category: "Bánh mì", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Cơm Tấm Ba Ghiền",
    ownerName: "Cơm Tấm Ba Ghiền",
    location: "84 Đặng Văn Ngữ, Phường 10, Quận Phú Nhuận, TP.HCM",
    contactNumber: "02838445566",
    profilePicture: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=900&auto=format&fit=crop&q=85",
    email: "partner.comtam.baghien@skydish.local",
    foods: [
      { name: "Cơm Tấm Sườn Cốt Lết", description: "Cơm tấm ăn cùng sườn nướng than, mỡ hành và nước mắm chua ngọt.", price: 85000, category: "Cơm tấm", image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=700&auto=format&fit=crop&q=85" },
      { name: "Cơm Tấm Bì Chả", description: "Cơm tấm với bì, chả trứng hấp, đồ chua và mỡ hành.", price: 70000, category: "Cơm tấm", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Bún Bò Huế Đông Ba",
    ownerName: "Đông Ba Huế",
    location: "110A Nguyễn Du, Phường Bến Thành, Quận 1, TP.HCM",
    contactNumber: "02838220456",
    profilePicture: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=900&auto=format&fit=crop&q=85",
    email: "partner.bunbo.dongba@skydish.local",
    foods: [
      { name: "Bún Bò Huế Đặc Biệt", description: "Nước dùng sả ớt đậm đà với bún sợi to, thịt bò, chả cua và rau sống.", price: 79000, category: "Bún bò Huế", image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=700&auto=format&fit=crop&q=85" },
      { name: "Bún Bò Giò Heo", description: "Bún bò Huế với khoanh giò heo mềm, nước dùng thơm mùi sả.", price: 89000, category: "Bún bò Huế", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Bún Chả Đắc Kim",
    ownerName: "Bún Chả Đắc Kim",
    location: "1 Hàng Mành, Phường Hàng Gai, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "02438284401",
    profilePicture: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=900&auto=format&fit=crop&q=85",
    email: "partner.bunchadackim@skydish.local",
    foods: [
      { name: "Bún Chả Đắc Kim", description: "Bún chả Hà Nội với chả viên, chả miếng nướng than và nước chấm đu đủ xanh.", price: 90000, category: "Bún chả", image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=700&auto=format&fit=crop&q=85" },
      { name: "Nem Cua Bể", description: "Nem cua bể chiên giòn dùng kèm rau sống và bún.", price: 45000, category: "Món phụ", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Chả Cá Thăng Long Đường Thành",
    ownerName: "Chả Cá Thăng Long",
    location: "21 Đường Thành, Phường Cửa Đông, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "02439237373",
    profilePicture: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=900&auto=format&fit=crop&q=85",
    email: "partner.chacathanglong@skydish.local",
    foods: [
      { name: "Chả Cá Lăng Thăng Long", description: "Cá lăng nướng, đảo cùng thì là và hành hoa, dùng với bún và mắm tôm.", price: 180000, category: "Món Việt", image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=700&auto=format&fit=crop&q=85" },
      { name: "Lòng Cá Lăng Xào", description: "Lòng cá lăng xào nóng cùng hành và thì là theo phong vị Hà Nội.", price: 150000, category: "Món Việt", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Ngon Garden Nguyễn Du",
    ownerName: "Ngon Garden",
    location: "70 Nguyễn Du, Phường Nguyễn Du, Quận Hai Bà Trưng, Hà Nội",
    contactNumber: "02439445959",
    profilePicture: "https://images.unsplash.com/photo-1552566626-52f8b828?w=900&auto=format&fit=crop&q=85",
    email: "partner.ngongarden.nguyendu@skydish.local",
    foods: [
      { name: "Bánh Xèo Tôm Thịt", description: "Bánh xèo giòn rụm nhân tôm thịt, rau sống và nước chấm chua ngọt.", price: 120000, category: "Món Việt", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&auto=format&fit=crop&q=85" },
      { name: "Bánh Cuốn Nhân Thịt", description: "Bánh cuốn nóng nhân thịt băm, mộc nhĩ, hành phi và chả quế.", price: 85000, category: "Món Việt", image: "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Bánh Cuốn Bà Hoành",
    ownerName: "Bánh Cuốn Bà Hoành",
    location: "29 Thụy Khuê, Phường Thụy Khuê, Quận Tây Hồ, Hà Nội",
    contactNumber: "02438473961",
    profilePicture: "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=900&auto=format&fit=crop&q=85",
    email: "partner.banhcuon.bahoanh@skydish.local",
    foods: [
      { name: "Bánh Cuốn Thanh Trì", description: "Bánh cuốn tráng mỏng, mềm, ăn cùng chả quế, hành phi và nước chấm.", price: 65000, category: "Bánh cuốn", image: "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=700&auto=format&fit=crop&q=85" },
      { name: "Bánh Cuốn Nhân Thịt", description: "Bánh cuốn nhân thịt mộc nhĩ thơm mềm, dùng nóng trong ngày.", price: 75000, category: "Bánh cuốn", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Hủ Tiếu Thanh Xuân",
    ownerName: "Hủ Tiếu Thanh Xuân",
    location: "62 Tôn Thất Thiệp, Phường Bến Nghé, Quận 1, TP.HCM",
    contactNumber: "02838295731",
    profilePicture: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900&auto=format&fit=crop&q=85",
    email: "partner.hutieu.thanhxuan@skydish.local",
    foods: [
      { name: "Hủ Tiếu Nam Vang", description: "Hủ tiếu với tôm, thịt bằm, trứng cút và nước dùng trong ngọt.", price: 80000, category: "Hủ tiếu", image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=85" },
      { name: "Hủ Tiếu Khô", description: "Hủ tiếu trộn sốt đậm vị, thịt, tôm, trứng cút và rau hẹ.", price: 85000, category: "Hủ tiếu", image: "https://images.unsplash.com/photo-1552611052-33e04de081de?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "The Pizza Company Cầu Giấy",
    ownerName: "The Pizza Company Vietnam",
    location: "26 Nguyễn Khang, Phường Yên Hòa, Quận Cầu Giấy, Hà Nội",
    contactNumber: "19006066",
    profilePicture: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=85",
    email: "partner.pizzacompany.caugiay@skydish.local",
    foods: [
      { name: "Pizza Hải Sản Nhiệt Đới", description: "Pizza đế nướng phủ hải sản, dứa và phô mai mozzarella.", price: 229000, category: "Pizza", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=700&auto=format&fit=crop&q=85" },
      { name: "Pizza Pepperoni", description: "Pizza pepperoni với phô mai mozzarella trên đế bánh nướng vàng.", price: 199000, category: "Pizza", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Kichi-Kichi Lẩu Băng Chuyền Cầu Giấy",
    ownerName: "Golden Gate Group",
    location: "222 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội",
    contactNumber: "19006622",
    profilePicture: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900&auto=format&fit=crop&q=85",
    email: "partner.kichikichi.caugiay@skydish.local",
    foods: [
      { name: "Set Lẩu Băng Chuyền", description: "Set lẩu với nhiều loại thịt, hải sản, rau và viên thả lẩu dùng theo kiểu băng chuyền.", price: 249000, category: "Lẩu", image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=85" },
      { name: "Nước Lẩu Tomyum", description: "Nước lẩu Tomyum chua cay thơm mùi sả, riềng và lá chanh.", price: 69000, category: "Lẩu", image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=700&auto=format&fit=crop&q=85" }
    ]
  },
  {
    name: "Lotteria Cầu Giấy",
    ownerName: "Lotteria Vietnam",
    location: "241 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội",
    contactNumber: "19006778",
    profilePicture: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=85",
    email: "partner.lotteria.caugiay@skydish.local",
    foods: [
      { name: "Combo Gà Rán", description: "Gà rán giòn vàng dùng kèm khoai tây và nước ngọt.", price: 99000, category: "Đồ ăn nhanh", image: "https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=700&auto=format&fit=crop&q=85" },
      { name: "Burger Bulgogi", description: "Burger bò sốt Bulgogi cùng rau tươi và bánh mì mềm.", price: 69000, category: "Đồ ăn nhanh", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=85" }
    ]
  }
];

export async function seedRealRestaurants(db, hashedPassword) {
  let restaurants = 0;
  let foods = 0;
  const removed = await db.collection("restaurants").findOne({ "admin.email": "partner.quanangan.namky@skydish.local" });
  if (removed) {
    await db.collection("fooditems").deleteMany({ restaurant: removed._id });
    await db.collection("restaurants").deleteOne({ _id: removed._id });
  }
  for (const data of REAL_RESTAURANTS) {
    let restaurant = await db.collection("restaurants").findOne({ "admin.email": data.email });
    if (!restaurant) {
      const result = await db.collection("restaurants").insertOne({
        name: data.name,
        ownerName: data.ownerName,
        location: data.location,
        contactNumber: data.contactNumber,
        profilePicture: data.profilePicture,
        admin: { email: data.email, password: hashedPassword },
        availability: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      restaurant = { _id: result.insertedId };
      restaurants += 1;
    } else {
      await db.collection("restaurants").updateOne({ _id: restaurant._id }, { $set: {
        name: data.name, ownerName: data.ownerName, location: data.location,
        contactNumber: data.contactNumber, profilePicture: data.profilePicture,
        availability: true, updatedAt: new Date()
      } });
    }

    for (const food of data.foods) {
      const filter = { restaurant: restaurant._id, name: food.name };
      const update = { $set: { ...food, restaurant: restaurant._id, availability: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } };
      const result = await db.collection("fooditems").updateOne(filter, update, { upsert: true });
      if (result.upsertedCount) foods += 1;
    }
  }
  return { restaurants, foods, total: REAL_RESTAURANTS.length };
}

export { REAL_RESTAURANTS };
