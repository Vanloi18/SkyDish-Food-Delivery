const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const sendOTPEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"SkyDish Food Delivery" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "SkyDish - Mã xác nhận đặt lại mật khẩu",

    text: `Mã OTP đặt lại mật khẩu SkyDish của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 20px;
      ">
        <h2 style="color: #ff5722;">
          SkyDish Food Delivery
        </h2>

        <p>Xin chào,</p>

        <p>
          Bạn vừa yêu cầu đặt lại mật khẩu tài khoản SkyDish.
        </p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          text-align: center;
          padding: 20px;
          background: #fff3ee;
          border-radius: 10px;
          margin: 20px 0;
        ">
          ${otp}
        </div>

        <p>
          Mã này có hiệu lực trong
          <strong>5 phút</strong>.
        </p>

        <p>
          Nếu bạn không yêu cầu đặt lại mật khẩu,
          hãy bỏ qua email này.
        </p>

        <hr />

        <p style="color: #777;">
          SkyDish Food Delivery
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendOTPEmail,
};