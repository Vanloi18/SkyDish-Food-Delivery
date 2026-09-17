import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Order from "../models/orderModel.js";
dotenv.config();

/**
 * Retrieve and validate SMTP configuration from environment variables
 */
export function getSmtpConfig() {
  const clean = (val) => (val ? String(val).replace(/^["']|["']$/g, "").trim() : "");
  const host = clean(process.env.SMTP_HOST);
  const port = parseInt(clean(process.env.SMTP_PORT) || "587", 10);
  const user = clean(process.env.SMTP_USERNAME);
  const pass = clean(process.env.SMTP_PASSWORD);
  const secure = clean(process.env.SMTP_SECURE) === "true" || port === 465;
  const fromName = clean(process.env.MAIL_FROM_NAME) || "SkyDish Food Delivery";
  const fromAddress = clean(process.env.MAIL_FROM_ADDRESS) || user || "no-reply@skydish.com";

  const missing = [];
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USERNAME");
  if (!pass) missing.push("SMTP_PASSWORD");

  return {
    host,
    port,
    user,
    pass,
    secure,
    fromName,
    fromAddress,
    from: `"${fromName}" <${fromAddress}>`,
    missing,
    isConfigured: missing.length === 0,
  };
}

let transporter = null;

export function getTransporter() {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

/**
 * Format currency to Vietnamese Dong string
 */
function formatVND(amount) {
  return Number(amount || 0).toLocaleString("vi-VN") + " ₫";
}

/**
 * Send order confirmation email to customer
 * Enforces:
 * 1. Idempotency (no duplicate emails)
 * 2. Complete order details (id, restaurant, items, total, payment method, address, status)
 * 3. Graceful error handling (never rollback order/payment on email failure)
 */
export async function sendOrderConfirmationEmail(order) {
  if (!order) {
    return { success: false, reason: "NO_ORDER_DATA" };
  }

  // 1. Idempotency check: Do not send duplicate confirmation emails
  if (order.emailConfirmationSent === true) {
    console.log(`ℹ️ [Email Skipped] Order #${order._id} confirmation email was already sent (Idempotent).`);
    return { success: true, alreadySent: true };
  }

  // 2. Validate recipient email
  const recipientEmail = order.customerEmail;
  if (!recipientEmail || recipientEmail === "anonymous" || !recipientEmail.includes("@")) {
    console.log(`ℹ️ [Email Skipped] Order #${order._id} does not have a valid customer email.`);
    return { success: false, reason: "INVALID_OR_MISSING_EMAIL" };
  }

  // 3. Verify SMTP configuration
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    console.warn(`⚠️ [Email Notification Skipped] Missing SMTP configuration: [${config.missing.join(", ")}]. Order #${order._id} created successfully.`);
    return { success: false, skipped: true, missingVars: config.missing };
  }

  const orderId = order._id ? String(order._id) : "N/A";
  const restaurantName = order.restaurantName || order.restaurantId || "Nhà hàng đối tác SkyDish";
  const customerName = order.customerName || "Quý khách";
  const deliveryAddress = order.deliveryAddress || "Địa chỉ không xác định";
  const paymentMethod = order.paymentMethod || "COD";
  const paymentStatus = order.paymentStatus || "Pending";
  const orderStatus = order.status || "Pending";
  const items = Array.isArray(order.items) ? order.items : [];

  // Generate HTML table rows for items
  const itemsRows = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 8px; font-weight: 600; color: #1e293b;">${item.name || item.foodId}</td>
        <td style="padding: 12px 8px; text-align: center; color: #64748b;">x${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; color: #64748b;">${formatVND(item.price)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #1e293b;">${formatVND(Number(item.price || 0) * Number(item.quantity || 1))}</td>
      </tr>`
    )
    .join("");

  const emailSubject = `[SkyDish] Xác nhận đơn hàng #${orderId} thành công`;

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác nhận đơn hàng SkyDish</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
      <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">SkyDish</h1>
          <p style="margin: 0; font-size: 15px; opacity: 0.95;">Nền tảng giao đồ ăn trực tuyến hàng đầu</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 12px;">
              ✓ Đặt hàng thành công
            </div>
            <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #0f172a;">Cảm ơn bạn đã đặt món tại SkyDish!</h2>
            <p style="margin: 0; font-size: 14px; color: #64748b;">Xin chào <strong>${customerName}</strong>, đơn hàng của bạn đã được tiếp nhận và nhà hàng đang chuẩn bị món.</p>
          </div>

          <!-- Order Summary Card -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 18px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #64748b;">Mã đơn hàng:</span>
              <strong style="color: #0f172a;">#${orderId}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #64748b;">Nhà hàng:</span>
              <strong style="color: #0f172a;">${restaurantName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #64748b;">Phương thức thanh toán:</span>
              <span style="color: #0f172a; font-weight: 600;">${paymentMethod} (${paymentStatus})</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
              <span style="color: #64748b;">Trạng thái đơn:</span>
              <span style="color: #ea580c; font-weight: 700;">${orderStatus}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 14px;">
              <span style="color: #64748b;">Địa chỉ giao hàng:</span>
              <span style="color: #0f172a; max-width: 60%; text-align: right;">${deliveryAddress}</span>
            </div>
          </div>

          <!-- Items Table -->
          <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 800; color: #0f172a;">Chi tiết món ăn</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; color: #475569; font-size: 12px; text-transform: uppercase;">
                <th style="padding: 10px 8px;">Món</th>
                <th style="padding: 10px 8px; text-align: center;">SL</th>
                <th style="padding: 10px 8px; text-align: right;">Đơn giá</th>
                <th style="padding: 10px 8px; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Pricing Breakdown -->
          <div style="border-top: 2px dashed #e2e8f0; padding-top: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #64748b;">
              <span>Tạm tính:</span>
              <span style="color: #0f172a; font-weight: 600;">${formatVND(order.subtotal || order.totalPrice)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #64748b;">
              <span>Phí vận chuyển:</span>
              <span style="color: #0f172a; font-weight: 600;">${formatVND(order.deliveryFee || 0)}</span>
            </div>
            ${
              order.discount
                ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #059669;">
              <span>Giảm giá:</span>
              <span style="font-weight: 600;">-${formatVND(order.discount)}</span>
            </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 1px solid #e2e8f0; font-size: 16px;">
              <strong style="color: #0f172a;">Tổng thanh toán:</strong>
              <strong style="color: #ea580c; font-size: 18px;">${formatVND(order.totalPrice)}</strong>
            </div>
          </div>

          <!-- Footer note -->
          <p style="margin: 0 0 16px 0; font-size: 13px; color: #94a3b8; text-align: center;">
            Nếu bạn có bất kỳ câu hỏi nào về đơn hàng, vui lòng liên hệ đội ngũ SkyDish qua ứng dụng hoặc email hỗ trợ.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 4px 0;">© ${new Date().getFullYear()} SkyDish Food Delivery Platform. All rights reserved.</p>
          <p style="margin: 0;">Email này được gửi tự động. Vui lòng không trả lời trực tiếp.</p>
        </div>

      </div>
    </body>
    </html>
  `;

  const emailText = `
Xin chào ${customerName},

Đơn hàng #${orderId} của bạn tại ${restaurantName} đã được tiếp nhận thành công!
- Tổng tiền: ${formatVND(order.totalPrice)}
- Phương thức thanh toán: ${paymentMethod} (${paymentStatus})
- Địa chỉ giao hàng: ${deliveryAddress}
- Trạng thái đơn hàng: ${orderStatus}

Cảm ơn bạn đã lựa chọn SkyDish!
Đội ngũ SkyDish Food Delivery
  `.trim();

  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("⚠️ [Email Transporter Unavailable] Could not create SMTP transporter.");
      return { success: false, skipped: true };
    }

    const mailOptions = {
      from: config.from,
      to: recipientEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Confirmation Sent] Order #${orderId} sent to ${recipientEmail}. Message ID: ${info.messageId}`);

    // Update order to record that confirmation email has been sent
    try {
      if (typeof order.save === "function") {
        order.emailConfirmationSent = true;
        await order.save();
      } else if (order._id) {
        await Order.findByIdAndUpdate(order._id, { emailConfirmationSent: true });
      }
    } catch (saveErr) {
      console.warn(`⚠️ [Email Flag Update Warning] Could not persist emailConfirmationSent flag: ${saveErr.message}`);
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [Email Send Error] Failed to send order confirmation email for #${orderId}:`, error.message);
    // Never throw — email failure must NOT rollback successful order/payment
    return { success: false, error: error.message };
  }
}
