"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getVersion, setWorkerUrl, type Map, type PaddingOptions } from "maplibre-gl";
import { Crosshair, MapPinOff, Minus, Plus } from "lucide-react";
import styles from "./map-chrome.module.css";

export const mapFrame = styles.frame;

export function prepareMapRuntime() {
  setWorkerUrl(`/map-runtime/${getVersion()}/maplibre-gl-worker.mjs`);
}

export function observeMapSize(map: Map, element: HTMLElement) {
  const observer = new ResizeObserver(() => {
    if (element.clientWidth && element.clientHeight) map.resize();
  });
  observer.observe(element);
  return () => observer.disconnect();
}

export function fitMapPadding(map: Map, requestedBottom = 28): PaddingOptions {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const horizontal = Math.max(0, Math.min(52, width * 0.13));
  return {
    top: Math.max(0, Math.min(69, height * 0.27)),
    bottom: Math.max(0, Math.min(requestedBottom, height * 0.48)),
    left: horizontal,
    right: horizontal,
  };
}

export function labelMap(map: Map, label: string) {
  const canvas = map.getCanvas();
  canvas.setAttribute("aria-label", label + ". Use the arrow keys to move the map and plus or minus to zoom.");
}

export function MapAttribution({ bottom = 0, top = false }: { bottom?: number; top?: boolean }) {
  return (
    <a
      className={`${styles.attribution} ${top ? styles.overlayAttribution : ""}`}
      style={{ "--map-obstruction": `${bottom}px` } as CSSProperties}
      href="https://www.openstreetmap.org/copyright"
      target="_blank"
      rel="noopener noreferrer"
    >
      © OpenStreetMap contributors
    </a>
  );
}

export function MapUnavailable() {
  return (
    <div role="status" className={styles.unavailable}>
      <MapPinOff aria-hidden="true" size={23} />
      <span>Map preview unavailable. The trip details are still available.</span>
    </div>
  );
}

export function MapControls({ map, onRecenter, recenterLabel, bottom = 0, top = false }: {
  map: Map | null;
  onRecenter?: () => void;
  recenterLabel: string;
  bottom?: number;
  top?: boolean;
}) {
  const [limits, setLimits] = useState({ in: false, out: false });

  useEffect(() => {
    if (!map) return;
    const syncLimits = () => setLimits({
      in: map.getZoom() >= map.getMaxZoom(),
      out: map.getZoom() <= map.getMinZoom(),
    });
    syncLimits();
    map.on("zoomend", syncLimits);
    return () => { map.off("zoomend", syncLimits); };
  }, [map]);

  const zoomDuration = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 230;

  return (
    <div
      role="group"
      aria-label="Map controls"
      className={`${styles.controls} ${top ? styles.topControls : ""}`}
      style={{ "--map-obstruction": `${bottom}px` } as CSSProperties}
    >
      {onRecenter && (
        <button type="button" className={styles.button} aria-label={recenterLabel} onClick={onRecenter}>
          <Crosshair size={18} aria-hidden="true" />
        </button>
      )}
      <div className={styles.zoom}>
        <button type="button" className={styles.button} aria-label="Zoom in" disabled={!map || limits.in} onClick={() => map?.zoomIn({ duration: zoomDuration() })}>
          <Plus size={18} aria-hidden="true" />
        </button>
        <button type="button" className={styles.button} aria-label="Zoom out" disabled={!map || limits.out} onClick={() => map?.zoomOut({ duration: zoomDuration() })}>
          <Minus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const vehicleIcons = {
  bike: '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="m5 17 5-8h5l4 8m-7-8V6h4"/>',
  auto: '<path d="M5 16V9l4-4h6l4 4v7M3 16h18M8 12h8M9 5l-1 7m7-7 1 7"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/>',
  truck: '<path d="M2 6h13v11H2zm13 5h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  car: '<path d="m4 12 2-5h12l2 5M4 12h16a1 1 0 0 1 1 1v4H3v-4a1 1 0 0 1 1-1zm2 5v2m12-2v2M7 14h1m8 0h1"/>',
};

export function vehicleSymbol(type = "car") {
  const t = type.toLowerCase().replace(/[_ -]/g, "");
  const shape = ["bike", "scooty"].includes(t) ? "bike"
    : ["auto", "erickshaw", "rickshaw"].includes(t) ? "auto"
      : ["truck", "loading", "pickuptruck", "cargo"].includes(t) ? "truck" : "car";
  const el = document.createElement("span");
  el.className = styles.vehicle;
  el.dataset.vehicle = shape;
  // Only our static SVG shapes, never dynamic labels or provider-supplied markup.
  el.innerHTML = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${vehicleIcons[shape]}</svg>`;
  return el;
}

export function makeVehicleMarker(type: string | undefined, label: string, variant: "nearby" | "driver") {
  const container = document.createElement("div");
  container.className = `${styles.vehicleMarker} ${variant === "nearby" ? styles.nearby : ""}`;
  container.title = label;
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", label);
  const vehicleEl = vehicleSymbol(type);
  container.append(vehicleEl);
  return { container, vehicleEl };
}

export function makeLocationMarker(kind: "pickup" | "drop" | "stop", location?: string, onClick?: () => void) {
  const el = onClick ? document.createElement("button") : document.createElement("div");
  const name = kind === "pickup" ? "Pickup" : kind === "drop" ? "Drop-off" : location ?? "Stop";
  const address = kind === "stop" ? "" : (location || "").split(",")[0].trim();
  el.className = styles.locationMarker;
  el.dataset.marker = kind;
  if (el instanceof HTMLButtonElement && onClick) {
    el.type = "button";
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Adjust ${name.toLowerCase()} location${address ? `: ${address}` : ""}`);
    el.onclick = (event) => { event.stopPropagation(); onClick(); };
  } else {
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", address ? `${name}: ${address}` : name);
  }
  const badge = document.createElement("span");
  badge.className = styles.markerBadge;
  const symbol = document.createElement("span");
  symbol.className = styles.markerSymbol;
  symbol.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = styles.markerText;
  label.textContent = address || name;
  badge.append(symbol, label);
  const anchor = document.createElement("span");
  anchor.className = styles.markerAnchor;
  anchor.setAttribute("aria-hidden", "true");
  el.append(badge, anchor);
  return el;
}

export function refreshLocationMarker(marker: HTMLElement, next: HTMLElement) {
  marker.replaceChildren(...next.childNodes);
  marker.onclick = next.onclick;
  marker.setAttribute("aria-label", next.getAttribute("aria-label") || "");
}

export function gpsMarker() {
  const el = document.createElement("div");
  el.className = styles.gps;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Your location");
  return el;
}

export function applyMapPalette(map: Map, layers: readonly [string, string][]) {
  const root = document.documentElement;
  const apply = () => {
    const dark = root.classList.contains("dark");
    const raster = "osm-streets-layer";
    if (map.getLayer(raster)) {
      map.setPaintProperty(raster, "raster-brightness-min", dark ? 0.025 : 0.06);
      map.setPaintProperty(raster, "raster-brightness-max", dark ? 0.69 : 0.99);
    }
    for (const [id, kind] of layers) {
      if (!map.getLayer(id)) continue;
      const color = kind === "outline" ? (dark ? "#142238" : "#f3f8f6")
        : kind === "approach" ? (dark ? "#d4e3ec" : "#42627a")
          : (dark ? "#91f2ce" : "#142238");
      map.setPaintProperty(id, "line-color", color);
    }
  };
  map.on("load", apply);
  const observer = new MutationObserver(apply);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  return () => { observer.disconnect(); map.off("load", apply); };
}
