import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
        name: "Quẩy Giòn Hà Nội",
        description: "Quẩy chiên vàng ruộm giòn tan ăn kèm phở",
        price: 10000,
        category: "Phở",
        image: "https://upload.wikimedia.org/wikipedia/commons/7/78/Youtiao.jpg",
      },
      {
        name: "Trứng Gà Chần Nước Béo",
        description: "Trứng gà ta chần lòng đào cùng nước dùng phở thơm phức",
        price: 15000,
        category: "Phở",
        image: "https://images.unsplash.com/photo-1503764654157-72d979d9af2f?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Trà Đá Hà Nội",
        description: "Trà xanh ướp hoa lài mát lạnh truyền thống",
        price: 5000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Bún Chả Hương Liên",
    ownerName: "Nguyễn Thị Hằng Nga",
    location: "24 Lê Văn Hưu, Phường Phan Chu Trinh, Quận Hai Bà Trưng, Hà Nội",
    contactNumber: "02439434106",
    profilePicture: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=700&auto=format&fit=crop&q=80",
    email: "bunchahuonglien@gmail.com",
    availability: true,
    foods: [
      {
        name: "Bún Chả Đặc Biệt Obama",
        description: "Chả miếng, chả băm nướng than hoa ăn cùng bún tươi và rau sống",
        price: 65000,
        category: "Bún chả",
        image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Nem Hải Sản Chiên Giòn",
        description: "Nem hải sản sốt mayonnaise vỏ giòn rụm nhân đầy đặn",
        price: 30000,
        category: "Bún chả",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Nem Cua Bể Hải Phòng",
        description: "Nem cua bể gói vuông thịt cua ngọt bùi giòn rụm",
        price: 35000,
        category: "Bún chả",
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Bia Trúc Bạch Ướp Lạnh",
        description: "Bia Trúc Bạch Hà Nội hương vị truyền thống tinh tế",
        price: 28000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Phở Gia Truyền Bát Đàn",
    ownerName: "Nguyễn Văn Đàn",
    location: "49 Bát Đàn, Phường Cửa Đông, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "02438280124",
    profilePicture: "https://images.unsplash.com/photo-1503764654157-72d979d9af2f?w=700&auto=format&fit=crop&q=80",
    email: "phobatdan49@gmail.com",
    availability: true,
    foods: [
      {
        name: "Phở Bò Tái Nạm Gầu",
        description: "Thịt bò tái mềm ngọt kết hợp nạm gầu giòn béo ngậy",
        price: 75000,
        category: "Phở",
        image: "https://images.unsplash.com/photo-1503764654157-72d979d9af2f?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Phở Bò Tái Lăn",
        description: "Bò tươi thái mỏng xào nhanh lửa lớn dậy mùi thơm gừng tỏi",
        price: 70000,
        category: "Phở",
        image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Phở Bò Chín Nước Trong",
        description: "Thịt bò chín thái lát mềm mọng cùng nước hầm xương nguyên chất",
        price: 65000,
        category: "Phở",
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Quán Ăn Ngon Phan Bội Châu",
    ownerName: "Phạm Bích Hạnh",
    location: "18 Phan Bội Châu, Phường Cửa Nam, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "0903246963",
    profilePicture: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=80",
    email: "info@quananngon.com.vn",
    availability: true,
    foods: [
      {
        name: "Bánh Xèo Tôm Thịt Miền Nam",
        description: "Bánh xèo vàng giòn nhân tôm thịt giá đỗ cuốn rau rừng",
        price: 95000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Cơm Chiên Hải Sản Hạt Sen",
        description: "Cơm rang tơi xốp cùng tôm mực tươi và hạt sen Tây Hồ",
        price: 110000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Gỏi Cuốn Tôm Thịt Tươi Sạch",
        description: "Bánh tráng cuốn tôm tươi, thịt luộc và rau thơm chấm tương đen",
        price: 85000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Bánh Mì Phố Cổ Đinh Liệt",
    ownerName: "Lê Văn Tuấn",
    location: "38 Đinh Liệt, Phường Hàng Bạc, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "0983234567",
    profilePicture: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=700&auto=format&fit=crop&q=80",
    email: "banhmiphoco@gmail.com",
    availability: true,
    foods: [
      {
        name: "Bánh Mì Pate Thịt Nướng Xá Xíu",
        description: "Pate gan béo ngậy, thịt xá xíu thơm lừng cùng đồ chua giòn ngọt",
        price: 35000,
        category: "Bánh mì",
        image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Bánh Mì Trứng Ốp La Xúc Xích",
        description: "2 trứng ốp la lòng đào kèm xúc xích nướng và sốt bơ trứng",
        price: 30000,
        category: "Bánh mì",
        image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Sữa Đậu Nành Lá Dứa Nóng",
        description: "Sữa hạt đậu nành tự nấu thanh mát thơm mùi lá dứa",
        price: 15000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Cơm Tấm Sà Bì Chưởng Đống Đa",
    ownerName: "Độ Phùng",
    location: "86 Nguyễn Văn Tuyết, Phường Trung Liệt, Quận Đống Đa, Hà Nội",
    contactNumber: "1900633633",
    profilePicture: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&auto=format&fit=crop&q=80",
    email: "contact@sabichuong.vn",
    availability: true,
    foods: [
      {
        name: "Cơm Tấm Sườn Bì Chả Trứng Ốp La",
        description: "Đĩa sườn nướng mật ong cỡ lớn, bì sợi, chả trứng hấp và mỡ hành",
        price: 89000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Cơm Tấm Sườn Nướng Cốt Lết",
        description: "Sườn cốt lết ướp gia vị đậm đà nướng than hồng thơm phức",
        price: 69000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Canh Rong Biển Thịt Bằm",
        description: "Canh rong biển đậu phụ non thanh mát ngọt thanh",
        price: 20000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Trà Tắc Xí Muội Đá",
        description: "Trà tắc xí muội mát lạnh giải ngấy tuyệt vời",
        price: 25000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Highlands Coffee Nhà Hát Lớn",
    ownerName: "David Thái",
    location: "1 Tràng Tiền, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "19001755",
    profilePicture: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80",
    email: "customerservice@highlandscoffee.com.vn",
    availability: true,
    foods: [
      {
        name: "Phin Sữa Đá Cỡ Lớn",
        description: "Cà phê phin truyền thống hòa quyện sữa đặc ngọt bùi đậm vị",
        price: 45000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Freeze Trà Xanh Đá Xay",
        description: "Trà xanh đá xay mát lạnh phủ thạch dẻo và kem béo",
        price: 65000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Trà Sen Vàng Hạt Sen",
        description: "Trà ô long thơm ngát kết hợp hạt sen bùi và củ năng giòn ngọt",
        price: 55000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Bánh Mì Gà Xé Cay",
        description: "Bánh mì giòn kẹp gà xé cay sốt mayonnaise thơm lừng",
        price: 29000,
        category: "Bánh mì",
        image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "The Coffee House Bà Triệu",
    ownerName: "Ngô Hoàng Triều",
    location: "56A Bà Triệu, Phường Hàng Bài, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "18006936",
    profilePicture: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=700&auto=format&fit=crop&q=80",
    email: "hi@thecoffeehouse.vn",
    availability: true,
    foods: [
      {
        name: "Trà Đào Cam Sả Đặc Biệt",
        description: "Vị trà thanh mát hòa quyện sả tươi và đào miếng mọng nước",
        price: 55000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Cà Phê Sữa Đá Đậm Vị",
        description: "Hạt cà phê Cầu Đất rang mộc đậm đà chuẩn vị",
        price: 39000,
        category: "Đồ uống",
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Bánh Mousse Tiramisu Ý",
        description: "Bánh ngọt thơm hương cà phê và rượu rum phô mai mềm mịn",
        price: 42000,
        category: "Tráng miệng",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "The Pizza Company Cầu Giấy",
    ownerName: "Minor Food Group",
    location: "333 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội",
    contactNumber: "19006066",
    profilePicture: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=700&auto=format&fit=crop&q=80",
    email: "cskh@thepizzacompany.vn",
    availability: true,
    foods: [
      {
        name: "Pizza Hải Sản Cao Cấp Nhiệt Đới",
        description: "Tôm, mực, nghêu tươi ngon cùng sốt Thousand Island béo ngậy",
        price: 249000,
        category: "Pizza",
        image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Cánh Gà Nướng BBQ Vị Cay",
        description: "Cánh gà tươi tẩm ướp sốt BBQ đượm vị nướng vàng óng",
        price: 109000,
        category: "Đồ ăn nhanh",
        image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Mỳ Ý Cay Hải Sản Sốt Cà",
        description: "Sợi mỳ dai ngon đảo cùng tôm tươi và ớt cay nồng",
        price: 139000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Kichi-Kichi Lẩu Băng Chuyền",
    ownerName: "Golden Gate Group",
    location: "Vincom Center, 119 Trần Duy Hưng, Quận Cầu Giấy, Hà Nội",
    contactNumber: "19006622",
    profilePicture: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&auto=format&fit=crop&q=80",
    email: "support.hn@ggg.com.vn",
    availability: true,
    foods: [
      {
        name: "Set Buffet Lẩu Bò Mỹ Nhúng",
        description: "Ba chỉ bò Mỹ, bắp bò Úc và hơn 60 món nhúng không giới hạn",
        price: 299000,
        category: "Lẩu",
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Nước Lẩu Tomyum Chua Cay",
        description: "Cốt lẩu tôm chua cay đậm đà chuẩn vị Thái Lan",
        price: 69000,
        category: "Lẩu",
        image: "https://images.unsplash.com/photo-1547928576-a4a33237cbc3?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Combo Viên Thả Lẩu Phô Mai",
        description: "Bao gồm đậu hũ phô mai, bánh bao trứng cá hồi và tôm viên",
        price: 89000,
        category: "Lẩu",
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Chả Cá Lã Vọng Hoàn Kiếm",
    ownerName: "Đoàn Xuân Phúc",
    location: "14 Chả Cá, Phường Hàng Bồ, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "02438253929",
    profilePicture: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=700&auto=format&fit=crop&q=80",
    email: "chacalavong14@gmail.com",
    availability: true,
    foods: [
      {
        name: "Suất Chả Cá Lăng Kèm Thì Là & Bún",
        description: "Cá lăng tẩm ướp nghệ nướng than đảo cùng hành hoa, thì là tươi",
        price: 175000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Nem Cá Lăng Hà Thành",
        description: "Nem cá lăng cuốn bánh đa giòn chấm nước mắm chua ngọt",
        price: 45000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Canh Đầu Cá Nấu Dọc Mùng",
        description: "Canh chua đầu cá lăng nấu dọc mùng và me chua thanh mát",
        price: 65000,
        category: "Món Á & Cơm",
        image: "https://images.unsplash.com/photo-1547928576-a4a33237cbc3?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Lotteria Cầu Giấy",
    ownerName: "Lotte GRS Vietnam",
    location: "112 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội",
    contactNumber: "19006778",
    profilePicture: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=700&auto=format&fit=crop&q=80",
    email: "cskh@lotteria.vn",
    availability: true,
    foods: [
      {
        name: "Combo Gà Rán Giòn Cay 2 Miếng",
        description: "2 miếng gà rán giòn rụm kèm khoai tây chiên và Pepsi",
        price: 89000,
        category: "Đồ ăn nhanh",
        image: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Burger Tôm Tươi Đặc Biệt",
        description: "Nhân chả tôm chiên xù phủ sốt tartar và xà lách tươi",
        price: 55000,
        category: "Burger",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Khoai Tây Lắc Phô Mai",
        description: "Khoai tây chiên vàng giòn lắc bột phô mai béo ngậy",
        price: 38000,
        category: "Đồ ăn nhanh",
        image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "KFC Bà Triệu",
    ownerName: "Yum! Brands Vietnam",
    location: "292 Bà Triệu, Phường Lê Đại Hành, Quận Hai Bà Trưng, Hà Nội",
    contactNumber: "19006886",
    profilePicture: "https://images.unsplash.com/photo-1562967914-608f82629710?w=700&auto=format&fit=crop&q=80",
    email: "feedback@kfc.com.vn",
    availability: true,
    foods: [
      {
        name: "Combo Gà Giòn Cay 3 Miếng",
        description: "Gà rán công thức 11 loại thảo mộc đặc trưng giòn cay đậm vị",
        price: 115000,
        category: "Đồ ăn nhanh",
        image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Burger Zinger Thịt Gà Giòn Cay",
        description: "Phi lê đùi gà giòn cay kẹp cùng phô mai và xà lách",
        price: 59000,
        category: "Burger",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Bánh Trứng Egg Tart Nướng (2 cái)",
        description: "Vỏ ngàn lớp giòn tan nhân trứng sữa béo thơm nức",
        price: 38000,
        category: "Tráng miệng",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
  {
    name: "Chè Sầu Liên Trần Hưng Đạo",
    ownerName: "Bà Liên Đà Nẵng",
    location: "79 Trần Hưng Đạo, Phường Cửa Nam, Quận Hoàn Kiếm, Hà Nội",
    contactNumber: "0989334556",
    profilePicture: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=700&auto=format&fit=crop&q=80",
    email: "chesaulien@gmail.com",
    availability: true,
    foods: [
      {
        name: "Chè Sầu Riêng Thập Cẩm Đà Nẵng",
        description: "Cơm sầu riêng tươi thơm nức hòa cùng nước cốt dừa và thạch ngọc trai",
        price: 35000,
        category: "Tráng miệng",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Chè Bưởi An Giang Giòn Ngọt",
        description: "Cùi bưởi giòn sần sật nấu đậu xanh bùi béo rưới cốt dừa",
        price: 25000,
        category: "Tráng miệng",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80",
      },
      {
        name: "Tàu Hũ Trân Châu Đường Đen",
        description: "Tàu hũ non mềm mịn thơm mát kèm trân châu dẻo dai",
        price: 28000,
        category: "Tráng miệng",
        image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80",
      },
    ],
  },
];

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27000/food_delivery_db';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // 1. Clean up demo/fake restaurants
  const oldRestaurants = await mongoose.connection.db.collection('restaurants').find({
    $or: [
      { name: { $regex: /Sky Burger Hub|Sky Gourmet Grill|Test Restaurant/i } },
      { location: { $regex: /Colombo|Galle Road/i } }
    ]
  }).toArray();

  console.log(`Found ${oldRestaurants.length} legacy demo restaurant records.`);

  const oldRestIds = oldRestaurants.map(r => r._id);
  if (oldRestIds.length > 0) {
    await mongoose.connection.db.collection('fooditems').deleteMany({
      restaurant: { $in: oldRestIds }
    });
    await mongoose.connection.db.collection('restaurants').deleteMany({
      _id: { $in: oldRestIds }
    });
    console.log(`Deleted ${oldRestaurants.length} legacy demo restaurant records and their food items.`);
  }

  // 2. Insert 15 Real Vietnamese Restaurants and their Food Items
  let insertedRestCount = 0;
  let insertedFoodCount = 0;

  for (const rData of VIETNAM_RESTAURANTS) {
    // Check if restaurant already exists by email or name
    const existing = await mongoose.connection.db.collection('restaurants').findOne({
      $or: [{ name: rData.name }, { 'admin.email': rData.email }]
    });

    let restaurantId;
    if (!existing) {
      const hashedPassword = await bcrypt.hash("password123", 10);
      const insertResult = await mongoose.connection.db.collection('restaurants').insertOne({
        name: rData.name,
        ownerName: rData.ownerName,
        location: rData.location,
        contactNumber: rData.contactNumber,
        profilePicture: rData.profilePicture,
        admin: {
          email: rData.email,
          password: hashedPassword,
        },
        availability: rData.availability,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      restaurantId = insertResult.insertedId;
      insertedRestCount++;
    } else {
      restaurantId = existing._id;
      // Update with clean Vietnam data
      await mongoose.connection.db.collection('restaurants').updateOne(
        { _id: restaurantId },
        {
          $set: {
            name: rData.name,
            ownerName: rData.ownerName,
            location: rData.location,
            contactNumber: rData.contactNumber,
            profilePicture: rData.profilePicture,
            availability: rData.availability,
            updatedAt: new Date(),
          }
        }
      );
    }

    // Insert foods for this restaurant
    for (const food of rData.foods) {
      const existingFood = await mongoose.connection.db.collection('fooditems').findOne({
        restaurant: restaurantId,
        name: food.name,
      });

      if (!existingFood) {
        await mongoose.connection.db.collection('fooditems').insertOne({
          restaurant: restaurantId,
          name: food.name,
          description: food.description,
          price: food.price,
          category: food.category,
          image: food.image,
          availability: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        insertedFoodCount++;
      } else {
        await mongoose.connection.db.collection('fooditems').updateOne(
          { _id: existingFood._id },
          {
            $set: {
              description: food.description,
              price: food.price,
              category: food.category,
              image: food.image,
              availability: true,
              updatedAt: new Date(),
            }
          }
        );
      }
    }
  }

  console.log(`✅ Successfully seeded ${insertedRestCount} Real Vietnamese Restaurants and ${insertedFoodCount} authentic dishes.`);

  // Update existing orders to point to the first real restaurant so order history displays authentic restaurant name
  const firstRest = await mongoose.connection.db.collection('restaurants').findOne({});
  if (firstRest) {
    await mongoose.connection.db.collection('orders').updateMany(
      { restaurantId: { $regex: /Sky Gourmet Grill|Sky Burger Hub/i } },
      { $set: { restaurantId: firstRest.name } }
    );
    console.log(`Updated legacy order references to: ${firstRest.name}`);
  }

  await mongoose.disconnect();
}

seed().catch(console.error);
