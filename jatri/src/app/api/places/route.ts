export const dynamic = "force-dynamic";

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { redisGet, redisIncr, redisSet } from "@/lib/redis";

type Point = { lat: number; lng: number };
type Place = Point & {
  place_id: string; description: string; title: string; subtitle: string; category: string;
  countrycode: string; country: string; locality: string; city: string; state: string; postalCode: string;
  distanceKm?: number;
};

const cache = new Map<string, { expires: number; value: Place[] }>();
const pending = new Map<string, Promise<Place[] | null>>();
const photonHeaders = { "User-Agent": "Jaatri/1.0 (+https://ridenow-vehicle-booking-site.vercel.app/contact)" };
const defaultBias = { lat: 26.1445, lng: 91.7362 };
const cacheTtl = 300;
let localUsage = { day: "", count: 0 };

function point(lat: unknown, lng: unknown): Point | null {
  if ((typeof lat !== "number" && typeof lat !== "string") ||
      (typeof lng !== "number" && typeof lng !== "string") || String(lat).trim() === "" || String(lng).trim() === "") return null;
  const p = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 ? p : null;
}

const str = (v: unknown) => typeof v === "string" ? v.trim() : "";
const join = (...v: string[]) => [...new Set(v.filter(Boolean))].join(", ");
function category(raw: string, title: string) {
  const value = `${raw} ${title}`.toLowerCase();
  if (/airport|aerodrome/.test(value)) return "airport";
  if (/station|railway|junction|metro|platform/.test(value)) return "train_station";
  if (/\bbus\b|isbt|transit/.test(value)) return "transit_station";
  if (/hospital|clinic|medical|health|pharmacy/.test(value)) return "hospital";
  if (/college|university|school|institute|campus/.test(value)) return "education";
  if (/mall|market|bazaar|plaza|supermarket/.test(value)) return "shopping";
  if (/hotel|resort|inn\b|lodge/.test(value)) return "hotel";
  if (/restaurant|cafe|food|dhaba/.test(value)) return "restaurant";
  if (/post office|bank|temple|mosque|church|mandir/.test(value)) return "landmark";
  return "place";
}
function parseResult(raw: unknown, provider: "geo" | "photon"): Place | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const properties = provider === "geo" ? row : row.properties;
  if (!properties || typeof properties !== "object") return null;
  const p = properties as Record<string, unknown>;
  const coords = (row.geometry as { coordinates?: unknown[] } | undefined)?.coordinates;
  const pos = provider === "geo" ? point(p.lat, p.lon) : point(coords?.[1], coords?.[0]);
  if (!pos) return null;
  const locality = str(p.suburb) || str(p.district) || str(p.locality) || str(p.neighbourhood);
  const city = str(p.city) || str(p.town) || str(p.village);
  const state = str(p.state);
  const countrycode = str(p.country_code ?? p.countrycode).toLowerCase();
  const country = str(p.country);
  const postalCode = str(p.postcode);
  const street = [str(p.housenumber), str(p.street)].filter(Boolean).join(" ");
  const title = str(p.name) || str(p.address_line1) || street || locality || city || state || country;
  if (!title) return null;
  const subtitle = str(p.address_line2) || join(...[street, locality, city, state, country].filter(x => x !== title));
  const description = (str(p.formatted) || join(title, street, locality, city, postalCode, state, country)).slice(0, 500);
  return {
    ...pos, title, subtitle, description, category: category(str(p.category ?? p.osm_value ?? p.result_type), title),
    place_id: `${provider}_${pos.lat}_${pos.lng}_${countrycode}_${encodeURIComponent(description)}`,
    countrycode, country, locality, city, state, postalCode,
  };
}
function geocodeResult(p: Place) {
  return {
    name: p.title, formatted_address: p.description, locality: p.locality, city: p.city, state: p.state,
    postalCode: p.postalCode, geometry: { location: { lat: p.lat, lng: p.lng } },
    address_components: [{ long_name: p.country || p.countrycode.toUpperCase(), short_name: p.countrycode, types: ["country"] }],
  };
}

async function permitGeoapify() {
  const day = new Date().toISOString().slice(0, 10);
  const count = await redisIncr(`places:geoapify:requests:${day}`, 172800);
  // Keep headroom under the free tier; fail closed across production replicas.
  if (count !== null) {
    if (count > 2400) return false;
    const burst = await redisIncr(`places:geoapify:second:${Math.floor(Date.now() / 1000)}`, 5);
    return burst !== null && burst <= 5;
  }
  if (process.env.NODE_ENV === "production") return false;
  if (localUsage.day !== day) localUsage = { day, count: 0 };
  return ++localUsage.count <= 2400;
}

