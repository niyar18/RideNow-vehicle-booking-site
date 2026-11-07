/**
 * RideNow Payment Service Architecture (Phase 7)
 * Strictly separates:
 * 1. Ride Fare (Gross customer payment)
 * 2. Platform Revenue (Platform booking fee + Commission)
 * 3. Driver Earnings (Net driver credit)
 * 4. Refunds (Partial & Full)
 * 5. Idempotent webhook verification & transaction reconciliation
 */
import crypto from "crypto";
import connectDb from "@/lib/db";
import razorpay from "@/lib/razorpay";
import Booking from "@/models/booking.model";
import Payment, { IPayment } from "@/models/payment.model";
import { transitionBookingState } from "@/lib/bookingStateMachine";
import { calculateCommissionSplit } from "@/lib/commission";
import { generateSecureOtp } from "@/lib/cryptoOtp";
import { recoverCustomerOutstandingDues } from "@/lib/cancellationEngine";
import { Types } from "mongoose";
import logger from "@/lib/logger";

export interface CreateOrderParams {
  bookingId: string;
  userId: string;
  idempotencyKey?: string;
}

export interface VerifyPaymentParams {
  bookingId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  userId?: string;
}

export interface WebhookEventPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        notes?: Record<string, any>;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        receipt: string;
        status: string;
        notes?: Record<string, any>;
      };
    };
  };
}

/**
 * Creates or retrieves an existing payment order with idempotency.
 */
export async function createPaymentOrder(params: CreateOrderParams) {
  await connectDb();
  const { bookingId, userId, idempotencyKey } = params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.user.toString() !== userId.toString()) {
    throw new Error("Unauthorized to initiate payment for this booking");
  }

  if (["completed", "cancelled", "expired"].includes(booking.status)) {
    throw new Error(`Cannot pay for a booking in '${booking.status}' state`);
  }

  if (booking.paymentStatus === "paid") {
    throw new Error("Booking has already been paid for");
  }

  const effectiveIdempotencyKey = idempotencyKey || `order_${booking._id}_${booking.fare}`;

  const effectiveKeyId = (
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    ""
  ).trim();

  // Check existing initiated/pending payment record
  const existingPayment = await Payment.findOne({
    booking: booking._id,
    idempotencyKey: effectiveIdempotencyKey,
    status: { $in: ["initiated", "pending"] },
  });

  if (existingPayment && existingPayment.orderId) {
    return {
      orderId: existingPayment.orderId,
      amount: booking.fare * 100,
      currency: "INR",
      paymentId: existingPayment._id,
      keyId: effectiveKeyId,
    };
  }

  const amountPaise = Math.round(booking.fare * 100);

  // Generate order via Razorpay
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `rcpt_${booking._id.toString().slice(-8)}`,
    notes: {
      bookingId: booking._id.toString(),
      userId: userId.toString(),
    },
  });

  // Calculate revenue separation (Platform Revenue vs Driver Earnings)
  const platformFee = booking.fareBreakdown?.platformFee || 15;
  const dues = booking.cancellationDuesIncluded || 0;
  const rideFareOnly = Math.max(0, booking.fare - dues);
  const { adminCommission, partnerAmount } = calculateCommissionSplit(rideFareOnly);
  const platformRevenue = adminCommission + platformFee + dues;
  const driverEarnings = partnerAmount;

  await Payment.create({
    booking: booking._id,
    user: booking.user,
    driver: booking.driver,
    orderId: order.id,
    method: "online",
    status: "initiated",
    rideFare: booking.fare,
    platformRevenue,
    driverEarnings,
    currency: "INR",
    idempotencyKey: effectiveIdempotencyKey,
  });

  booking.paymentStatus = "pending";
  await booking.save();

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: effectiveKeyId,
  };
}

/**
 * Authoritatively verifies gateway signature and settles transaction.
 */
