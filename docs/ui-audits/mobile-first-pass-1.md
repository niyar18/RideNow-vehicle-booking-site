# RideNow / Jaatri — Mobile-First UI Audit (Pass 1)

**Scope:** Static source review of the public mobile homepage and shared mobile navigation.  
**Branch:** `ui/mobile-first-home-audit`  
**Status:** Initial code-level review; browser screenshots, device testing, typecheck, and production build are still required.  
**Design constraint:** Preserve the existing Jaatri warm-ivory / forest-green identity. This pass does not change the palette or redesign the page.

## Confirmed source-level findings

### UI-MOB-01 — Clickable non-button elements in the mobile homepage
- **Location:** `jatri/src/shared/components/MobileHome.tsx`, destination-search control, service cards, popular-destination tiles.
- **Observation:** Interactive actions were implemented using `div role="button"` with manual keyboard handlers.
- **Impact:** Native button semantics, keyboard activation behavior, and consistent interaction affordances require extra hand-written code and are easier to get wrong.
- **Change in this branch:** Replaced those controls with native `button` elements; added accessible labels for destination tiles and visible keyboard focus styles.
- **Priority:** High.
- **Verification:** Test activation with touch, Enter, and Space; verify focus ring remains visible and no nested interactive elements were introduced.

### UI-MOB-02 — Main destination search target should be comfortably tappable
- **Location:** Mobile homepage hero search control.
- **Observation:** The control's height depended on its internal content and padding instead of an explicit minimum target.
- **Change in this branch:** Added a 52px minimum height and a visible focus ring while preserving the existing visual styling.
- **Priority:** High.
- **Verification:** Measure rendered bounds at 360px, 390px, and 430px widths; check the label and arrow remain vertically aligned.

### UI-MOB-03 — Shortcut actions need predictable touch targets
- **Location:** Home, Work, Airport, and Add shortcut buttons under the hero search.
- **Change in this branch:** Added a 44px minimum height and keyboard focus styling to the shortcut buttons.
- **Priority:** High.
- **Verification:** Check spacing between targets on narrow phones, especially at 360px; confirm text does not clip or become difficult to read.

### UI-MOB-04 — Service cards should expose native button behavior
- **Location:** Mobile homepage service-card grid.
- **Change in this branch:** Converted service-card wrappers to native buttons with a minimum height and visible focus styling.
- **Priority:** High.
- **Verification:** Confirm the two-column grid remains balanced, text does not overflow, and touch navigation still reaches the intended routes.

### UI-MOB-05 — Popular destination tiles should be keyboard and touch accessible
- **Location:** Mobile homepage popular-destination carousel.
- **Change in this branch:** Converted destination tiles to native buttons, added accessible labels, and visible focus styling.
- **Priority:** Medium.
- **Verification:** Test horizontal scrolling and snapping on mobile; ensure focus outlines are not clipped and each destination routes correctly.

### UI-MOB-06 — Vehicle-category cards use custom keyboard interaction
- **Location:** `jatri/src/features/booking/components/VehicleCategoriesSlider.tsx`, each vehicle card in the horizontal fleet carousel.
- **Observation:** Cards were focusable `motion.div` elements with `role="button"` and hand-written Enter/Space handling.
- **Impact:** Native button behavior is more predictable for keyboard and assistive-technology users; it also reduces custom interaction code.
- **Change in this branch:** Converted each card to `motion.button`, retained the existing card design and click route, updated the accessible label, and strengthened the focus ring.
- **Priority:** High.
- **Verification:** Confirm carousel horizontal scrolling still works, cards route to the correct vehicle selection, focus indicators are visible, and the button does not introduce default browser styling.

### UI-MOB-07 — Driver-partner heading forced onto one line on phones
- **Location:** `jatri/src/shared/components/DriveWithJaatri.tsx`, driver-partner CTA heading.
- **Observation:** The heading applied `whitespace-nowrap` below the small-screen breakpoint, which can force long localized or brand text beyond a narrow viewport.
- **Change in this branch:** Allowed natural wrapping while preserving the existing typography and larger-screen styling.
- **Priority:** High for narrow screens.
- **Verification:** Check 320px, 360px, 390px, and 430px viewports and longer translations; confirm no horizontal overflow or awkward word collisions.

### UI-MOB-08 — Secondary driver-partner CTA has a small touch area
- **Location:** `DriveWithJaatri.tsx`, “Learn more” link.
- **Observation:** The link's inline text was the main clickable area and had no explicit minimum height.
- **Change in this branch:** Added a 44px minimum height, horizontal padding, and visible keyboard focus styling.
- **Priority:** Medium.
- **Verification:** Confirm it aligns with the primary CTA and doesn't create unwanted wrapping at narrow widths.

