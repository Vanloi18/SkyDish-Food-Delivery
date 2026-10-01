import Driver from "../models/Driver.js";

/**
 * 1. Lấy danh sách tất cả tài xế (Dành cho Admin / Quản trị viên)
 * Hỗ trợ phân trang, lọc theo status, tìm kiếm theo tên, sđt, email, biển số
 */
export const getAllDrivers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, search } = req.query;
    const filter = {};

    if (status && ['available', 'on-delivery', 'offline'].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { vehicleNumber: searchRegex },
      ];
    }

    const [totalItems, drivers] = await Promise.all([
      Driver.countDocuments(filter),
      Driver.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    res.status(200).json({
      success: true,
      drivers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit,
      },
    });
  } catch (error) {
    console.error("🚨 Get all drivers error:", error);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách tài xế" });
  }
};

/**
 * 2. Lấy thông tin chi tiết một tài xế theo ID
 */
export const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.role === "admin" || req.role === "superadmin";
    const isOwner = req.role === "driver"
      && req.driver
      && req.driver.toString() === id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Từ chối truy cập: Không thể xem hồ sơ tài xế khác",
      });
    }

    const driver = await Driver.findById(id).select("-password");

    if (!driver) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài xế" });
    }

    res.status(200).json({
      success: true,
      driver,
      data: driver,
    });
  } catch (error) {
    console.error("🚨 Get driver by ID error:", error);
    res.status(500).json({ success: false, message: "Lỗi lấy thông tin tài xế" });
  }
};

/**
 * 3. Cập nhật trạng thái hoạt động của tài xế (Online / Offline / Available)
 * Dành cho tài xế tự cập nhật trạng thái làm việc hoặc Admin quản lý
 */
export const updateDriverStatus = async (req, res) => {
  try {
    const driverId = req.params.id || req.driver;
    const { status, isAvailable } = req.body;

    let targetStatus = status;
    if (!targetStatus && isAvailable !== undefined) {
      targetStatus = isAvailable ? "available" : "offline";
    }

    const validStatuses = ["available", "on-delivery", "offline"];
    if (!targetStatus || !validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ. Chỉ chấp nhận: 'available', 'on-delivery', 'offline'",
      });
    }

    // Kiểm tra quyền: Chỉ chính tài xế hoặc Admin mới được cập nhật
    const isOwner = req.driver && req.driver.toString() === driverId.toString();
    const isAdmin = req.role === "admin" || req.role === "superadmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Từ chối truy cập: Bạn không có quyền cập nhật trạng thái của tài xế khác",
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài xế" });
    }

    driver.status = targetStatus;
    await driver.save();

    res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái tài xế thành '${targetStatus}' thành công!`,
      status: driver.status,
      isAvailable: driver.status === "available",
      driver,
    });
  } catch (error) {
    console.error("🚨 Update driver status error:", error);
    res.status(500).json({ success: false, message: "Lỗi cập nhật trạng thái tài xế" });
  }
};

/**
 * 4. Cập nhật thông tin hồ sơ tài xế (Họ tên, SĐT, phương tiện, biển số, tọa độ)
 */
export const updateDriverProfile = async (req, res) => {
  try {
    const driverId = req.params.id || req.driver;

    const isOwner = req.driver && req.driver.toString() === driverId.toString();
    const isAdmin = req.role === "admin" || req.role === "superadmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Từ chối truy cập: Không thể sửa hồ sơ của tài xế khác",
      });
    }

    const allowedFields = ["name", "phone", "vehicleType", "vehicleNumber", "location"];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Không cho phép đổi email hoặc password qua route này
    delete updateData.password;
    delete updateData.email;

    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedDriver) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài xế" });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ tài xế thành công!",
      driver: updatedDriver,
      data: updatedDriver,
    });
  } catch (error) {
    console.error("🚨 Update driver profile error:", error);
    res.status(500).json({ success: false, message: error.message || "Lỗi cập nhật hồ sơ" });
  }
};

/**
 * 5. Xóa tài xế (Dành riêng cho Quản trị viên Admin)
 */
export const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const driver = await Driver.findById(id);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài xế cần xóa" });
    }

    // Không được xóa tài xế đang trong chuyến giao dở
    if (driver.status === "on-delivery") {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa tài xế đang thực hiện chuyến giao (on-delivery).",
      });
    }

    await Driver.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Đã xóa tài xế '${driver.name}' thành công!`,
    });
  } catch (error) {
    console.error("🚨 Delete driver error:", error);
    res.status(500).json({ success: false, message: "Lỗi xóa tài xế" });
  }
};
