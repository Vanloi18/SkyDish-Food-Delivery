const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Retrieve SMTP configuration
 */
function getSmtpConfig() {
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
function getTransporter() {
  const config = getSmtpConfig();
  if (!config.isConfigured) return null;
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
 * Sends an email notification using SMTP (nodemailer).
 *
 * @param {string} to - The recipient email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content of the email.
 * @param {string} text - The plain text content of the email.
 * @returns {Promise<object>} - Result object
 */
const sendEmailNotification = async (to, subject, html, text) => {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    console.log(`ℹ️ [Email Notification Skipped] Missing SMTP config: [${config.missing.join(", ")}]. To: ${to} | Subject: ${subject}`);
    return { success: false, skipped: true, missingVars: config.missing };
  }

  try {
    const mailer = getTransporter();
    const info = await mailer.sendMail({
      from: config.from,
      to,
      subject,
      text: text || "",
      html: html || "",
    });
    console.log(`✅ [Payment Email Sent] To ${to} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email from payment-service:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmailNotification, getSmtpConfig };
