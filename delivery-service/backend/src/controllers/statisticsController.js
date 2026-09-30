import Delivery from "../models/Delivery.js";
import Driver from "../models/Driver.js";

/**
 * 1. Báo cáo thống kê tổng quan dịch vụ Giao vận & Tài xế (Dành cho Admin Dashboard)
 */
export const getDeliveryOverviewStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalDeliveries,
      assignedCount,
      pickedUpCount,
      toBeDeliveredCount,
      deliveredCount,
      todayDeliveries,
      last7DaysDeliveries,
      last30DaysDeliveries,
      totalDrivers,
      availableDrivers,
      onDeliveryDrivers,
      offlineDrivers,
      topDriversRaw
    ] = await Promise.all([
      Delivery.countDocuments({}),
      Delivery.countDocuments({ status: "assigned" }),
      Delivery.countDocuments({ status: "Picked-up" }),
      Delivery.countDocuments({ status: "To be delivered" }),
      Delivery.countDocuments({ status: "Delivered" }),
      Delivery.countDocuments({ createdAt: { $gte: startOfToday } }),
      Delivery.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Delivery.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Driver.countDocuments({}),
      Driver.countDocuments({ status: "available" }),
      Driver.countDocuments({ status: "on-delivery" }),
      Driver.countDocuments({ status: "offline" }),
      Delivery.aggregate([
        { $match: { status: "Delivered", driver: { $ne: null } } },
        { $group: { _id: "$driver", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Populate top driver information
    const topDrivers = await Promise.all(
      topDriversRaw.map(async (item) => {
        const driverDoc = await Driver.findById(item._id).select("name phone vehicleNumber vehicleType");
        return {
          driverId: item._id,
          driverName: driverDoc ? driverDoc.name : "Tài xế SkyDish",
          phone: driverDoc ? driverDoc.phone : "",
          vehicleNumber: driverDoc ? driverDoc.vehicleNumber : "",
          completedCount: item.count
        };
      })
    );

    const completionRate = totalDeliveries > 0 
      ? Math.round((deliveredCount / totalDeliveries) * 100) 
      : 0;

    res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      deliveries: {
        total: totalDeliveries,
        completionRate: `${completionRate}%`,
        statusBreakdown: {
          assigned: assignedCount,
          pickedUp: pickedUpCount,
          toBeDelivered: toBeDeliveredCount,
          delivered: deliveredCount
        },
        timeBreakdown: {
          today: todayDeliveries,
          last7Days: last7DaysDeliveries,
          last30Days: last30DaysDeliveries
        }
      },
      drivers: {
        total: totalDrivers,
        available: availableDrivers,
        onDelivery: onDeliveryDrivers,
        offline: offlineDrivers,
        topPerformers: topDrivers
      }
    });

  } catch (error) {
    console.error("🚨 Get delivery statistics error:", error);
    res.status(500).json({ success: false, message: "Không thể lấy số liệu thống kê giao vận" });
  }
};

/**
 * 2. Thống kê hiệu suất dành cho Tài xế đang đăng nhập
 */
export const getDriverPersonalStats = async (req, res) => {
  try {
    const driverId = req.driver;
    if (!driverId) {
      return res.status(401).json({ success: false, message: "Chưa xác thực tài xế" });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalAssigned,
      completedCount,
      todayCompleted,
      inProgressCount
    ] = await Promise.all([
      Delivery.countDocuments({ driver: driverId }),
      Delivery.countDocuments({ driver: driverId, status: "Delivered" }),
      Delivery.countDocuments({ driver: driverId, status: "Delivered", updatedAt: { $gte: startOfToday } }),
      Delivery.countDocuments({ driver: driverId, status: { $in: ["assigned", "Picked-up", "To be delivered"] } })
    ]);

    res.status(200).json({
      success: true,
      driverId,
      stats: {
        totalAssigned,
        completedCount,
        todayCompleted,
        inProgressCount
      }
    });

  } catch (error) {
    console.error("🚨 Get personal driver stats error:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy thống kê cá nhân" });
  }
};
