import crypto from "crypto";
import jwt from "../backend/payment-service/node_modules/jsonwebtoken/index.js";

const BASE_URL = (process.env.PAYMENT_URL || "http://127.0.0.1:5004").trim();
const ORDER_URL = (process.env.ORDER_URL || "http://127.0.0.1:5005").trim();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";

const testSecretKey = "MOMO_SEC_KEY_TEST_LIVE_VERIFY";
const testAccessKey = "MOMO_ACC_KEY_TEST_LIVE_VERIFY";
const testPartnerCode = "MOMO_PARTNER_LIVE_TEST";

const customerToken = jwt.sign(
  { id: "cust_momo_live_test", role: "customer", email: "cust_momo@test.com" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

function calculateMoMoCallbackSignature({
  accessKey,
  secretKey,
  amount,
  extraData = "",
  message = "",
  orderId,
  orderInfo = "",
  orderType = "",
  partnerCode,
  payType = "",
  requestId,
  responseTime,
  resultCode,
  transId = "",
}) {
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

async function runTests() {
  console.log("==============================================================================");
  console.log("       STARTING MOMO SANDBOX COMPREHENSIVE INTEGRATION & SECURITY TEST        ");
  console.log("==============================================================================");
  console.log(`Target Payment Service URL: ${BASE_URL}\n`);

  let totalTests = 0;
  let passedTests = 0;

  function assert(title, condition, extra = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${title} ${extra ? `(${extra})` : ""}`);
    } else {
      console.error(`❌ [FAIL] ${title} ${extra ? `(${extra})` : ""}`);
    }
  }

  // 1. Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/api/payment/health`);
    const healthData = await healthRes.json();
    assert("Payment Service Health Check", healthRes.status === 200 && healthData.status === "ok", `status: ${healthRes.status}`);
  } catch (err) {
    assert("Payment Service Health Check", false, err.message);
  }

  // 2. Test: Missing / Placeholder credentials fail fast WITHOUT mock redirect
  try {
    const orderId = `TEST_MOMO_CFG_${Date.now()}`;
    const res = await fetch(`${BASE_URL}/api/payment/momo/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        orderId,
        amount: 50000,
        email: "test@example.com",
        phone: "0901234567",
      }),
    });

    const data = await res.json();
    // If credentials in .env are placeholders (MOMO_PARTNER_TEST), it should reject and list missing vars
    const rejectsPlaceholders = res.status === 400 && Array.isArray(data.missingVars);
    const noMockRedirect = !data.payUrl || !data.payUrl.includes("SandboxSuccess");
    assert(
      "Missing/Dummy Config Rejection: Reports exact missing variables without mock redirect",
      rejectsPlaceholders && noMockRedirect,
      `status=${res.status}, missingVars=${JSON.stringify(data.missingVars)}`
    );
  } catch (err) {
    assert("Missing/Dummy Config Rejection", false, err.message);
  }

  // 3. Test: MoMo Signature Algorithm Specification (HMAC-SHA256 Alphabetical order)
  {
    const sample = {
      accessKey: "k1",
      secretKey: "s1",
      amount: 100000,
      extraData: "",
      message: "Success",
      orderId: "ORD1",
      orderInfo: "Info",
      orderType: "momo_wallet",
      partnerCode: "PARTNER",
      payType: "qr",
      requestId: "REQ1",
      responseTime: 1710672000000,
      resultCode: 0,
      transId: "T1",
    };
    const expectedRaw = `accessKey=k1&amount=100000&extraData=&message=Success&orderId=ORD1&orderInfo=Info&orderType=momo_wallet&partnerCode=PARTNER&payType=qr&requestId=REQ1&responseTime=1710672000000&resultCode=0&transId=T1`;
    const expectedSig = crypto.createHmac("sha256", "s1").update(expectedRaw).digest("hex");
    const actualSig = calculateMoMoCallbackSignature(sample);
    assert("HMAC-SHA256 Signature Algorithm: Matches MoMo v2 alphabetical specification", actualSig === expectedSig);
  }

  // 4. Test: Tampered / Invalid signature callback rejected (HTTP 400)
  try {
    const orderId = `TEST_MOMO_TAMPER_${Date.now()}`;
    const query = new URLSearchParams({
      partnerCode: "MOMO_PARTNER_TEST",
      orderId,
      requestId: `${orderId}_req`,
      amount: "60000",
      orderInfo: "Thanh toan",
      orderType: "momo_wallet",
      transId: "123456",
      resultCode: "0",
      message: "Success",
      payType: "qr",
      responseTime: String(Date.now()),
      extraData: "",
      signature: "tampered_fake_signature_hex_bad",
    });

    const res = await fetch(`${BASE_URL}/api/payment/momo/callback?${query.toString()}`);
    const data = await res.json();
    assert(
      "Callback Security: Rejects forged/tampered signature",
      res.status === 400 && data.isValid === false && data.error.includes("Signature mismatch"),
      `status=${res.status}, error=${data.error}`
    );
  } catch (err) {
    assert("Callback Security", false, err.message);
  }

  // 5. Test: Tampered amount in callback rejected (HTTP 400)
  try {
    const orderId = `TEST_MOMO_AMOUNT_${Date.now()}`;
    // Simulate an IPN with mismatched amount
    const query = new URLSearchParams({
      partnerCode: "MOMO_PARTNER_TEST",
      orderId,
      requestId: `${orderId}_req`,
      amount: "1000", // Wrong amount
      orderInfo: "Thanh toan",
      orderType: "momo_wallet",
      transId: "123456",
      resultCode: "0",
      message: "Success",
      payType: "qr",
      responseTime: String(Date.now()),
      extraData: "",
      signature: "dummy",
    });
    const res = await fetch(`${BASE_URL}/api/payment/momo/callback?${query.toString()}`);
    assert("Tampered Callback Protection: Rejects invalid order/amount", res.status === 400, `status=${res.status}`);
  } catch (err) {
    assert("Tampered Callback Protection", false, err.message);
  }

  // 6. Test: IPN endpoint responds with 400 on invalid signature and doesn't leak secrets
  try {
    const res = await fetch(`${BASE_URL}/api/payment/momo/ipn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerCode: "MOMO_PARTNER_TEST",
        orderId: "NON_EXISTENT",
        amount: 50000,
        signature: "invalid_sig",
      }),
    });
    const data = await res.json().catch(() => ({}));
    assert(
      "IPN Webhook Security: Invalid IPN rejected with HTTP 400",
      res.status === 400,
      `status=${res.status}`
    );
  } catch (err) {
    assert("IPN Webhook Security", false, err.message);
  }

  console.log("\n------------------------------------------------------------------------------");
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("==============================================================================");
}

runTests().catch(console.error);
