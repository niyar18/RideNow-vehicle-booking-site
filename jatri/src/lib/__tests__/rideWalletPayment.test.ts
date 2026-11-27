import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as confirmCash } from "@/app/api/booking/[id]/confirm-payment/route";
import { POST as chargeWallet } from "@/app/api/wallet/pay/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  transaction: vi.fn(),
  findBooking: vi.fn(),
  findUser: vi.fn(),
  updateUser: vi.fn(),
  findWallet: vi.fn(),
  updateWallet: vi.fn(),
  findReceipt: vi.fn(),
  findPriorDebit: vi.fn(),
  createLedger: vi.fn(),
  emit: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ default: async () => ({ transaction: mocks.transaction }) }));
vi.mock("@/models/booking.model", () => ({ default: { findById: mocks.findBooking } }));
vi.mock("@/models/user.model", () => ({
  default: { findById: mocks.findUser, updateOne: mocks.updateUser },
}));
vi.mock("@/models/wallet.model", () => ({
  default: { findOne: mocks.findWallet, updateOne: mocks.updateWallet },
}));
vi.mock("@/models/wallet-transaction.model", () => ({
  default: { findOne: mocks.findReceipt, exists: mocks.findPriorDebit, create: mocks.createLedger },
}));
vi.mock("@/lib/walletLedger", () => ({ generateTransactionId: () => "test-transaction" }));
vi.mock("@/lib/cryptoOtp", () => ({ generateSecureOtp: () => "1234" }));
vi.mock("@/lib/socketServerEmit", () => ({ emitSocketEvent: mocks.emit }));
vi.mock("@/lib/rateLimit", () => ({ rateLimiter: { check: () => ({ allowed: true }) } }));

const bookingId = "507f1f77bcf86cd799439011";
const riderId = "507f1f77bcf86cd799439012";
const driverId = "507f1f77bcf86cd799439013";
const dbSession = { id: "test session" };
const makeBooking = (overrides = {}) => ({
  _id: bookingId,
  user: riderId,
  driver: driverId,
  fare: 100,
  paymentStatus: "pending",
  status: "awaiting_payment",
  save: vi.fn(),
  ...overrides,
});
const req = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/test", { method: "POST", body: JSON.stringify(body) });
const cash = (body: Record<string, unknown>) => confirmCash(req(body), { params: Promise.resolve({ id: bookingId }) });

