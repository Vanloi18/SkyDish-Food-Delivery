require("dotenv").config();

const { sendOTPEmail } = require("./services/emailService");

const testEmail = async () => {
  try {
    const otp = "123456";

    await sendOTPEmail(
      "GMAIL_NHAN_TEST_CUA_BAN@gmail.com",
      otp
    );

    console.log("================================");
    console.log("✅ Gửi email thành công!");
    console.log("OTP test:", otp);
    console.log("================================");
  } catch (error) {
    console.error("❌ Gửi email thất bại!");
    console.error(error);
  }
};

testEmail();