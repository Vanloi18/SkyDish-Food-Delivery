const { Resend } = require("resend");
require("dotenv").config();

let resend = null;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_placeholder_key") {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
  } catch (err) {
    console.warn("⚠️ Resend client initialization failed:", err.message);
  }
}

/**
 * Sends an email notification using Resend.
 *
 * @param {string} to - The recipient email address.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content of the email.
 * @param {string} text - The plain text content of the email.
 * @returns {Promise<object>} - The response from Resend.
 */
const sendEmailNotification = async (to, subject, html, text) => {
  if (!resend) {
    console.log(`ℹ️ [Email notice - Resend key not configured] To: ${to} | Subject: ${subject}`);
    return { id: "mock_id_dev_mode" };
  }
  try {
    const data = await resend.emails.send({
      from: "SkyDish <onboarding@resend.dev>", // ✅ Valid test sender for Resend
      to,
      subject,
      html,
    });
    console.log("Resend API Response:", data);
    console.log(`Email sent to ${to}: ${data?.id || "No ID returned"}`);
    return data;
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return null;
  }
};

module.exports = { sendEmailNotification };  
