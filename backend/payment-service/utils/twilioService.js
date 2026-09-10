const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;
if (accountSid && authToken && accountSid !== "AC_placeholder_key" && accountSid.startsWith("AC")) {
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    console.warn("⚠️ Twilio client initialization failed:", err.message);
  }
}

/**
 * Sends an SMS notification to the customer
 * @param {string} phoneNumber - Customer's phone number
 * @param {string} message - Message content
 */
const sendSmsNotification = async (phoneNumber, message) => {
  if (!client) {
    console.log(`ℹ️ [SMS notice - Twilio credentials not configured] To: ${phoneNumber} | Message: ${message}`);
    return { sid: "mock_sid_dev_mode" };
  }
  try {
    const response = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });
    console.log(`SMS sent to ${phoneNumber}: ${response.sid}`);
  } catch (error) {
    console.error("❌ Error sending SMS:", error.message);
  }
};

module.exports = { sendSmsNotification };