describe("Ride wallet payment", () => {
  let booking: ReturnType<typeof makeBooking>;

  beforeEach(() => {
    vi.resetAllMocks();
    booking = makeBooking();
    mocks.auth.mockResolvedValue({ user: { id: riderId } });
    mocks.transaction.mockImplementation(async (fn) => fn(dbSession));
    mocks.findBooking.mockReturnValue({ session: vi.fn().mockResolvedValue(booking) });
    const user = { _id: riderId, role: "user", walletBalance: 250, outstandingAmount: 0 };
    mocks.findUser.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(user),
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(user) }),
      }),
    });
    mocks.findWallet.mockReturnValue({ session: vi.fn().mockResolvedValue({ _id: "wallet", balance: 250 }) });
    mocks.findPriorDebit.mockReturnValue({ session: vi.fn().mockResolvedValue(null) });
    mocks.findReceipt.mockReturnValue({
      select: () => ({ session: () => ({ lean: async () => ({ transactionId: "original", balanceAfter: 150 }) }) }),
    });
    mocks.updateWallet.mockResolvedValue({ matchedCount: 1 });
    mocks.updateUser.mockResolvedValue({ matchedCount: 1 });
  });

  it("commits wallet debit, user mirror, ledger and booking through one session before emitting", async () => {
    mocks.transaction.mockImplementation(async (fn) => {
      const result = await fn(dbSession);
      expect(mocks.emit).not.toHaveBeenCalled();
      return result;
    });
    const result = await chargeWallet(req({ bookingId }));
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ success: true, newBalance: 150 });
    expect(mocks.updateWallet).toHaveBeenCalledWith(
      { _id: "wallet", balance: { $gte: 100 } },
      { $set: { balance: 150, outstandingAmount: 0 } }, { session: dbSession }
    );
    expect(mocks.updateUser).toHaveBeenCalledWith(
      { _id: riderId },
      { $set: { walletBalance: 150, outstandingAmount: 0 } }, { session: dbSession }
    );
    expect(mocks.createLedger).toHaveBeenCalledWith(
      [expect.objectContaining({
        idempotencyKey: `RIDE_WALLET_PAYMENT:${bookingId}`, amount: 100,
      })], { session: dbSession }
    );
    expect(booking.save).toHaveBeenCalledWith({ session: dbSession });
    expect(booking).toMatchObject({ status: "confirmed", paymentStatus: "paid", walletAmountPaid: 100, cashAmountDue: 0 });
    expect(mocks.emit.mock.calls[0][0].data).not.toHaveProperty("pickupOtp");
    expect(mocks.emit.mock.calls[1][0]).toMatchObject({ userId: riderId, data: { pickupOtp: "1234" } });
  });

  it("balances fare and recovered cancellation dues in the same transaction", async () => {
    Object.assign(booking, { cancellationDuesIncluded: 10 });
    mocks.findUser.mockReturnValue({
      select: () => ({
        lean: async () => ({ _id: riderId }),
        session: () => ({ lean: async () => ({ walletBalance: 250, outstandingAmount: 15 }) }),
      }),
    });
    const result = await chargeWallet(req({ bookingId }));
    expect(result.status).toBe(200);
    expect(booking).toMatchObject({ walletPaymentConfirmedAt: expect.any(Date), walletAmountPaid: 100 });
    expect(mocks.createLedger).toHaveBeenNthCalledWith(1,
      [expect.objectContaining({ transactionType: "RIDE_PAYMENT", amount: 90, balanceAfter: 160 })],
      { session: dbSession }
    );
    expect(mocks.createLedger).toHaveBeenNthCalledWith(2,
      [expect.objectContaining({ transactionType: "OUTSTANDING_RECOVERY", amount: 15, balanceAfter: 145 })],
      { session: dbSession }
    );
    expect(mocks.updateWallet).toHaveBeenCalledWith(
      { _id: "wallet", balance: { $gte: 105 } },
      { $set: { balance: 145, outstandingAmount: 0 } }, { session: dbSession }
    );
  });

  it("records a partial wallet and cash split without charging more than requested", async () => {
    const result = await cash({ method: "cash", useWallet: true, walletAmount: 30 });
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      success: true, paymentStatus: "cash", walletAmountPaid: 30, cashAmountDue: 70,
    });
    expect(mocks.createLedger).toHaveBeenCalledWith(
      [expect.objectContaining({ idempotencyKey: `RIDE_WALLET_PAYMENT:${bookingId}`, amount: 30 })],
      { session: dbSession }
    );
    expect(booking.save).toHaveBeenCalledWith({ session: dbSession });
  });

  it("keeps the cash-only path free of wallet writes", async () => {
    const result = await cash({ method: "cash" });
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ paymentStatus: "cash", cashAmountDue: 100 });
    expect(mocks.updateWallet).not.toHaveBeenCalled();
    expect(mocks.createLedger).not.toHaveBeenCalled();
  });

  it("keeps the selected cash payment method once checkout has been finalized", async () => {
    expect((await cash({ method: "cash", useWallet: true, walletAmount: 30 })).status).toBe(200);
    expect((await chargeWallet(req({ bookingId }))).status).toBe(409);
    expect(mocks.updateWallet).toHaveBeenCalledTimes(1);
    expect(mocks.createLedger).toHaveBeenCalledTimes(1);
  });

  it("fails closed without wallet writes for a booking that is no longer payable", async () => {
    Object.assign(booking, { status: "cancelled" });
    expect((await chargeWallet(req({ bookingId }))).status).toBe(400);
    expect(mocks.updateWallet).not.toHaveBeenCalled();
    expect(mocks.createLedger).not.toHaveBeenCalled();
  });

  it("returns the existing payment on replay without touching wallet or sending notifications", async () => {
    Object.assign(booking, { status: "confirmed", paymentStatus: "paid" });
    const result = await chargeWallet(req({ bookingId }));
    expect(await result.json()).toMatchObject({
      success: true, isIdempotentReplay: true, transactionId: "original", newBalance: 150,
    });
    expect(mocks.updateWallet).not.toHaveBeenCalled();
    expect(mocks.createLedger).not.toHaveBeenCalled();
    expect(booking.save).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("does not notify on a storage error before payment commits", async () => {
    const mute = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.createLedger.mockRejectedValue(new Error("test storage failure"));
      const result = await chargeWallet(req({ bookingId }));
      expect(result.status).toBe(500);
      expect(booking.save).not.toHaveBeenCalled();
      expect(mocks.emit).not.toHaveBeenCalled();
    } finally {
      mute.mockRestore();
    }
  });
});
