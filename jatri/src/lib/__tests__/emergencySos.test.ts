import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { triggerEmergencySos } from "@/lib/safetyEngine";
import { POST as panic } from "@/app/api/booking/[id]/panic/route";
import { POST as checkIn } from "@/app/api/booking/[id]/safety-checkin/route";

const fake = vi.hoisted(() => ({
  connect: vi.fn(), auth: vi.fn(), booking: vi.fn(), create: vi.fn(), push: vi.fn(), socket: vi.fn(), family: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ default: fake.connect }));
vi.mock("@/auth", () => ({ auth: fake.auth }));
vi.mock("@/models/booking.model", () => ({ default: { findById: fake.booking } }));
vi.mock("@/models/safetyIncident.model", () => ({ default: { create: fake.create } }));
vi.mock("@/models/user.model", () => ({ default: {} }));
vi.mock("@/models/family.model", () => ({ default: { findOne: fake.family } }));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: fake.push }));
vi.mock("@/lib/socketServerEmit", () => ({ emitSocketEvent: fake.socket }));

const ctx = { params: Promise.resolve({ id: "ride" }) };
const request = (action?: string) => new NextRequest("https://example.invalid/ride", {
  method: "POST", ...(action ? { body: JSON.stringify({ action }) } : {}),
});

describe("SOS incident recording", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fake.auth.mockResolvedValue({ user: { id: "rider", role: "user" } });
    const row = { _id: "ride", user: "rider", driver: "partner", save: vi.fn().mockResolvedValue(null) };
    fake.booking.mockReturnValue(Object.assign(Promise.resolve(row), {
      populate: vi.fn().mockResolvedValue(row),
      select: vi.fn(() => ({ lean: vi.fn().mockResolvedValue(row) })),
    }));
    fake.create.mockImplementation(async (incident) => incident);
  });

  it("persists that contacts were not notified, does not fetch their numbers, and gives truthful push guidance", async () => {
    const result = await triggerEmergencySos({ bookingId: "ride", reporterId: "rider", reporterRole: "user" });
    expect(result.incidentId).toMatch(/^INC_SOS_/);
    expect(fake.family).not.toHaveBeenCalled();
    expect(fake.create).toHaveBeenCalledWith(expect.objectContaining({
      type: "sos_panic", emergencyContactsNotified: false, notifiedContactsCount: 0,
    }));
    expect(fake.push).toHaveBeenCalledWith("rider", expect.objectContaining({
      title: "SOS recorded in Jaatri",
      body: expect.stringMatching(/did not contact emergency services.*call 112 directly/i),
    }));
  });

  it.each([["panic", panic, undefined], ["route check-in", checkIn, "trigger_sos"]] as const)(
    "confirms a persisted incident for %s", async (_, endpoint, action) => {
      const res = await endpoint(request(action), ctx);
      expect(res.status).toBe(200);
      const payload = await res.json();
      expect(payload).toMatchObject({ incidentRecorded: true, incidentId: expect.stringMatching(/^INC_SOS_/) });
      expect(payload).not.toHaveProperty("emergencyContactsAlerted");
    },
  );

  it.each([["panic", panic, undefined], ["route check-in", checkIn, "trigger_sos"]] as const)(
    "does not confirm an incident on write failure for %s", async (_, endpoint, action) => {
      fake.create.mockRejectedValueOnce(new Error("fixture write fails"));
      const res = await endpoint(request(action), ctx);
      expect(res.status).toBe(500);
      const payload = await res.json();
      expect(payload).not.toHaveProperty("incidentRecorded");
      expect(JSON.stringify(payload)).toMatch(/call 112 directly/i);
      expect(fake.push).not.toHaveBeenCalled();
      expect(fake.socket).not.toHaveBeenCalled();
    },
  );

  it("keeps driver panic but limits the rider check-in route to the rider", async () => {
    fake.auth.mockResolvedValue({ user: { id: "partner", role: "driver" } });
    expect((await checkIn(request("trigger_sos"), ctx)).status).toBe(403);
    expect(fake.create).not.toHaveBeenCalled();
    expect((await panic(request(), ctx)).status).toBe(200);
  });
});