export async function verifyPayment(params: VerifyPaymentParams) {
  await connectDb();
  const { bookingId, orderId, paymentId, signature } = params;

  // 1. Verify HMAC Signature
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error("Payment gateway configuration missing key secret");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const sigBuf = Buffer.from(expectedSignature, "utf8");
  const recBuf = Buffer.from(signature, "utf8");
  if (sigBuf.length !== recBuf.length || !crypto.timingSafeEqual(sigBuf, recBuf)) {
    throw new Error("Invalid payment signature verification failed");
  }

  // 2. Fetch Booking & Payment record
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  // ── Ownership: caller must own this booking ────────────────────────────
  if (params.userId && booking.user?.toString() !== params.userId.toString()) {
    throw new Error("Unauthorized to verify payment for this booking");
  }

  // Idempotency: If already confirmed and paid with this transaction, return success
  if (booking.paymentStatus === "paid") {
    const existingSuccess = await Payment.findOne({
      booking: booking._id,
      transactionId: paymentId,
      status: "success",
    });
    if (existingSuccess) {
      return { success: true, booking, payment: existingSuccess, isDuplicate: true };
    }
  }

  // 3. Update Payment record to SUCCESS
  const payment = await Payment.findOneAndUpdate(
    { orderId },
    {
      $set: {
        transactionId: paymentId,
        status: "success",
        reconciledAt: new Date(),
        gatewayResponse: { paymentId, orderId, verifiedAt: new Date() },
      },
    },
    { new: true, upsert: true }
  );

  // 4. Update Booking and generate pickup OTP if not set
  booking.paymentStatus = "paid";
  if (!booking.pickupOtp) {
    booking.pickupOtp = generateSecureOtp(4);
    booking.pickupOtpExpires = new Date(Date.now() + 60 * 60 * 1000);
  }

  booking.adminCommission = payment.platformRevenue;
  booking.partnerAmount = payment.driverEarnings;

  // Transition booking to confirmed via State Machine
  await transitionBookingState({
    bookingId: booking._id,
    targetStatus: "confirmed",
    actorRole: "system",
    payload: {
      paymentStatus: "paid",
      pickupOtp: booking.pickupOtp,
      pickupOtpExpires: booking.pickupOtpExpires,
      adminCommission: payment.platformRevenue,
      partnerAmount: payment.driverEarnings,
    },
  });

  // 5. Recover customer outstanding cancellation dues if included in this ride
  if (booking.user && booking.cancellationDuesIncluded && booking.cancellationDuesIncluded > 0) {
    try {
      await recoverCustomerOutstandingDues({
        userId: booking.user,
        paidAmount: booking.cancellationDuesIncluded,
        bookingId: booking._id,
      });
    } catch (recErr: any) {
      logger.error("payment.verify.dues_recovery_failed", {
        bookingId: String(booking._id),
        userId: String(booking.user),
        amount: booking.cancellationDuesIncluded,
        error: recErr?.message || String(recErr),
      });
    }
  }

  return {
    success: true,
    booking,
    payment,
    isDuplicate: false,
  };
}

/**
 * Handles Webhook event with signature validation and replay protection.
 */
