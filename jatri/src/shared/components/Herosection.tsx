"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, CalendarDays, Car, Crosshair, LoaderCircle, MapPin, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import { useTranslation } from "@/context/LanguageContext";
import styles from "./landing.module.css";

type Field = "pickup" | "drop";
type Point = { lat: number; lng: number };
type Place = Partial<Point> & { title?: string; subtitle?: string; name?: string; description?: string; place_id?: string };
type Stop = { text: string; point?: Point };
const fields: Field[] = ["pickup", "drop"];
const empty: Record<Field, Stop> = { pickup: { text: "" }, drop: { text: "" } };
const placeTitle = (place: Place) => place.title || place.name || place.description || "";
const pointOf = (place: Partial<Point> | undefined) =>
  typeof place?.lat === "number" && typeof place.lng === "number" ? { lat: place.lat, lng: place.lng } : undefined;

export default function LandingBooking() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const userData = useSelector((state: RootState) => state.user.userData);
  const [mode, setMode] = useState<"ride" | "cargo">("ride");
  const [stops, setStops] = useState(empty);
  const [reserve, setReserve] = useState(false);
  const [active, setActive] = useState<Field | null>(null);
  const [items, setItems] = useState<Place[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState("");
  const selection = useRef({ pickup: 0, drop: 0 });
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  const query = active ? stops[active].text.trim() : "";

  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!form.current?.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);

  useEffect(() => {
    if (!active || query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/places?action=autocomplete&input=${encodeURIComponent(query)}&country=in`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!controller.signal.aborted) {
          setItems(response.ok && Array.isArray(data.predictions) ? data.predictions.filter((p: Place) => placeTitle(p)) : []);
        }
      } catch {
        if (!controller.signal.aborted) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 240);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [active, query]);

  function activate(field: Field | null) {
    setItems([]);
    setHighlight(-1);
    setLoading(false);
    setActive(field);
  }

  function setStop(field: Field, stop: Stop) {
    setStops((previous) => ({ ...previous, [field]: stop }));
  }

  async function choose(place: Place, field: Field) {
    const version = ++selection.current[field];
    const text = [placeTitle(place), place.subtitle].filter(Boolean).join(", ");
    const point = pointOf(place);
    setStop(field, { text, point });
    activate(null);
    if (point || !place.place_id) return;
    try {
      const response = await fetch(`/api/places?action=details&placeId=${encodeURIComponent(place.place_id)}`);
      const data = await response.json();
      if (version === selection.current[field] && response.ok) {
        const point = pointOf(data.result?.geometry?.location);
        if (point) setStop(field, { text, point });
      }
    } catch {
      // Keep the selected name so the next step can resolve it.
    }
  }

  function keyboard(event: KeyboardEvent<HTMLInputElement>, field: Field) {
    if (event.key === "Escape" || event.key === "Tab") {
      activate(null);
      return;
    }
    if (active !== field || !items.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((i) => event.key === "ArrowDown" ? (i + 1) % items.length : (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === "Enter" && highlight >= 0) {
      event.preventDefault();
      void choose(items[highlight], field);
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setStatus(t("landing.locationUnavailable", "Current location is unavailable. Enter a pickup point instead."));
      return;
    }
    const version = ++selection.current.pickup;
    activate(null);
    setLocating(true);
    setStatus("");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const point = { lat: coords.latitude, lng: coords.longitude };
      const fallback = t("landing.currentLocation", "Current location");
      if (version === selection.current.pickup) setStop("pickup", { text: fallback, point });
      try {
        const response = await fetch(`/api/places?lat=${point.lat}&lng=${point.lng}`);
        if (response.ok) {
          const data = await response.json();
          if (version === selection.current.pickup) setStop("pickup", { text: data.address || fallback, point });
        }
      } catch {
        // The browser coordinates remain usable without the address label.
      } finally {
        setLocating(false);
      }
    }, () => {
      setLocating(false);
      setStatus(t("landing.locationUnavailable", "Current location is unavailable. Enter a pickup point instead."));
    }, { timeout: 8000 });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userData && !session?.user) {
      window.dispatchEvent(new Event("open-auth-modal"));
      return;
    }
    const category = mode === "cargo" ? "trucks" : "cars";
    const params = new URLSearchParams({ category });
    const draft: Record<string, string | number | boolean> = {
      category, vehicle: mode === "cargo" ? "trucks" : "car", isScheduled: reserve,
    };
    if (mode === "cargo") params.set("serviceMode", "logistics");
    if (reserve) params.set("reserve", "true");
    for (const field of fields) {
      const { text, point } = stops[field];
      if (text.trim()) { params.set(field, text.trim()); draft[field] = text.trim(); }
      if (point) {
        params.set(`${field}Lat`, String(point.lat)); draft[`${field}Lat`] = point.lat;
        params.set(`${field}Lng`, String(point.lng)); draft[`${field}Lng`] = point.lng;
      }
    }
    for (const storage of ["sessionStorage", "localStorage"] as const) {
      try { window[storage].setItem("ridenow_booking_draft", JSON.stringify(draft)); } catch {}
    }
    router.push(`/book?${params.toString()}`);
  }

  return (
    <form ref={form} className={styles.booking} onSubmit={submit} aria-label={t("landing.plan", "Plan your journey")}>
      <div className={styles.bookingModes} role="group" aria-label={t("landing.serviceType", "Service type")}>
        <button type="button" aria-pressed={mode === "ride"} onClick={() => setMode("ride")}><Car size={18} aria-hidden />{t("landing.ride", "Ride")}</button>
        <button type="button" aria-pressed={mode === "cargo"} onClick={() => setMode("cargo")}><Package size={17} aria-hidden />{t("landing.cargo", "Cargo")}</button>
      </div>
      <div className={styles.bookingFields}>
        {fields.map((field) => {
          const visible = active === field && items.length > 0;
          return (
            <div className={styles.field} key={field}>
              <label htmlFor={`${id}-${field}`}>
                {field === "pickup" ? t("landing.pickup", "Pickup") : t("landing.destination", "Destination")}
              </label>
              {field === "pickup" ? <span className={styles.originIcon} aria-hidden /> : <MapPin className={styles.fieldIcon} size={17} aria-hidden />}
              <input id={`${id}-${field}`} value={stops[field].text} autoComplete="off" role="combobox"
                aria-autocomplete="list" aria-expanded={visible}
                aria-controls={visible ? `${id}-${field}-results` : undefined}
                aria-activedescendant={visible && highlight >= 0 ? `${id}-${field}-option-${highlight}` : undefined}
                placeholder={field === "pickup" ? t("landing.pickupPlaceholder", "Enter pickup point") : t("landing.dropPlaceholder", "Where to?")}
                onFocus={() => { if (active !== field) activate(field); }}
                onChange={(e) => { ++selection.current[field]; setStop(field, { text: e.target.value }); activate(field); }}
                onKeyDown={(e) => keyboard(e, field)} />
              {field === "pickup" && (
                <button type="button" className={styles.locate} onClick={locate} disabled={locating}
                  aria-label={t("landing.locate", "Use current location")} title={t("landing.locate", "Use current location")}>
                  {locating ? <LoaderCircle className="animate-spin" size={17} aria-hidden /> : <Crosshair size={18} aria-hidden />}
                </button>
              )}
              {active === field && loading && !visible && <p className={styles.fieldStatus} role="status">{t("landing.searching", "Looking up places…")}</p>}
              {visible && (
                <ul className={styles.suggestions} role="listbox" id={`${id}-${field}-results`}>
                  {items.map((item, index) => (
                    <li role="option" aria-selected={highlight === index} id={`${id}-${field}-option-${index}`}
                      key={item.place_id || `${placeTitle(item)}-${index}`}
                      onPointerDown={(event) => event.preventDefault()} onClick={() => void choose(item, field)}>
                      <MapPin size={16} aria-hidden /><span><strong>{placeTitle(item)}</strong>{item.subtitle && <small>{item.subtitle}</small>}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {status && <p className={styles.bookingStatus} role="status">{status}</p>}
      <div className={styles.bookingActions}>
        <button type="submit" className={styles.primaryButton}>
          {mode === "cargo" ? t("landing.findCargo", "Find a vehicle") : t("landing.findRide", "Find a ride")} <ArrowRight size={19} aria-hidden />
        </button>
        <button type="button" className={styles.reserveButton} aria-pressed={reserve} onClick={() => setReserve((value) => !value)}>
          <CalendarDays size={17} aria-hidden /> {t("landing.reserve", "Schedule")}
        </button>
      </div>
    </form>
  );
}
