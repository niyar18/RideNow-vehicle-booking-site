# Jaatri External Service Integrations & Failure Handling

> **Last Verified**: October 18, 2026  
> **Environment Reference**: `.env.example`

---

## 1. Razorpay (Payment Gateway)

- **Purpose**: Online ride payments, rider wallet top-ups, driver platform dues settlement.
- **Config Variables**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY`.
- **Implementation**: [`jatri/src/lib/razorpay.ts`](file:///d:/git/RideNow/jatri/src/lib/razorpay.ts), [`paymentService.ts`](file:///d:/git/RideNow/jatri/src/lib/paymentService.ts).
- **Verification**: Server-side HMAC SHA-256 signature verification comparing `order_id + "|" + payment_id` against `razorpay_signature`.
- **Failure Handling**:
  - In development without valid credentials, test mock simulation can execute in dev mode.
  - Webhook endpoint (`POST /api/payment/webhook`) supports idempotent reprocessing if network drops during client confirmation.

---

## 2. ZegoCloud (WebRTC Video KYC)

- **Purpose**: Live audio/video room verification for partner onboarding between admin and driver.
- **Config Variables**: `ZEGO_APP_ID`, `ZEGO_SERVER_SECRET` (strictly server-side), `NEXT_PUBLIC_ZEGO_APP_ID`.
- **Implementation**: `jatri/src/app/api/zego/token/route.ts`, `src/app/video-kyc/[roomId]/page.tsx`.
- **Security Rule**: `ZEGO_SERVER_SECRET` must **NEVER** be exposed with a `NEXT_PUBLIC_` prefix. Client tokens are requested dynamically via `/api/zego/token`.
- **Failure Handling**: Fallback to asynchronous document audit if WebRTC connection fails or bandwidth is insufficient.

---

## 3. Cloudinary (KYC Media Storage)

- **Purpose**: Secure document uploads (Driving License, RC, Insurance, Vehicle photos).
- **Config Variables**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Implementation**: [`jatri/src/lib/cloudinary.ts`](file:///d:/git/RideNow/jatri/src/lib/cloudinary.ts).
- **Failure Handling**: Upload errors return clear 400 responses without storing corrupted records in MongoDB.

---

## 4. Meta WhatsApp Cloud API & SMS (OTP Service)

- **Purpose**: Passwordless authentication, ride confirmation alerts, and emergency notifications.
- **Config Variables**: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.
- **Implementation**: [`jatri/src/lib/whatsapp.ts`](file:///d:/git/RideNow/jatri/src/lib/whatsapp.ts), [`otpService.ts`](file:///d:/git/RideNow/jatri/src/lib/otpService.ts).
- **Fallback**:
  - If WhatsApp API returns a rate-limit or network timeout, the engine falls back to simulated development delivery or secondary SMS gateway.
  - Brute-force protection locks OTP requests for 5 minutes after 5 consecutive failed attempts.

---

## 5. Upstash Redis (Distributed Cache & Lockout)

- **Purpose**: Driver location caching (8s TTL) in `/api/vehicles/nearby`, atomic lockouts, and rate-limiting.
- **Config Variables**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **Implementation**: [`jatri/src/lib/redis.ts`](file:///d:/git/RideNow/jatri/src/lib/redis.ts).
- **Failure Handling**: All Redis operations are wrapped in safe try/catch fallbacks. If Redis is unreachable, the API falls directly back to MongoDB without breaking user flows.

---

## 6. Resend (Email Service)

- **Purpose**: Transaction receipts, booking confirmations, and admin incident notifications.
- **Config Variables**: `RESEND_API_KEY`.
- **Implementation**: [`jatri/src/lib/mailer.ts`](file:///d:/git/RideNow/jatri/src/lib/mailer.ts).
- **Failure Handling**: Non-blocking asynchronous delivery; email failures do not abort ride booking or payment completion.

---

## 7. Web Push (VAPID Browser Notifications)

- **Purpose**: Background browser alerts for drivers on incoming requests and riders on driver arrival.
- **Config Variables**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- **Implementation**: [`jatri/src/lib/webPush.ts`](file:///d:/git/RideNow/jatri/src/lib/webPush.ts).
- **Failure Handling**: Expired subscription endpoints (HTTP 410 Gone) are automatically pruned from `push-subscription.model.ts`.

---

## 8. Scheduled ride dispatch

- The [GitHub Actions workflow](../../.github/workflows/rides-cron.yml) is the only production scheduler for `/api/cron/rides`. It targets a five-minute cadence, but GitHub scheduled jobs may be delayed.
- Before merging, configure the repository secrets `PRODUCTION_APP_URL` (the HTTPS web-app origin) and `CRON_SECRET` (matching the web app). Disable any separate legacy scheduler during cutover and watch the first scheduled run. Missing configuration, network failures and unexpected HTTP statuses fail the workflow.
- Wallet charges and automatic expiry refunds use MongoDB transactions. Use Atlas, a replica set, or a sharded cluster; a standalone MongoDB server is not sufficient.