export async function handleRazorpayWebhook(
  rawBody: string,
  webhookSignature: string
): Promise<{ success: boolean; event: string; message: string }> {
  await connectDb();

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Fail closed: if the secret is not configured we cannot authenticate the
    // webhook caller, so we must not process the event.
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured; webhook rejected");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(expectedSignature, "utf8");
  const recBuf = Buffer.from(webhookSignature, "utf8");
  if (sigBuf.length !== recBuf.length || !crypto.timingSafeEqual(sigBuf, recBuf)) {
    throw new Error("Invalid webhook signature");
  }

  const data: WebhookEventPayload = JSON.parse(rawBody);
  const event = data.event;

  if (event === "order.paid" || event === "payment.captured") {
    const paymentEntity = data.payload.payment?.entity;
    const orderEntity = data.payload.order?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id;

    if (orderId) {
      const notesType = orderEntity?.notes?.type || paymentEntity?.notes?.type;
      const topupUserId = orderEntity?.notes?.userId || paymentEntity?.notes?.userId;

      // 1. Reconcile Customer Wallet Top-Up
      if (notesType === "wallet_topup" && topupUserId) {
        const amountPaise = Number(paymentEntity?.amount || orderEntity?.amount || 0);
        const creditRupees = Math.round(amountPaise / 100);

        if (creditRupees > 0) {
          const { creditUserWalletTopup } = await import("@/lib/walletLedger");
          const topupResult = await creditUserWalletTopup({
            userId: topupUserId,
            amount: creditRupees,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            source: "Online Payment (Webhook Reconciled)",
          });

          // Emit real-time update to user wallet
          try {
            const { emitSocketEvent } = await import("@/lib/socketServerEmit");
            await emitSocketEvent({
              userId: topupUserId,
              event: "wallet-updated",
              data: {
                balance: topupResult.balanceAfter,
                amountCredited: creditRupees,
              },
            });
          } catch (socketErr) {
            logger.warn("payment.webhook.wallet_socket_emit_failed", { error: String(socketErr) });
          }

          logger.info("payment.webhook.wallet_topup_reconciled", {
            userId: topupUserId,
            orderId,
            paymentId,
            amount: creditRupees,
            isIdempotentReplay: topupResult.isIdempotentReplay,
          });

          return {
            success: true,
            event,
            message: `Wallet topup of ₹${creditRupees} successfully reconciled via webhook`,
          };
        }
      }

      // 2. Reconcile Driver Platform Dues Settlement
      const duesDriverId = orderEntity?.notes?.driverId || paymentEntity?.notes?.driverId;
      if (notesType === "driver_platform_dues_settlement" && duesDriverId) {
        const amountPaise = Number(paymentEntity?.amount || orderEntity?.amount || 0);
        const duesRupees = Math.round(amountPaise / 100);

        if (duesRupees > 0) {
          const { settleDriverPlatformDues } = await import("@/lib/walletLedger");
          const duesResult = await settleDriverPlatformDues({
            driverId: duesDriverId,
            amount: duesRupees,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
          });

          logger.info("payment.webhook.driver_dues_reconciled", {
            driverId: duesDriverId,
            orderId,
            paymentId,
            paidAmount: duesResult.paidAmount,
          });

          return {
            success: true,
            event,
            message: `Driver platform dues settlement of ₹${duesResult.paidAmount} reconciled via webhook`,
          };
        }
      }

      // 3. Reconcile Ride Booking Payment
      const paymentDoc = await Payment.findOne({ orderId });
      if (paymentDoc && paymentDoc.status !== "success") {
        paymentDoc.status = "success";
        paymentDoc.transactionId = paymentId || paymentDoc.transactionId;
        paymentDoc.webhookProcessed = true;
        paymentDoc.reconciledAt = new Date();
        await paymentDoc.save();

        const booking = await Booking.findById(paymentDoc.booking);
        if (booking && booking.paymentStatus !== "paid") {
          booking.paymentStatus = "paid";
          if (!booking.pickupOtp) {
            booking.pickupOtp = generateSecureOtp(4);
            booking.pickupOtpExpires = new Date(Date.now() + 60 * 60 * 1000);
          }
          booking.adminCommission = paymentDoc.platformRevenue;
          booking.partnerAmount = paymentDoc.driverEarnings;
          await booking.save();

          // Full state reconciliation via booking state machine
          await transitionBookingState({
            bookingId: booking._id,
            targetStatus: "confirmed",
            actorRole: "system",
            payload: {
              paymentStatus: "paid",
              pickupOtp: booking.pickupOtp,
              pickupOtpExpires: booking.pickupOtpExpires,
              adminCommission: paymentDoc.platformRevenue,
              partnerAmount: paymentDoc.driverEarnings,
            },
          });

          // Recover customer outstanding cancellation dues if included in this ride
          if (booking.user && booking.cancellationDuesIncluded && booking.cancellationDuesIncluded > 0) {
            try {
              await recoverCustomerOutstandingDues({
                userId: booking.user,
                paidAmount: booking.cancellationDuesIncluded,
                bookingId: booking._id,
              });
            } catch (recErr: any) {
              logger.error("payment.webhook.dues_recovery_failed", {
                bookingId: String(booking._id),
                userId: String(booking.user),
                amount: booking.cancellationDuesIncluded,
                error: recErr?.message || String(recErr),
              });
            }
          }

          // Emit real-time updates to rider and driver
          try {
            const { emitSocketEvent } = await import("@/lib/socketServerEmit");
            if (booking.driver) {
              await emitSocketEvent({
                userId: booking.driver.toString(),
                event: "booking-updated",
                data: {
                  bookingId: booking._id.toString(),
                  status: "confirmed",
                  paymentStatus: "paid",
                },
                directBookingId: booking._id.toString(),
              });
            }
            if (booking.user) {
              await emitSocketEvent({
                userId: booking.user.toString(),
                event: "booking-updated",
                data: {
                  bookingId: booking._id.toString(),
                  status: "confirmed",
                  paymentStatus: "paid",
                  pickupOtp: booking.pickupOtp,
                },
                directBookingId: booking._id.toString(),
              });
            }
          } catch (sockErr: any) {
            logger.warn("payment.webhook.socket_emit_failed", {
              bookingId: String(booking._id),
              error: sockErr?.message || String(sockErr),
            });
          }

          // Web push to user
          if (booking.user) {
            try {
              const { sendPushToUser } = await import("@/lib/webPush");
              await sendPushToUser(booking.user.toString(), {
                title: "Payment Confirmed! 🚗",
                body: "Your ride is confirmed. Open Jaatri to track your driver in real-time.",
                url: `/ride/${booking._id}`,
              });
            } catch (pushErr: any) {
              logger.warn("payment.webhook.push_notification_failed", {
                bookingId: String(booking._id),
                userId: String(booking.user),
                error: pushErr?.message || String(pushErr),
              });
            }
          }
        }
      }
    }
  }

  return { success: true, event, message: "Webhook processed successfully" };
}
