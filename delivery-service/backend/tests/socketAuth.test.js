import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authenticateSocket } from "../src/middleware/socketAuth.js";

const secret = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";
const createSocket = (token) => ({
  handshake: { auth: token ? { token } : {} },
  data: {},
});

const authenticate = (socket) => new Promise((resolve) => {
  authenticateSocket(socket, (error) => resolve(error || null));
});

describe("Socket.IO delivery recipient authentication", () => {
  it("rejects connections without a token", async () => {
    const error = await authenticate(createSocket());
    assert.match(error.message, /Authentication required/);
  });

  it("rejects invalid tokens and non-driver roles", async () => {
    const invalidTokenError = await authenticate(createSocket("not-a-jwt"));
    assert.match(invalidTokenError.message, /Invalid authentication token/);

    const adminToken = jwt.sign({ id: "admin-1", role: "admin" }, secret);
    const roleError = await authenticate(createSocket(adminToken));
    assert.match(roleError.message, /Delivery recipient authentication required/);
  });

  it("uses the verified recipient ID for the private room", async () => {
    const driverToken = jwt.sign({ id: "driver-123", role: "driver" }, secret);
    const socket = createSocket(driverToken);
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = secret;

    try {
      assert.equal(await authenticate(socket), null);
      assert.equal(socket.data.userId, "driver-123");

      const customerToken = jwt.sign({ id: "customer-123", role: "customer" }, secret);
      const customerSocket = createSocket(customerToken);
      assert.equal(await authenticate(customerSocket), null);
      assert.equal(customerSocket.data.userId, "customer-123");
    } finally {
      if (originalSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = originalSecret;
    }
  });
});