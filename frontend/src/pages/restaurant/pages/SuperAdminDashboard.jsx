import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaShieldAlt, 
  FaStore, 
  FaSearch, 
  FaEdit, 
  FaTrashAlt, 
  FaSignOutAlt, 
  FaMapMarkerAlt, 
  FaPhoneAlt, 
  FaCheckCircle, 
  FaRedo
} from "react-icons/fa";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Button from "../../../components/common/Button";
import Badge from "../../../components/common/Badge";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import StatCard from "../../../components/common/StatCard";
import LoadingSkeleton from "../../../components/common/LoadingSkeleton";
import EmptyState from "../../../components/common/EmptyState";

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [superAdminName, setSuperAdminName] = useState("Quản trị viên");

  // Edit Modal State
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    ownerName: "",
    location: "",
    contactNumber: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("superAdminName");
    navigate("/restaurant/home");
  };

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/superadmin/login");
        return;
      }

      const res = await fetch("http://localhost:5002/api/superadmin/restaurants", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setRestaurants(data);
      } else {
        setError(data.message || "Không thể tải danh sách nhà hàng");
      }
    } catch (err) {
      console.error("Super Admin fetch error:", err);
      setError("Lỗi kết nối máy chủ khi lấy danh sách nhà hàng.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const name = localStorage.getItem("superAdminName");
    if (name) setSuperAdminName(name);

    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleEditClick = (rest) => {
    setEditingRestaurant(rest._id);
    setFormData({
      name: rest.name || "",
      ownerName: rest.ownerName || "",
      location: rest.location || "",
      contactNumber: rest.contactNumber || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5002/api/superadmin/restaurant/${editingRestaurant}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setRestaurants(
          restaurants.map((rest) =>
            rest._id === editingRestaurant ? { ...rest, ...formData } : rest
          )
        );
        setEditingRestaurant(null);
      } else {
        const data = await res.json();
        alert(data.message || "Không thể cập nhật thông tin nhà hàng");
      }
    } catch (err) {
      alert("Lỗi máy chủ trong quá trình lưu");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhà hàng này khỏi nền tảng SkyDish không?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5002/api/superadmin/restaurant/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setRestaurants(restaurants.filter((r) => r._id !== id));
      } else {
        const data = await res.json();
        alert(data.message || "Không thể xóa nhà hàng");
      }
    } catch (err) {
      alert("Lỗi khi xóa nhà hàng");
    }
  };

  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          {/* Top Banner */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "var(--sd-radius-xl)",
              border: "1px solid var(--sd-border)",
              padding: "1.75rem 2rem",
              boxShadow: "var(--sd-shadow-sm)",
              marginBottom: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "var(--sd-radius-lg)",
                  backgroundColor: "#f5f3ff",
                  color: "#8b5cf6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FaShieldAlt size={28} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h1 className="sd-heading-2" style={{ margin: 0 }}>
                    Bảng điều khiển Quản trị viên
                  </h1>
                  <Badge variant="primary" style={{ backgroundColor: "#f5f3ff", color: "#8b5cf6", borderColor: "rgba(139, 92, 246, 0.3)" }}>
                    Quản trị Hệ thống
                  </Badge>
                </div>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                  Đang đăng nhập với: <strong>{superAdminName}</strong> • Dịch vụ lõi SkyDish
                </p>
              </div>
            </div>

            <Button variant="danger" size="sm" icon={FaSignOutAlt} onClick={handleLogout}>
              Đăng xuất Quản trị
            </Button>
          </div>

          {/* Stats Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <StatCard
              title="Nhà hàng đăng ký"
              value={restaurants.length}
              subtitle="Đối tác nhà hàng đang hoạt động"
              icon={FaStore}
              iconBg="#eff6ff"
              iconColor="#3b82f6"
            />
            <StatCard
              title="Dịch vụ Nền tảng"
              value="5/5 Microservices"
              subtitle="Auth, Rest, Order, Del, Pay"
              icon={FaShieldAlt}
              iconBg="#ecfdf5"
              iconColor="#10b981"
            />
            <StatCard
              title="Tình trạng Hệ thống"
              value="Hoạt động tốt"
              subtitle="Tất cả dịch vụ đang ổn định"
              icon={FaCheckCircle}
              iconBg="#f5f3ff"
              iconColor="#8b5cf6"
            />
          </div>

          {/* Search & Actions Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#ffffff",
                border: "1px solid var(--sd-border)",
                borderRadius: "var(--sd-radius-full)",
                padding: "0.4rem 1rem",
                boxShadow: "var(--sd-shadow-xs)",
                width: "340px",
              }}
            >
              <FaSearch style={{ color: "var(--sd-text-muted)", marginRight: "0.5rem" }} />
              <input
                type="text"
                placeholder="Tìm kiếm nhà hàng, chủ quán, địa chỉ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: "none", outline: "none", width: "100%", fontSize: "var(--sd-font-size-sm)" }}
              />
            </div>

            <Button variant="outline" size="sm" icon={FaRedo} onClick={fetchRestaurants}>
              Làm mới danh sách
            </Button>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                padding: "1rem 1.5rem",
                backgroundColor: "var(--sd-danger-light)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "var(--sd-radius-md)",
                color: "var(--sd-danger-hover)",
                textAlign: "center",
                marginBottom: "2rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Restaurant Data Table */}
          {loading ? (
            <LoadingSkeleton type="card" count={4} />
          ) : filteredRestaurants.length === 0 ? (
            <EmptyState
              icon={FaStore}
              title="Không tìm thấy nhà hàng"
              description={
                searchQuery
                  ? `Không tìm thấy nhà hàng nào khớp với "${searchQuery}".`
                  : "Hiện tại chưa có nhà hàng nào được đăng ký trong hệ thống."
              }
              actionLabel="Làm mới danh sách"
              onAction={fetchRestaurants}
            />
          ) : (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "var(--sd-radius-lg)",
                border: "1px solid var(--sd-border)",
                overflowX: "auto",
                boxShadow: "var(--sd-shadow-sm)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--sd-bg-muted)", borderBottom: "1px solid var(--sd-border)" }}>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Tên nhà hàng</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Chủ quán / Quản lý</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Địa chỉ gian hàng</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Liên hệ</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)", textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map((rest) => (
                    <tr key={rest._id} style={{ borderBottom: "1px solid var(--sd-border)" }}>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "var(--sd-radius-md)",
                              backgroundColor: "var(--sd-primary-light)",
                              color: "var(--sd-primary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <FaStore size={16} />
                          </div>
                          <div>
                            <span style={{ fontWeight: "700", color: "var(--sd-text-primary)" }}>{rest.name}</span>
                            <div style={{ fontSize: "0.7rem", color: "var(--sd-text-muted)" }}>ID: {rest._id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "1rem", fontSize: "var(--sd-font-size-sm)", color: "var(--sd-text-secondary)" }}>
                        {rest.ownerName}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "var(--sd-font-size-sm)", color: "var(--sd-text-secondary)" }}>
                        <FaMapMarkerAlt style={{ color: "var(--sd-primary)", marginRight: "0.35rem" }} />
                        {rest.location}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "var(--sd-font-size-sm)", color: "var(--sd-text-secondary)" }}>
                        <FaPhoneAlt style={{ color: "var(--sd-success)", marginRight: "0.35rem" }} />
                        {rest.contactNumber}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <button
                            type="button"
                            title="Chỉnh sửa"
                            onClick={() => handleEditClick(rest)}
                            style={{
                              padding: "0.45rem",
                              borderRadius: "var(--sd-radius-sm)",
                              backgroundColor: "#eff6ff",
                              color: "#3b82f6",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            type="button"
                            title="Xóa"
                            onClick={() => handleDelete(rest._id)}
                            style={{
                              padding: "0.45rem",
                              borderRadius: "var(--sd-radius-sm)",
                              backgroundColor: "#fef2f2",
                              color: "var(--sd-danger)",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <FaTrashAlt size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* EDIT RESTAURANT MODAL */}
      <Modal
        isOpen={!!editingRestaurant}
        onClose={() => setEditingRestaurant(null)}
        title="Chỉnh sửa thông tin Đối tác Nhà hàng"
      >
        <form onSubmit={handleSaveEdit}>
          <Input
            label="Tên nhà hàng"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Chủ quán / Người liên hệ"
            name="ownerName"
            value={formData.ownerName}
            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
            required
          />

          <Input
            label="Địa chỉ cửa hàng"
            name="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
          />

          <Input
            label="Số điện thoại liên hệ"
            name="contactNumber"
            value={formData.contactNumber}
            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
            required
          />

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <Button type="button" variant="outline" onClick={() => setEditingRestaurant(null)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saveLoading}>
              Lưu thông tin nhà hàng
            </Button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}

export default SuperAdminDashboard;