## Design observations to validate in a real browser

These are hypotheses, not confirmed visual defects, because this pass did not render the site at device sizes.

1. **Hero vertical space:** The hero uses a 480px minimum height on small screens plus generous top padding. Check whether users see the destination search and shortcuts early enough without excessive scrolling.
2. **Hero text contrast:** Verify the greeting and tagline against both landscape assets and their overlays in bright daylight and dark mode.
3. **Service-card density:** The two-column cards use compact 11–14px text. Check legibility at 360px and at 200% text zoom.
4. **Destination carousel discoverability:** Ensure a partial next card or another clear cue indicates horizontal scrolling.
5. **Bottom navigation collision:** Check the global mobile bottom navigation against page padding, browser safe areas, and the last content section on iOS Safari and Android Chrome.
6. **Color consistency:** Some page containers use `#061A16` while the documented dark theme uses `#101713`. Review for visible surface mismatches before changing any colors.
7. **Global text selection:** `globals.css` disables text selection for `html, body`. Check whether this unnecessarily prevents users from selecting addresses, fare amounts, or other useful text outside form fields.
8. **Touch target audit beyond homepage:** Review icon-only controls, map zoom/location controls, modals, and the bottom navigation across booking, ride tracking, checkout, profile, and partner flows.

## Booking screen — preliminary source-level review

The booking screen is the next highest-priority mobile surface. These are source-level observations only; the page has not been rendered or tested at phone sizes.

### UI-BOOK-01 — Core pickup field and booking CTA have reasonable minimum heights
- **Location:** `jatri/src/app/book/page.tsx`, pickup row and pinned card footer.
- **Observation:** Pickup row is defined with `min-h-[46px]`; the primary confirm action uses `min-h-[48px]`.
- **Assessment:** Keep these dimensions for now. They are a reasonable baseline and should not be enlarged blindly without checking the map/form balance on small screens.
- **Priority:** Positive finding / preserve unless device testing shows a problem.

### UI-BOOK-02 — Waypoint reorder controls are very small
- **Location:** `book/page.tsx`, pickup row reorder control.
- **Observation:** The icon button uses `w-4 h-5` (16×20px) for its visual box, substantially smaller than the nearby 46px input row.
- **Impact:** It may be difficult to tap accurately on a phone; the control also needs a descriptive accessible name beyond its tooltip.
- **Recommendation:** Redesign the reorder affordance to provide a larger touch area without compressing the pickup input. Verify the same control for destination and intermediate waypoints before applying a consistent change.
- **Priority:** Medium; requires layout testing before implementation.

### UI-BOOK-03 — Location-error dismiss control has a small touch target
- **Location:** `book/page.tsx`, dismiss button in the location-permission guidance panel.
- **Observation:** The button uses `p-1` around a 14px icon, resulting in a small target.
- **Recommendation:** Give the icon button a larger minimum touch area and visible focus style; check it doesn't overlap nearby actions at 320–360px widths.
- **Priority:** Medium; implement alongside the location panel's responsive review.

### Booking screen design decisions to validate
1. Verify the pinned confirm footer remains visible above mobile browser safe areas and does not cover the last scrollable form option.
2. Test the keyboard-open state while editing pickup/drop locations; ensure suggestions and the confirm footer do not compete for the same viewport space.
3. Check vehicle choices, gender/driver preference, student discount, schedule booking, and payment options at 360px width and 200% text zoom.
4. Ensure map controls remain reachable and do not overlap form sheets or the primary CTA.
5. Confirm the selected vehicle, fare estimate, and final action remain understandable without relying on color alone.

## Next review passes

1. Capture browser screenshots at 360×800, 390×844, 430×932, and a desktop viewport; test light and dark modes.
2. Review the booking flow: pickup/drop selection, map, vehicle choices, fare summary, and the fixed booking CTA.
3. Review in-ride tracking and safety controls, followed by checkout/payment and profile.
4. Audit contrast, typography, tap-target dimensions, keyboard/focus states, safe-area insets, and horizontal overflow.
5. Run:
   - `npm --prefix jatri run typecheck`
   - `npm --prefix jatri run test`
   - `npm --prefix jatri run build`
6. Do not merge until browser-level checks and build verification pass.

## Non-goals for this pass

- No backend/API/business logic changes.
- No palette replacement or arbitrary restyling.
- No wholesale redesign of the existing UI.
- No claim that build or device testing passed; those checks have not run in this review environment.
