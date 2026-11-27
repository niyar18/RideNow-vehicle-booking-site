import { afterEach, describe, expect, it, vi } from "vitest";
import { validateAdminFareChange } from "../adminFareEditing";
import { NextRequest } from "next/server";

const mock = vi.hoisted(() => ({
  auth: vi.fn(), db: vi.fn(), rates: vi.fn(), save: vi.fn(), create: vi.fn(), audit: vi.fn(), incident: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mock.auth }));
vi.mock("@/lib/db", () => ({ default: mock.db }));
vi.mock("@/models/fareConfig.model", () => ({
  default: { find: mock.rates, findOne: mock.rates, findOneAndUpdate: mock.save, create: mock.create },
}));
vi.mock("@/models/safetyIncident.model", () => ({
  default: { findOneAndUpdate: mock.incident },
}));
vi.mock("@/lib/safetyEngine", () => ({ resolveSafetyIncident: vi.fn() }));
vi.mock("@/lib/auditLogger", () => ({ recordAuditLog: mock.audit }));
import { GET, POST } from "@/app/api/admin/pricing/route";
import { PATCH as triage } from "@/app/api/admin/safety/incidents/route";

const candidate = { vehicleType: "auto", changes: { baseFare: 55 }, version: null, reason: "Correct local rate" };
const request = (data: unknown) => new NextRequest("https://example.invalid/api/admin", { method: "POST", body: JSON.stringify(data) });
const staff = { user: { id: "fixture-admin", role: "admin" } };
afterEach(() => vi.resetAllMocks());

describe("admin fare controls", () => {
  it("rejects unsupported classes, non-numeric edits, inactive fare fields, impossible distance ranges and missing reasons", () => {
    for (const update of [
      { ...candidate, vehicleType: "__proto__" }, { ...candidate, changes: { taxRate: "0.9" } },
      { ...candidate, changes: { pricePerMinute: 50 } }, { ...candidate, changes: { taxRate: 2 } },
      { ...candidate, changes: { minDistance: 120, maxDistance: 150 } }, { ...candidate, reason: "" },
    ]) expect(() => validateAdminFareChange(update)).toThrow();
  });
  it("denies anonymous and non-admin reads and writes without opening a data connection", async () => {
    for (const user of [null, { user: { id: "viewer", role: "user" } }]) {
      mock.auth.mockResolvedValue(user);
      expect((await GET()).status).toEqual(403);
      expect((await POST(request(candidate))).status).toEqual(403);
      expect((await triage(request({ incidentId: "test", reason: "Test reason" }))).status).toEqual(403);
    }
    expect(mock.db).not.toHaveBeenCalled();
  });
  it("returns default fare rows without writing to storage", async () => {
    mock.auth.mockResolvedValue(staff);
    mock.rates.mockReturnValue({ lean: async () => [] });
    const response = await GET();
    const data = await response.json();
    expect(data.configs.some((row: { vehicleType: string; version: unknown }) => row.vehicleType === "intercity" && row.version === null)).toBe(true);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it("rejects stale forms before a mutation", async () => {
    const updatedAt = new Date("2026-11-24T12:00:00Z");
    mock.auth.mockResolvedValue(staff);
    mock.rates.mockResolvedValue({ _id: "fare", updatedAt, toObject: () => ({ vehicleType: "auto", baseFare: 50 }) });
    expect((await POST(request(candidate))).status).toEqual(409);
    expect(mock.save).not.toHaveBeenCalled();
  });
  it("updates only approved fields and records before and after values", async () => {
    const updatedAt = new Date("2026-11-24T12:00:00Z");
    mock.auth.mockResolvedValue(staff);
    mock.rates.mockResolvedValue({ _id: "fare", updatedAt, toObject: () => ({ vehicleType: "auto", baseFare: 50 }) });
    mock.save.mockResolvedValue({ updatedAt });
    mock.audit.mockResolvedValue({ id: "audit" });
    const response = await POST(request({ ...candidate, version: updatedAt.toISOString() }));
    expect((await response.json()).auditRecorded).toBe(true);
    expect(mock.save).toHaveBeenCalledWith({ _id: "fare", updatedAt }, { $set: { baseFare: 55 } }, expect.anything());
    expect(mock.audit).toHaveBeenCalledWith(expect.objectContaining({ reason: candidate.reason, beforeState: { baseFare: 50 }, afterState: { baseFare: 55 } }));
  });
  it("triages only active incidents and doesn't mutate booking or SOS data", async () => {
    mock.auth.mockResolvedValue(staff);
    mock.incident.mockReturnValue({ select: async () => ({ _id: "incident" }) });
    mock.audit.mockResolvedValue({ id: "audit" });
    expect((await triage(request({ incidentId: "INC-001", reason: "Assigned to duty team" }))).status).toEqual(200);
    expect(mock.incident).toHaveBeenCalledWith(
      { incidentId: "INC-001", status: "active" }, { $set: { status: "investigating" } }, expect.anything(),
    );
  });
});
