import Driver from "../models/Driver.js";

/**
 * Tìm và phân công tài xế khả dụng gần nhất (ưu tiên theo tọa độ GeoJSON, fallback theo tài xế available bất kỳ)
 */
export const assignNearestDriver = async (pickupLat, pickupLng) => {
  try {
    let nearestDriver = null;

    // 1. Nếu có tọa độ hợp lệ, thử tìm tài xế gần nhất trong bán kính 15km
    if (pickupLat !== undefined && pickupLng !== undefined && !isNaN(pickupLat) && !isNaN(pickupLng)) {
      try {
        nearestDriver = await Driver.findOne({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [Number(pickupLng), Number(pickupLat)],
              },
              $maxDistance: 15000, // 15km
            },
          },
          status: "available",
        });
      } catch (geoErr) {
        // Fallback khi index 2dsphere chưa sẵn sàng hoặc driver chưa có tọa độ
        nearestDriver = null;
      }
    }

    // 2. Fallback: Nếu không tìm thấy bằng tọa độ, lấy tài xế đang "available" đầu tiên
    if (!nearestDriver) {
      nearestDriver = await Driver.findOne({ status: "available" });
    }

    // 3. Nếu tìm được, đánh dấu tài xế chuyển sang trạng thái "on-delivery"
    if (nearestDriver) {
      nearestDriver.status = "on-delivery";
      await nearestDriver.save();
    }

    return nearestDriver;
  } catch (error) {
    console.error("🚨 Error finding driver:", error);
    return null;
  }
};
