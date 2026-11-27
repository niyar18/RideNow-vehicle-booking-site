import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cron/rides/route";

const f = vi.hoisted(() => ({
  connect: vi.fn(), transaction: vi.fn(), find: vi.fn(), claim: vi.fn(),
  clearStudents: vi.fn(), release: vi.fn(), emit: vi.fn(), push: vi.fn(),
  ledger: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: async () => null }));
vi.mock("@/lib/db", () => ({ default: f.connect }));
vi.mock("@/models/booking.model", () => ({
  default: { find: f.find, findOneAndUpdate: f.claim },
}));
vi.mock("@/models/user.model", () => ({ default: { updateMany: f.clearStudents } }));
vi.mock("@/models/wallet.model", () => ({ default: {} }));
vi.mock("@/models/wallet-transaction.model", () => ({ default: { create: f.ledger } }));
vi.mock("@/lib/bookingStateMachine", () => ({ transitionBookingState: vi.fn() }));
vi.mock("@/lib/studentDiscountEngine", () => ({ releaseStudentDiscountReservation: f.release }));
vi.mock("@/lib/socketServerEmit", () => ({ emitSocketEvent: f.emit }));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: f.push }));
vi.mock("@/lib/walletLedger", () => ({ generateTransactionId: () => "TEST" }));
vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), critical: vi.fn() },
}));

const session = { marker: "mock transaction session" };
const bookingId = "64a44c66b5411eb18608fe76";

function request(authorized = true) {
  return new Request("http://localhost/api/cron/rides", {
    method: "POST",
    headers: authorized ? { Authorization: "Bearer local-cron-test" } : {},
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CRON_SECRET", "local-cron-test");
  f.connect.mockResolvedValue({ transaction: f.transaction });
  f.transaction.mockImplementation(async (callback) => callback(session));
  f.find.mockReturnValueOnce({ populate: async () => [] })
    .mockResolvedValueOnce([{ _id: bookingId }]);
  f.clearStudents.mockResolvedValue({ modifiedCount: 0 });
});
afterEach(() => vi.unstubAllEnvs());

describe("rides dispatch cron", () => {
  it("rejects unauthorized calls without touching dispatch state", async () => {
    const result = await POST(request(false));
    expect(result.status).toBe(401);
    expect(f.connect).not.toHaveBeenCalled();
  });

  it("only records expiry if the booking still qualifies inside the database transaction", async () => {
    f.claim.mockResolvedValue(null);
    const result = await POST(request());
    expect(result.status).toBe(200);
    expect(f.claim).toHaveBeenCalledWith(
      expect.objectContaining({ _id: bookingId, status: { $in: ["requested", "searching_driver"] } }),
      expect.objectContaining({ $set: expect.objectContaining({ status: "expired" }) }),
      { new: true, session },
    );
    expect(await result.json()).toMatchObject({ staleExpiredCount: 0, failureCount: 0 });
    expect(f.ledger).not.toHaveBeenCalled();
    expect(f.emit).not.toHaveBeenCalled();
  });

  it("returns non-success when a transactional sweep does not complete", async () => {
    f.transaction.mockRejectedValueOnce(new Error("transaction failed"));
    const result = await POST(request());
    expect(result.status).toBe(500);
    expect(await result.json()).toMatchObject({
      success: false, failureCount: 1, staleExpiredCount: 0,
    });
    expect(f.emit).not.toHaveBeenCalled();
    expect(f.push).not.toHaveBeenCalled();
  });
});
