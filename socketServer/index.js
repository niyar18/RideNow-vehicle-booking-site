import express from "express"
import http from "http"
import dotenv from "dotenv"
import cors from "cors"
import helmet from "helmet"
import { Server } from "socket.io"
import crypto from "crypto"
import mongoose from "mongoose"
import { getTrackingExpiry, isTerminalBookingStatus, isTrackingTokenExpired, sanitizePublicTrackingEvent } from "./trackingSecurity.js"

import { createSocketRateLimiter, directRidePayload, hasRiderFields, installLiveGpsHandler, installSocketRateLimit, isDispatchOffer, isTripParticipant, stripRiderFields } from "./rideEventPolicy.js";

dotenv.config()

import User from "./models/user.models.js";
import otpRoutes from "./routes/otpRoutes.js";
import { initializeWhatsApp, baileysService } from "./services/whatsapp/index.js";

// ── Database Connection ──────────────────────────────────────────────────────
const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;
if (!mongoUri) {
  console.error("FATAL: MONGODB_URI or MONGODB_URL is missing in environment variables.");
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  console.log("Database connected successfully");
} catch (error) {
  console.error("Database connection error:", error.message || error);
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  } else {
    console.warn("[Database] Running in disconnected development/testing mode; database operations will wait or fail gracefully.");
  }
}

const app = express()
const server = http.createServer(app)
const port = Number(process.env.PORT) || 5000

// ── Shared Security Secrets ──────────────────────────────────────────────────
const INTERNAL_SECRET =
  process.env.SOCKET_INTERNAL_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET;

if (!INTERNAL_SECRET) {
  console.error("FATAL: SOCKET_INTERNAL_SECRET or AUTH_SECRET is required to secure SocketServer.");
  process.exit(1);
}

// ── Multi-Origin CORS Handling ──────────────────────────────────────────────
const configuredOrigins = (process.env.NEXT_BASE_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Server-to-server or non-browser request
  if (configuredOrigins.length > 0 && configuredOrigins.includes(origin)) return true;
  // Localhost development environments
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Production and preview deployments on Vercel
  if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) return true;
  return false;
};

const corsDelegate = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }
  return callback(new Error(`[SocketCORS] Blocked request from origin: ${origin}`));
};

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: corsDelegate, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// ── WhatsApp OTP Microservice Endpoints ─────────────────────────────────────
app.use("/api/otp", otpRoutes);

// ── Socket.IO Gateway Server ─────────────────────────────────────────────────
const io = new Server(server, {
  maxHttpBufferSize: 1e6, // 1MB payload ceiling prevents memory exhaustion attacks
  pingTimeout: 20000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  cors: {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ── Public Health & Diagnostic Endpoint ──────────────────────────────────────
app.get(["/", "/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "RideNow Realtime Socket Gateway",
    uptimeSeconds: Math.floor(process.uptime()),
    connectedSockets: io?.engine?.clientsCount ?? io?.sockets?.sockets?.size ?? 0,
    timestamp: new Date().toISOString(),
  });
});

// A share link may show trip status after the ride, but it must never expose
// live driver location or retain a public socket subscription after termination.

const publicTrackingExpiryTimers = new Map();

function canonicalBookingId(value) {
  const id = String(value ?? "");
  return mongoose.Types.ObjectId.isValid(id) ? id.toLowerCase() : null;
}

async function findSocketBooking(bookingId) {
  return mongoose.connection.collection("bookings").findOne(
    { _id: new mongoose.Types.ObjectId(bookingId) },
    { projection: { user: 1, driver: 1, shareToken: 1, status: 1, shareTokenExpiresAt: 1, createdAt: 1, isScheduled: 1, scheduledPickupTime: 1 } }
  );
}

async function emitToBookingRoom(bookingId, event, data, excludeSocketId = null, knownBooking) {
  const id = canonicalBookingId(bookingId);
  if (!id || isDispatchOffer(event)) return;

  const room = `booking-${id}`;
  const sockets = await io.in(room).fetchSockets();
  if (sockets.length) {
    const booking = knownBooking === undefined ? await findSocketBooking(id) : knownBooking;
    const participantPayload = stripRiderFields(data);
    for (const roomSocket of sockets) {
      if (roomSocket.id === excludeSocketId) continue;
      if (isTripParticipant(booking, roomSocket.data?.userId, roomSocket.data?.userRole)) {
        roomSocket.emit(event, participantPayload);
      } else {
        await roomSocket.leave(room);
      }
    }
  }

  const observerPayload = sanitizePublicTrackingEvent(event, data, id);
  if (observerPayload) {
    const trackingRoom = `tracking-${id}`;
    const observers = await io.in(trackingRoom).fetchSockets();
    for (const observer of observers) {
      if (observer.data?.publicTrackingExpiries?.[id] > Date.now()) {
        observer.emit(event, observerPayload);
      } else {
        await observer.leave(trackingRoom);
      }
    }
  }
}

function schedulePublicTrackingExpiry(socket, bookingId, expiresAt) {
  const key = `${socket.id}:${bookingId}`;
  const existing = publicTrackingExpiryTimers.get(key);
  if (existing) clearTimeout(existing);

  // Node clamps very long setTimeout delays. Re-schedule long-lived links in
  // bounded chunks so far-future scheduled rides do not expire prematurely.
  const scheduleNextCheck = () => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      const liveSocket = io.sockets.sockets.get(socket.id);
      if (liveSocket) {
        liveSocket.leave(`tracking-${bookingId}`);
        delete liveSocket.data.publicTrackingExpiries?.[bookingId];
      }
      publicTrackingExpiryTimers.delete(key);
      return;
    }

    const timer = setTimeout(scheduleNextCheck, Math.min(remaining, 2_147_000_000));
    timer.unref?.();
    publicTrackingExpiryTimers.set(key, timer);
  };

  scheduleNextCheck();
}

