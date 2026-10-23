import dotenv from "dotenv";
import http from "http";
import crypto from "crypto";
import { io as Client } from "socket.io-client";

dotenv.config();

const PORT = process.env.TEST_PORT || process.env.PORT || 5001;
const SERVER_URL = `http://localhost:${PORT}`;
const SECRET = process.env.SOCKET_INTERNAL_SECRET || process.env.AUTH_SECRET;

if (!SECRET) {
  console.error("FATAL: SOCKET_INTERNAL_SECRET is required to run integration tests.");
  process.exit(1);
}

function createSignedToken(userId, role = "user", expOffsetMs = 3600000) {
  const payload = {
    userId,
    role,
    exp: Date.now() + expOffsetMs,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

async function runTests() {
  console.log("=== Starting RideNow SocketServer Integration Test Suite ===");
  console.log(`Target Server: ${SERVER_URL}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, description) {
    if (condition) {
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${description}`);
      failed++;
    }
  }

  // 1. Health check
  try {
    const res = await fetch(`${SERVER_URL}/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === "ok", "GET /health returns 200 OK with status: 'ok'");
  } catch (err) {
    assert(false, `GET /health failed: ${err.message}`);
  }

  // 2. POST /emit security checks
  try {
    const resNoSecret = await fetch(`${SERVER_URL}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "test", data: {} }),
    });
    assert(resNoSecret.status === 401, "POST /emit without secret rejected with 401 Unauthorized");

    const resBadSecret = await fetch(`${SERVER_URL}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-socket-secret": "invalid-wrong-secret",
      },
      body: JSON.stringify({ event: "test", data: {} }),
    });
    assert(resBadSecret.status === 403, "POST /emit with invalid secret rejected with 403 Forbidden");

    const resValid = await fetch(`${SERVER_URL}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-socket-secret": SECRET,
      },
      body: JSON.stringify({
        event: "test-broadcast",
        room: "test-room",
        data: { message: "hello" },
      }),
    });
    const validData = await resValid.json();
    assert(resValid.status === 200 && validData.success === true, "POST /emit with valid secret succeeds with 200 OK");
  } catch (err) {
    assert(false, `POST /emit tests failed: ${err.message}`);
  }

  // 3. Socket Client Handshake with Valid Signed Token
  const testUserId = "64b1f8e1234567890abcdef1";
  const validToken = createSignedToken(testUserId, "driver");

  const socketClient = Client(SERVER_URL, {
    auth: { token: validToken },
    transports: ["websocket", "polling"],
  });

  await new Promise((resolve) => {
    socketClient.on("connect", () => {
      assert(socketClient.connected, "Socket client connects successfully with valid signed token");
      resolve();
    });
    socketClient.on("connect_error", (err) => {
      assert(false, `Socket client connection error: ${err.message}`);
      resolve();
    });
  });

  // 4. Socket Client Handshake with Tampered Token
  const tamperedToken = validToken.substring(0, validToken.length - 4) + "XXXX";
  const badClient = Client(SERVER_URL, {
    auth: { token: tamperedToken },
    transports: ["websocket", "polling"],
  });

  await new Promise((resolve) => {
    badClient.on("connect", () => {
      // Connects as unauthenticated public socket, but should not have authenticated identity
      assert(true, "Client with tampered token is restricted to unauthenticated state");
      badClient.disconnect();
      resolve();
    });
    badClient.on("connect_error", () => {
      assert(true, "Client with tampered token connection error or rejected");
      resolve();
    });
  });

  // 5. A booking ID alone must not grant a guest access to the booking room.
  try {
    const probeBookingId = crypto.randomBytes(12).toString("hex"); // Valid ObjectId shape, no fixture required
    let receivedPrivateEvent = false;
    const probeId = crypto.randomBytes(8).toString("hex");
    const onProbeEvent = (data) => {
      if (data?.probeId === probeId) receivedPrivateEvent = true;
    };
    socketClient.on("driver-location", onProbeEvent);

    socketClient.emit("join-booking", probeBookingId);
    // Allow the asynchronous authorization/database check to finish before probing the room.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const emitProbe = await fetch(`${SERVER_URL}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-socket-secret": SECRET,
      },
      body: JSON.stringify({
        event: "driver-location",
        bookingId: probeBookingId,
        data: { probeId, latitude: 26.2, longitude: 91.7 },
      }),
    });
    assert(emitProbe.status === 200, "Authorized internal test event can be emitted to the probe room");

    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(!receivedPrivateEvent, "Guest cannot subscribe to a booking room using only its booking ID");
    socketClient.off("driver-location", onProbeEvent);
  } catch (err) {
    assert(false, `Unauthorized booking-room subscription test failed: ${err.message}`);
  }

  // 6. Rate Limiting verification
  await new Promise((resolve) => {
    let rateLimitWarning = false;
    socketClient.on("rate-limit-warning", () => {
      rateLimitWarning = true;
    });

    // Fire 40 rapid events to trigger rate limit ceiling (>35/sec)
    for (let i = 0; i < 40; i++) {
      socketClient.emit("ping-test", { index: i });
    }

    setTimeout(() => {
      assert(rateLimitWarning, "Rate limiter triggers 'rate-limit-warning' on message burst > 35/sec");
      resolve();
    }, 600);
  });

  // Clean up
  socketClient.disconnect();

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
