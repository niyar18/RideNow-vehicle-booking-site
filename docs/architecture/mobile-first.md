# Mobile-First Architecture & Design Principles

> **Status**: Permanent Project Requirement  
> **Brand**: Jaatri (যাত্ৰী) / RideNow  
> **Target Audience**: Mobile web riders, auto/cab/bike drivers in Assam & North-East India.

---

## 1. Core Philosophy

Jaatri is a mobile transportation and mobility web application first. 90%+ of all rides, driver dispatches, location tracking, and payment flows occur on physical handheld devices, often over constrained cellular networks (2G/3G/4G) and under diverse ambient lighting conditions.

Desktop responsiveness is a progressive enhancement of a robust, touch-optimized mobile foundation—never the reverse.

---

## 2. Ergonomics & Touch Geometry

### 2.1 The Mobile Thumb Zone
- **Primary CTAs**: Anchored in the bottom 40% of the screen (bottom floating sheets or fixed bars with safe-area padding).
- **Secondary Actions**: Easily reachable without awkward stretching.
- **Minimum Tap Size**: All buttons, pills, and tap zones must have an effective touch surface of at least `44 × 44px` (using `min-h-[44px] min-w-[44px]` or padding expansion).

### 2.2 Viewport Bounds & Safe Areas
- Dynamic mobile viewports must use `min-h-[100dvh]` or `h-[100dvh]` so that browser navigation bars (Safari toolbar, Chrome bottom bar) do not jump or truncate bottom sheets.
- Always include safe-area insets: `pb-[calc(1rem+env(safe-area-inset-bottom))]`.

---

## 3. Performance & Flaky Network Resilience

- **Asset Weight**: All icons use inline lightweight Lucide SVGs or specialized vehicle SVGs. No heavy icon packs.
- **Code Splitting**: Dynamic imports (`next/dynamic`) for heavy libraries like MapLibre GL (`RouteMap.tsx`) and ZegoCloud video calls (`video-kyc`).
- **Telemetry Reconnect**: Real-time Socket.IO connection in `useSocket.ts` and partner shift monitors automatically reconnect with exponential backoff on network dropouts.

---

## 4. Accessibility & Inclusive Mobility

- Target: **WCAG 2.2 AA Compliance**.
- Contrast: Verified high contrast on both Warm Ivory light mode (`#FAF7F0`) and Forest Night dark mode (`#17211B`).
- Screen Readers: Descriptive `aria-label` tags for all icon-only buttons, route milestones, and live status banners (`role="status"`).
- Keyboard Navigation: Every touch interaction is also navigable via tab index and visible focus rings.

### Booking vehicle chooser

The booking panel shows the route, passenger/cargo switch, and a single native radio group for vehicle type. Every choice combines an illustration from `VEHICLE_ART_SRC`, estimated fare, pickup timing, and capacity or payload. The chosen row uses a checkmark and border as well as its checked state; out-of-range vehicles remain visible but cannot be chosen. The route summary, sheet controls, and vehicle-dependent action sit outside the scroll region on mobile, so they do not cover keyboard focus. Drivers' uploaded photos still take precedence on search results; generated cutouts are illustrative fallbacks, not images of the reserved vehicle.