function clearPublicTrackingExpiry(socketId, bookingId) {
  const key = `${socketId}:${bookingId}`;
  const timer = publicTrackingExpiryTimers.get(key);
  if (timer) clearTimeout(timer);
  publicTrackingExpiryTimers.delete(key);
}

async function revokePublicTrackingObservers(bookingId) {
  if (!bookingId) return;
  const room = `tracking-${bookingId}`;
  try {
    const roomSockets = await io.in(room).fetchSockets();
    await Promise.all(roomSockets.map(async (observer) => {
      await observer.leave(room);
      clearPublicTrackingExpiry(observer.id, bookingId);
      delete observer.data.publicTrackingExpiries?.[bookingId];
    }));
  } catch (error) {
    console.error(`[SocketSecurity] Failed to revoke public tracking observers for booking ${bookingId}:`, error);
  }
}

// ── Authoritative Internal Event Emission Endpoint ───────────────────────────
app.post("/emit", async (req, res) => {
  const secret = req.headers["x-socket-secret"] || req.headers["x-internal-secret"];
  if (!secret) {
    return res.status(401).json({ success: false, error: "Missing x-socket-secret header" });
  }

  const secretBuf = Buffer.from(String(secret), "utf8");
  const expectedBuf = Buffer.from(String(INTERNAL_SECRET), "utf8");
  if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    return res.status(403).json({ success: false, error: "Unauthorized socket emission secret" });
  }

  const { userId, event, data, directBookingId, bookingId: legacyBookingId, room } = req.body;
  if (!event || typeof event !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid event name" });
  }

  try {
    const bookingId = canonicalBookingId(directBookingId || legacyBookingId || data?.bookingId || data?._id);
    const roomMatch = /^booking-([a-f\d]{24})$/i.exec(String(room ?? ""));
    const roomBookingId = roomMatch ? canonicalBookingId(roomMatch[1]) : null;
    const riderFields = !isDispatchOffer(event) && hasRiderFields(data);
    const booking = riderFields && bookingId ? await findSocketBooking(bookingId) : undefined;

    // User rooms contain authenticated sessions only. Dispatch offers never
    // fan out to a trip room, and get an independent, minimal payload.
    if (userId) {
      const payload = directRidePayload(event, data, booking, userId);
      if (payload !== null) io.to(`user-${userId}`).emit(event, payload);
    }

    if (!isDispatchOffer(event)) {
      if (bookingId) await emitToBookingRoom(bookingId, event, data, null, booking);
      if (roomBookingId && roomBookingId !== bookingId) {
        await emitToBookingRoom(roomBookingId, event, data);
      } else if (room && !roomMatch && !/^(?:tracking|booking|user)-/i.test(String(room))) {
        io.to(room).emit(event, stripRiderFields(data));
      }
    }

    if (bookingId && isTerminalBookingStatus(data?.status)) {
      await revokePublicTrackingObservers(bookingId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Socket emit endpoint error:", error);
    res.status(500).json({ success: false, error: "Internal emission failure" });
  }
});

// ── Token Verification Helper ────────────────────────────────────────────────
function verifySocketToken(token) {
  if (!token || typeof token !== "string") return null;

  // Direct internal service secret token
  if (token === INTERNAL_SECRET) {
    return { isInternalAdmin: true, role: "admin" };
  }

  // HMAC-signed token: "payloadB64.signature"
  if (token.includes(".")) {
    const parts = token.split(".");
    if (parts.length === 2) {
      const [payloadB64, signature] = parts;
      const expectedSig = crypto
        .createHmac("sha256", INTERNAL_SECRET)
        .update(payloadB64)
        .digest("base64url");

      const sigBuf = Buffer.from(signature, "utf8");
      const expectedBuf = Buffer.from(expectedSig, "utf8");

      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        try {
          const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
          if (decoded?.exp && Date.now() > decoded.exp) {
            console.warn(`[SocketAuth] Expired token for user: ${decoded?.userId}`);
            return null;
          }
          return decoded;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

// ── Handshake Authentication Middleware ──────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const authPayload = socket.handshake.auth || {};
    const token =
      authPayload.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
      socket.handshake.query?.token;

    const trackingToken = authPayload.trackingToken || socket.handshake.query?.trackingToken;
    if (trackingToken) {
      socket.trackingToken = String(trackingToken);
    }

    const verified = verifySocketToken(token);

    if (verified?.isInternalAdmin) {
      socket.isInternalAdmin = true;
      socket.userRole = "admin";
      return next();
    }

    if (verified?.userId) {
      if (!mongoose.Types.ObjectId.isValid(verified.userId)) {
        return next(new Error("Invalid user authentication credentials"));
      }

      const user = await User.findById(verified.userId).select("_id role isVendorBlocked isOnline");
      if (user) {
        if (user.isVendorBlocked) {
          return next(new Error("Vendor account is blocked"));
        }
        socket.userId = user._id.toString();
        socket.userRole = user.role || "user";
        socket.data.userId = user._id.toString();
        socket.data.userRole = socket.userRole;
        return next();
      }
    }

    // Allow unauthenticated connection as guest (for public tracking or pre-login landing)
    socket.userId = null;
    socket.userRole = "guest";
    socket.data.userId = null;
    socket.data.userRole = "guest";
    next();
  } catch (err) {
    console.error("Socket authentication middleware error:", err);
    next();
  }
});

// ── Booking Participant Verification Helper ──────────────────────────────────
async function verifyBookingAccess(bookingId, userId, userRole, trackingToken) {
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return { allowed: false };

  try {
    const booking = await findSocketBooking(bookingId);
    if (!booking) return { allowed: false };

    if (isTripParticipant(booking, userId, userRole)) {
      return {
        allowed: true,
        isRider: String(booking.user) === String(userId),
        isDriver: String(booking.driver) === String(userId),
        isAdmin: userRole === "admin",
      };
    }

    // Public observer access requires the secret share token and an active trip.
    // The link can still show static status via the HTTP endpoint after termination,
    // but it cannot join the live room or receive any further GPS updates.
    if (trackingToken && booking.shareToken && String(trackingToken) === String(booking.shareToken)) {
      if (isTrackingTokenExpired(booking) || isTerminalBookingStatus(booking.status)) {
        return { allowed: false, reason: "tracking-expired-or-ended" };
      }
      return { allowed: true, isObserver: true, expiresAt: getTrackingExpiry(booking) };
    }

    return { allowed: false };
  } catch (err) {
    console.error("[verifyBookingAccess] error:", err);
    return { allowed: false };
  }
}

// Apply the shared 35-event limit and the GPS cooldown once per packet.
const socketRateLimiter = createSocketRateLimiter();

// ── Socket Event Dispatcher ──────────────────────────────────────────────────
io.on("connection", (socket) => {
  installSocketRateLimit(socket, socketRateLimiter);

  // Auto-join user room if authenticated during handshake
  if (socket.userId) {
    socket.join(`user-${socket.userId}`);
    User.findByIdAndUpdate(socket.userId, { socketId: socket.id, lastHeartbeat: new Date() }).catch(() => {});
  }

  // Upgrade guest connection to authenticated socket after user signs in (supports optional acknowledgment callback)
  socket.on("authenticate", async (data, ackCb) => {
    const token = data?.token;
    if (!token) {
      if (typeof ackCb === "function") ackCb({ success: false, error: "Missing token" });
      return;
    }

    const verified = verifySocketToken(token);
    if (!verified?.userId || !mongoose.Types.ObjectId.isValid(verified.userId)) {
      console.warn(`[SocketSecurity] Rejected invalid authenticate token from socket ${socket.id}`);
      if (typeof ackCb === "function") ackCb({ success: false, error: "Invalid token" });
      return;
    }

    try {
      const user = await User.findById(verified.userId).select("_id role isVendorBlocked");
      if (!user || user.isVendorBlocked) {
        if (typeof ackCb === "function") ackCb({ success: false, error: "User blocked or not found" });
        return;
      }

      if (socket.userId && socket.userId !== String(user._id)) {
        if (typeof ackCb === "function") ackCb({ success: false, error: "Reconnect to change user" });
        return;
      }
      socket.userId = user._id.toString();
      socket.userRole = user.role || "user";
      socket.data.userId = user._id.toString();
      socket.data.userRole = socket.userRole;

      socket.join(`user-${socket.userId}`);
      await User.findByIdAndUpdate(socket.userId, { socketId: socket.id, lastHeartbeat: new Date() });
      if (typeof ackCb === "function") ackCb({ success: true, userId: socket.userId });
    } catch (err) {
      console.error("[SocketAuth] authenticate event error:", err);
      if (typeof ackCb === "function") ackCb({ success: false, error: "Authentication failed" });
    }
  });

  // Legacy identity heartbeat: only permitted if caller was already authenticated via token as that user
  socket.on("identity", async (userId) => {
    if (!userId || typeof userId !== "string" || !mongoose.Types.ObjectId.isValid(userId)) {
      return;
    }

    if (socket.userId && socket.userId !== userId) {
      console.warn(`[SocketSecurity] Socket ${socket.id} attempted identity mismatch: authenticated ${socket.userId} vs requested ${userId}`);
      return;
    }

    // Refresh presence if authenticated
    if (socket.userId === userId) {
      User.findByIdAndUpdate(userId, { socketId: socket.id, lastHeartbeat: new Date() }).catch(() => {});
    }
  });

  // Secure Room Joining: Enforces booking access verification with inline fast-path authentication
  socket.on("join-booking", async (payload, ackCb) => {
    const bookingId = canonicalBookingId(typeof payload === "string" ? payload : payload?.bookingId);
    const trackingToken = payload?.trackingToken ?? socket.trackingToken;
    const clientToken = typeof payload === "object" ? payload?.token : null;

    if (!bookingId) {
      if (typeof ackCb === "function") ackCb({ success: false, error: "Invalid booking ID" });
      return;
    }

    // Fast-path inline token verification: If socket is not yet marked authenticated
    // (e.g. race condition on cellular reconnection or background tab resumption),
    // authenticate socket immediately if a signed token is provided.
    if (!socket.userId && (clientToken || socket.handshake?.auth?.token)) {
      const authToken = clientToken || socket.handshake.auth?.token;
      const verified = verifySocketToken(authToken);
      if (verified?.userId && mongoose.Types.ObjectId.isValid(verified.userId)) {
        try {
          const user = await User.findById(verified.userId).select("_id role isVendorBlocked");
          if (user && !user.isVendorBlocked) {
            if (socket.userId && socket.userId !== String(user._id)) {
              if (typeof ackCb === "function") ackCb({ success: false, error: "Reconnect to change user" });
              return;
            }
            socket.userId = String(user._id);
            socket.userRole = user.role || "user";
            socket.data.userId = socket.userId;
            socket.data.userRole = socket.userRole;
            await socket.join(`user-${socket.userId}`);
          }
        } catch (err) {
          console.error("[SocketAuth] Inline authentication failed:", err);
          if (typeof ackCb === "function") ackCb({ success: false, error: "Authentication failed" });
          return;
        }
      }
    }

    const auth = await verifyBookingAccess(bookingId, socket.userId, socket.userRole, trackingToken);
    if (!auth.allowed) {
      console.warn(`[SocketSecurity] Denied unauthorized join attempt for booking ${bookingId} by socket ${socket.id} (user: ${socket.userId || 'guest'})`);
      if (typeof ackCb === "function") ackCb({ success: false, error: "Unauthorized" });
      return;
    }

    const room = `${auth.isObserver ? "tracking" : "booking"}-${bookingId}`;
    if (auth.isObserver && auth.expiresAt <= Date.now()) {
      if (typeof ackCb === "function") ackCb({ success: false, error: "Tracking expired" });
      return;
    }
    if (auth.isObserver) {
      socket.data.publicTrackingExpiries ??= {};
      socket.data.publicTrackingExpiries[bookingId] = auth.expiresAt;
    } else {
      await socket.leave(`tracking-${bookingId}`);
      clearPublicTrackingExpiry(socket.id, bookingId);
      delete socket.data.publicTrackingExpiries?.[bookingId];
    }
    await socket.join(room);
    if (auth.isObserver) schedulePublicTrackingExpiry(socket, bookingId, auth.expiresAt);
    if (typeof ackCb === "function") {
      ackCb({ success: true, room, isObserver: !!auth.isObserver });
    }
  });

  // Leave Booking Room
  socket.on("leave-booking", async (bookingId) => {
    const id = canonicalBookingId(bookingId);
    if (!id) return;
    await socket.leave(`booking-${id}`);
    await socket.leave(`tracking-${id}`);
    clearPublicTrackingExpiry(socket.id, id);
    delete socket.data.publicTrackingExpiries?.[id];
  });

  // Booking status is authoritative server state. Clients must use the
  // authenticated booking APIs; never relay client-supplied status/OTP fields.
  socket.on("booking-status-update", () => {
    socket.emit("error-response", {
      error: "Booking updates must be submitted through the authenticated booking API.",
    });
  });

  installLiveGpsHandler(socket, {
    canonicalBookingId,
    findBooking: findSocketBooking,
    publish: emitToBookingRoom,
    revokeObservers: revokePublicTrackingObservers,
  });

  // In-Ride Chat Messaging: Authenticated booking participants only
  socket.on("chat-message", async (msg) => {
    if (!socket.userId) return;

    const bookingId = msg?.rideId || msg?.bookingId;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) return;

    const auth = await verifyBookingAccess(bookingId, socket.userId, socket.userRole);
    if (!auth.allowed || (!auth.isRider && !auth.isDriver && !auth.isAdmin)) {
      console.warn(`[SocketSecurity] Unauthorized chat message from user ${socket.userId} in booking ${bookingId}`);
      return;
    }

    await emitToBookingRoom(bookingId, "chat-message", msg, socket.id);
  });

  // Call Signaling Authorization: Verified booking participants only
  socket.on("call-user", async (data) => {
    if (!socket.userId || !data?.bookingId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver)) {
      await emitToBookingRoom(data.bookingId, "incoming-call", data, socket.id);
    }
  });

  socket.on("accept-call", async (data) => {
    if (!socket.userId || !data?.bookingId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver)) {
      await emitToBookingRoom(data.bookingId, "call-accepted", data, socket.id);
    }
  });

  socket.on("reject-call", async (data) => {
    if (!socket.userId || !data?.bookingId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver)) {
      await emitToBookingRoom(data.bookingId, "call-rejected", data, socket.id);
    }
  });

  socket.on("end-call", async (data) => {
    if (!socket.userId || !data?.bookingId) return;

    const auth = await verifyBookingAccess(data.bookingId, socket.userId, socket.userRole);
    if (auth.allowed && (auth.isRider || auth.isDriver)) {
      await emitToBookingRoom(data.bookingId, "call-ended", data, socket.id);
    }
  });

  socket.on("disconnect", () => {
    for (const bookingId of Object.keys(socket.data.publicTrackingExpiries || {})) {
      clearPublicTrackingExpiry(socket.id, bookingId);
    }
    socketRateLimiter.delete(socket.id);
  });

  // Driver Idle Location Updates (Geospatial Point for Matching)
  socket.on("update-location", async (payload) => {
    if (!socket.userId || !["vendor", "driver"].includes(socket.userRole)) return;

    const lat = Number(payload?.latitude);
    const lng = Number(payload?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    try {
      await User.findByIdAndUpdate(socket.userId, {
        location: {
          type: "Point",
          coordinates: [lng, lat],
        },
        lastLocationUpdate: new Date(),
        lastHeartbeat: new Date(),
      });
    } catch (err) {
      console.error("update-location error:", err);
    }
  });

  // Graceful Disconnect & Presence Cleanup
  socket.on("disconnect", async () => {
    if (!socket.userId) return;

    try {
      const user = await User.findById(socket.userId).select("role");
      const updateData = { socketId: null };
      if (user && user.role !== "vendor") {
        updateData.isOnline = false;
      }
      await User.findByIdAndUpdate(socket.userId, updateData);
    } catch (err) {
      console.error("Socket disconnect error:", err);
    }
  });
});

// ── Service Startup & Graceful Shutdown ──────────────────────────────────────
server.listen(port, () => {
  console.log(`RideNow Realtime Socket Gateway listening on port ${port}`);
  // Initialize persistent WhatsApp pairing & transport service
  initializeWhatsApp().catch((err) => {
    console.error("[WhatsApp Service] Startup exception:", err?.message || err);
  });
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  try {
    await baileysService.destroy();
  } catch (e) {}
  io.close(() => {
    mongoose.connection.close(false).then(() => {
      console.log("MongoDB connection closed. Exiting process.");
      process.exit(0);
    });
  });
});