async function fetchPlaces(provider: "geo" | "photon", key: string, type: "autocomplete" | "search" | "reverse", query: string, pos: Point | null, country: string): Promise<Place[] | null> {
  try {
    let url: URL;
    if (provider === "geo") {
      if (!await permitGeoapify()) return null;
      url = new URL(`https://api.geoapify.com/v1/geocode/${type}`);
      url.searchParams.set("apiKey", key);
      url.searchParams.set("format", "json");
    } else {
      url = new URL(type === "reverse" ? "https://photon.komoot.io/reverse" : "https://photon.komoot.io/api/");
    }
    url.searchParams.set("limit", type === "reverse" ? "1" : "10");
    if (type === "reverse" && pos) {
      url.searchParams.set("lat", String(pos.lat));
      url.searchParams.set("lon", String(pos.lng));
    } else {
      url.searchParams.set(provider === "geo" ? "text" : "q", query);
      if (country) url.searchParams.set(provider === "geo" ? "filter" : "countrycode", provider === "geo" ? `countrycode:${country}` : country);
      const bias = pos ?? (country === "in" ? defaultBias : null);
      if (bias && provider === "geo") url.searchParams.set("bias", `proximity:${bias.lng},${bias.lat}`);
      if (bias && provider === "photon") {
        url.searchParams.set("lat", String(bias.lat));
        url.searchParams.set("lon", String(bias.lng));
      }
    }
    const res = await fetch(url, { headers: provider === "photon" ? photonHeaders : undefined, signal: AbortSignal.timeout(3500), cache: "no-store", redirect: "error" });
    if (!res.ok) return null;
    const body = await res.json();
    const rows = provider === "geo" ? body?.results : body?.features;
    if (!Array.isArray(rows)) return null;
    const seen = new Set<string>();
    return rows.map(row => parseResult(row, provider)).filter((p): p is Place => {
      if (!p || (type !== "reverse" && country && p.countrycode !== country)) return false;
      const id = `${p.title.toLowerCase()}:${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`;
      if (seen.has(id)) return false;
      seen.add(id);
      if (type === "autocomplete" && pos) {
        const rad = Math.PI / 180;
        const a = Math.sin((p.lat - pos.lat) * rad / 2) ** 2 + Math.cos(pos.lat * rad) * Math.cos(p.lat * rad) * Math.sin((p.lng - pos.lng) * rad / 2) ** 2;
        p.distanceKm = +(12742 * Math.asin(Math.sqrt(Math.min(1, a)))).toFixed(1);
      }
      return true;
    }).slice(0, 10);
  } catch {
    return null; // Do not log the request URL (it contains the key and can contain a rider's address).
  }
}

async function cachedPlaces(key: string, load: () => Promise<Place[] | null>) {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) return item.value;
  const active = pending.get(key);
  if (active) return active;
  const work = (async () => {
    let value = await redisGet<Place[]>(key);
    if (!Array.isArray(value)) {
      value = await load();
      if (value) await redisSet(key, value, cacheTtl);
    }
    if (value) {
      if (cache.size >= 350) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + cacheTtl * 1000, value });
    }
    return value;
  })();
  pending.set(key, work);
  try { return await work; } finally { pending.delete(key); }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const rawId = q.get("placeId") || q.get("place_id") || "";
  const rawLat = q.get("lat"), rawLng = q.get("lng") ?? q.get("lon");
  const rawText = q.get("input") || q.get("query") || q.get("q") || q.get("address") || "";
  const query = rawText.trim().normalize("NFC").replace(/\s+/gu, " ");
  const action = q.get("action") ?? (rawId ? "details" : rawLat !== null && rawLng !== null && !rawText ? "geocode" : rawText ? "autocomplete" : "");
  const invalid = () => NextResponse.json({ status: "INVALID_REQUEST" }, { status: 400 });
  const pos = point(rawLat, rawLng);
  if (action === "details") {
    if (rawId.length > 6500) return invalid();
    const [source, lat, lng, country, ...description] = rawId.split("_");
    const location = point(lat, lng);
    if (!["geo", "nom", "photon"].includes(source) || !location || !/^(?:[a-z]{2})?$/i.test(country ?? "") || !description.length) return invalid();
    let address: string;
    try { address = decodeURIComponent(description.join("_")); } catch { return invalid(); }
    if (!address || address.length > 500) return invalid();
    return NextResponse.json({ status: "OK", result: { formatted_address: address, geometry: { location },
      address_components: [{ long_name: country.toUpperCase(), short_name: country.toLowerCase(), types: ["country"] }] } });
  }
  const type = action === "autocomplete" ? "autocomplete" : action === "reverse" ? "reverse" : action === "geocode" ? (query ? "search" : "reverse") : null;
  if (!type || query.length > 240 || (type === "reverse" && !pos) || ((rawLat !== null || rawLng !== null) && !pos)) return invalid();
  const rawCountry = (q.get("country") || "in").toLowerCase();
  if (rawCountry !== "null" && !/^[a-z]{2}$/.test(rawCountry)) return invalid();
  const country = rawCountry === "null" ? "" : rawCountry;
  if (type === "autocomplete" && query.length < 2) return NextResponse.json({ predictions: [], status: "OK" });
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim() || "";
  const provider = apiKey ? "geo" : "photon";
  const precision = type === "reverse" ? 5 : 2;
  // Use the same rounded location for provider lookup and caching; search bias does not require precise GPS.
  const coarse = pos && { lat: +pos.lat.toFixed(precision), lng: +pos.lng.toFixed(precision) };
  const scope = apiKey ? createHash("sha256").update(apiKey).digest("hex").slice(0, 16) : "photon";
  const hash = createHash("sha256").update(JSON.stringify([scope, type, query.toLowerCase(), country, coarse])).digest("hex");
  const result = await cachedPlaces(`places:v5:${hash}`, () => fetchPlaces(provider, apiKey, type, query, coarse, country));
  const field = type === "autocomplete" ? "predictions" : "results";
  const headers = { "Cache-Control": "private, no-store" };
  if (!result) return NextResponse.json({ [field]: [], status: "UNAVAILABLE" }, { status: 503, headers });
  return NextResponse.json({ [field]: type === "autocomplete" ? result : result.map(geocodeResult), status: "OK" }, { headers });
}
