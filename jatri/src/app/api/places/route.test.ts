import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({
  redisGet: vi.fn().mockResolvedValue(null),
  redisSet: vi.fn().mockResolvedValue(true),
  redisIncr: vi.fn().mockResolvedValue(1),
}));

import { redisIncr } from "@/lib/redis";
import { GET } from "./route";

const fetchMock = vi.fn();
const request = (params: Record<string, string>) => GET(new NextRequest("http://test/api/places?" + new URLSearchParams(params)));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GEOAPIFY_API_KEY", "test-server-only-key");
  vi.mocked(redisIncr).mockResolvedValue(1);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("returns Assam predictions, forwards country and coarse bias, caches privately and decodes details without a second call", async () => {
  const valid = {
    name: "Guwahati Rail & Metro", formatted: "Guwahati Rail & Metro, 100% Assam", address_line2: "Paltan Bazaar, Assam",
    country_code: "in", country: "India", lat: 26.18, lon: 91.75, state: "Assam", postcode: "781001", city: "Guwahati",
  };
  fetchMock.mockResolvedValue(Response.json({ results: [valid, valid, { ...valid, lon: 800 }, { ...valid, country_code: "bd" }] }));
  const params = { input: "Guwahati ৰেল", country: "IN", lat: "26.1445", lng: "91.7362" };
  const [r, parallel] = await Promise.all([request(params), request(params)]);
  expect(r.headers.get("cache-control")).toBe("private, no-store");
  const data = await r.json();
  expect(data).toEqual(await parallel.json());
  expect(data.predictions).toHaveLength(1);
  expect(data.predictions[0]).toMatchObject({ title: valid.name, postalCode: "781001", lat: 26.18, lng: 91.75 });
  expect(JSON.stringify(data)).not.toContain("test-server-only-key");
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.origin + url.pathname).toBe("https://api.geoapify.com/v1/geocode/autocomplete");
  expect(url.searchParams.get("filter")).toBe("countrycode:in");
  expect(url.searchParams.get("bias")).toBe("proximity:91.74,26.14");
  const details = await (await request({ action: "details", placeId: data.predictions[0].place_id })).json();
  expect(details.result.formatted_address).toBe(valid.formatted);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("uses Geoapify reverse, returns display and geometry fields, and retains legacy encoded places", async () => {
  fetchMock.mockResolvedValue(Response.json({ results: [{ address_line1: "Paltan Bazaar", formatted: "Paltan Bazaar, Assam", country_code: "in", lat: 26.18, lon: 91.75 }] }));
  const r = await request({ action: "reverse", lat: "26.180013", lng: "91.750017" });
  expect((await r.json()).results[0]).toMatchObject({ formatted_address: "Paltan Bazaar, Assam", geometry: { location: { lat: 26.18, lng: 91.75 } } });
  expect(fetchMock.mock.calls[0][0].pathname).toBe("/v1/geocode/reverse");
  const old = await request({ placeId: "nom_26.18_91.75_in_Paltan%20Bazaar" });
  expect((await old.json()).result.formatted_address).toBe("Paltan Bazaar");
});

it("uses Photon only when no Geoapify key is configured", async () => {
  vi.stubEnv("GEOAPIFY_API_KEY", "");
  fetchMock.mockResolvedValue(Response.json({ features: [{ properties: { name: "Tezpur", countrycode: "IN" }, geometry: { coordinates: [92.78, 26.63] } }] }));
  expect((await (await request({ input: "Tezpur" })).json()).predictions[0].title).toBe("Tezpur");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0].hostname).toBe("photon.komoot.io");
});

it("returns 503 on provider rejection, recovers on retry and never spills to public Nominatim or Photon", async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 })).mockResolvedValueOnce(Response.json({ results: [] }));
  const params = { input: "Rangia" };
  expect((await request(params)).status).toBe(503);
  expect((await request(params)).status).toBe(200);
  expect(fetchMock.mock.calls.map(x => x[0].hostname)).toEqual(["api.geoapify.com", "api.geoapify.com"]);
});

it("protects the daily budget and rejects malformed client input without calling the provider", async () => {
  vi.mocked(redisIncr).mockResolvedValue(2401);
  expect((await request({ input: "Nalbari" })).status).toBe(503);
  expect((await request({ action: "reverse", lat: "91", lng: "5" })).status).toBe(400);
  expect((await request({ placeId: "geo_26.18_91.75_in_%XX" })).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

it("fails closed if the shared budget is unavailable in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.mocked(redisIncr).mockResolvedValue(null);
  expect((await request({ input: "Silchar" })).status).toBe(503);
  expect(fetchMock).not.toHaveBeenCalled();
});
