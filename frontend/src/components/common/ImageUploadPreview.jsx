import React, { useRef, useState, useEffect } from "react";
import { FaCloudUploadAlt, FaTimes, FaImage } from "react-icons/fa";
import { resolveImageUrl } from "../../utils/imageHelper";

/**
 * ImageUploadPreview component
 *
 * Provides drag-and-drop or click to upload, instant local thumbnail preview,
 * and a prominent "X" delete button in the top-right corner to reset the image
 * and allow immediately re-selecting the same file without reloading.
 *
 * @param {Object} props
 * @param {File|string|null} props.value - Current File object or server URL string
 * @param {Function} props.onChange - Callback (fileOrNull, isRemoved)
 * @param {'restaurant'|'food'} [props.type='food']
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.height='180px']
 */
export default function ImageUploadPreview({
  value,
  onChange,
  type = "food",
  label = "Hình ảnh",
  hint = "Định dạng hỗ trợ: JPG, PNG (tối đa 5MB)",
  height = "180px",
  style = {},
}) {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Synchronize incoming value (File object or existing server URL string)
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }

    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    if (typeof value === "string" && value.trim()) {
      setPreviewUrl(resolveImageUrl(value, type));
    } else {
      setPreviewUrl(null);
    }
  }, [value, type]);

  const handleFile = (file) => {
    if (!file) return;

    // Validate mime type
    if (!file.type.match(/^image\/(jpeg|png|jpg|webp)$/i)) {
      alert("Vui lòng chỉ chọn tệp hình ảnh (.jpg, .jpeg, .png, .webp).");
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Dung lượng hình ảnh không được vượt quá 5MB.");
      return;
    }

    if (onChange) {
      onChange(file, false);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Reset file input element so selecting the exact same file works again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setPreviewUrl(null);

    if (onChange) {
      onChange(null, true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ marginBottom: "1rem", ...style }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "0.8rem",
            fontWeight: "700",
            color: "#64748b",
            marginBottom: "0.35rem",
          }}
        >
          {label}
        </label>
      )}

      {/* Hidden native input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/jpg,image/webp"
        onChange={handleInputChange}
        style={{ display: "none" }}
      />

      {previewUrl ? (
        /* Preview with prominent X delete button */
        <div
          style={{
            position: "relative",
            width: "100%",
            height,
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid #cbd5e1",
            backgroundColor: "#f8fafc",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />

          {/* Delete Button "X" */}
          <button
            type="button"
            onClick={handleClear}
            aria-label="Xóa ảnh"
            title="Xóa ảnh đã chọn"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.18s ease-in-out",
              zIndex: 10,
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#ef4444";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.75)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = "2px solid #ef4444";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            <FaTimes size={13} />
          </button>

          {/* Change photo overlay button */}
          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              padding: "0.35rem 0.7rem",
              borderRadius: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              color: "#0f172a",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <FaImage size={11} /> Thay đổi ảnh
          </button>
        </div>
      ) : (
        /* Empty Dropzone Area */
        <div
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current && fileInputRef.current.click();
            }
          }}
          style={{
            height,
            border: isDragOver ? "2px dashed #ff5722" : "2px dashed #cbd5e1",
            borderRadius: "10px",
            backgroundColor: isDragOver ? "#fff7ed" : "#f8fafc",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              marginBottom: "0.5rem",
            }}
          >
            <FaCloudUploadAlt size={22} />
          </div>
          <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>
            Nhấn hoặc kéo thả tệp hình ảnh vào đây
          </p>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{hint}</span>
        </div>
      )}
    </div>
  );
}
