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
- **Location:** `book/page.tsx`, pickup and destination row reorder controls.
- **Observation:** Both icon buttons previously used `w-4 h-5` (16×20px), substantially smaller than the nearby 46px input row.
- **Change in this branch:** Expanded the pickup and destination reorder controls to 44×44px minimum targets, added explicit accessible names, and added visible keyboard focus rings. The existing reorder handlers and visual icons are unchanged.
- **Risk to verify:** The wider controls consume additional horizontal space in the route rows; test at 320px and 360px to ensure pickup/drop text inputs remain usable and no horizontal overflow is introduced.
- **Priority:** Medium.

### UI-BOOK-03 — Location-error actions have small touch targets and tiny labels
- **Location:** `book/page.tsx`, location-permission guidance panel.
- **Observation:** The dismiss icon used `p-1` around a 14px icon; the permission retry, settings guide, and map-selection actions used compact vertical padding and 10px labels.
- **Change in this branch:** The dismiss action now has a 44×44px minimum target, an accessible name, and a visible focus ring. The three panel actions now have 44px minimum heights, slightly larger labels, and keyboard focus styling.
- **Risk to verify:** The larger actions may wrap onto more lines on narrow phones; check 320px and 360px widths, including when the permission message is long.
- **Priority:** Medium.

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


## Follow-up pass — booking route controls

- **Pickup/destination clear buttons:** increased to 40×40px minimum, added explicit accessible names, and added keyboard focus rings. A 40px target is a compromise in these dense rows to preserve useful input width; revisit if the row can be redesigned without compressing address entry.
- **Add stop / swap route:** raised to a 44px minimum height, increased label size slightly, and added visible keyboard focus styling.
- **Intermediate stops:** redesigned the reorder controls as horizontal 44×44px buttons, enlarged the remove action, added accessible labels and keyboard focus, and aligned the row/autocomplete colors with the Jaatri light/dark theme. This is more accessible but takes horizontal space; specifically test the stop address field at 320px and 360px.
- **Responsive validation status:** source-level review only. The preview URL could not be rendered by the available browser inspection, and no GitHub Actions workflow run was available for the current commit. No claim is made that the page has been visually validated or that typecheck/tests/build pass.


## Follow-up pass — vehicle selection and fare summary

- **Vehicle list semantics:** added a labelled vehicle-choice group, button semantics and announced pressed/route-availability state for selectable rows, visible keyboard focus, Enter/Space activation, and arrow-key navigation among available options. Unavailable rows are exposed as groups so their nested “Use Intercity” button is not incorrectly nested inside an ARIA radio/button control.
- **Fare summary disclosure:** added `aria-expanded`, a 44px minimum header target, and a visible focus ring to the Fare Breakdown accordion.
- **Narrow fare summary:** payment-method details now stack on narrow layouts and return to a horizontal row at the small-screen breakpoint, reducing the chance of crowding/overflow.
- **Still required:** verify screen-reader announcements, arrow-key selection, nested Intercity action, selected/disabled visual states, and fare text at 320px/360px. These changes have not yet been typechecked or run in a browser.


## Follow-up pass — in-ride safety and tracking

- **Share Trip action:** added an explicit accessible name, native button type, a 44px minimum height, and visible keyboard focus.
- **Emergency phone actions:** raised the in-ride `Call 112` and secondary emergency call targets to at least 44px and added focus styles.
- **Route-deviation alert:** stacks its copy and action buttons on narrow screens; “I am Safe” and SOS actions now have 44px minimum heights, larger labels, accessible names, and focus indicators.
- **Active-ride banner:** the floating banner now accounts for the device bottom safe area, and its primary resume/track action has a 44px minimum target and focus styling.
- **Tracking-link fallback fix:** removed the client fallback from `booking.shareToken` to `booking._id`, because the public tracking API looks up the dedicated `shareToken` field. If the token is missing, the UI now explains that a secure link is unavailable instead of generating a broken ID-based URL. Clipboard failure falls back to a manual copy prompt. The token authorization/lifecycle contract still needs a separate security review.
- **Still required:** verify actual small-screen alert stacking, bottom navigation overlap, Share API and clipboard fallback, and real emergency flows. No safety flow has been triggered or tested by these source edits.


## Follow-up pass — checkout, payment, driver preference, and profile

- **Checkout header:** stacks vertically below the small-screen breakpoint so “Review & Confirm Ride” and the Home/Edit Route actions have room to wrap rather than compete on one line.
- **Checkout actions:** the back-to-map control, Home/Edit Route links, Choose on Map, cancellation, and retry actions now have larger minimum target sizes and visible focus styles.
- **Payment method cards:** exposed selected state with `aria-pressed`, added keyboard focus indicators, and improved the wallet toggle's touch area and accessible name.
- **Driver preference:** Any available driver / Woman driver choices now expose selected state and visible keyboard focus; the existing availability behavior is unchanged.
- **Profile/account controls:** improved touch targets and focus states for Settings, family-member management, modal close controls, and add/cancel actions; icon-only actions now have accessible labels.
- **Still required:** review payment and profile flows with actual screen widths, verify focus order and wallet-toggle behavior, and run typecheck/tests/build. No payment or booking transaction was initiated during this review.


## Follow-up pass — global text selection and mobile navigation

- **Text selection:** removed the global `user-select: none` rule from `html, body`. Users should be able to select/copy trip addresses, fare details, and other page text; components that truly need non-selection can continue to use a local `select-none` utility.
- **Driver bottom navigation:** added visible keyboard focus rings to partner navigation links and the central active-ride action. Existing safe-area padding and spacer were already present and have been preserved.
- **Current audit decision:** no broad palette or typography changes were made without rendered visual evidence. Color consistency, contrast, and 200% zoom remain browser/device validation tasks rather than assumptions based on class names.

- **Intermediate-stop implementation completed:** `WaypointsManager.tsx` now uses a horizontal reorder group with 44×44px controls, a 44×44px remove action, a labelled address input, 44px autocomplete options, and theme-aware surfaces/text. Browser width validation is still pending.

- **Floating ride banner overlap:** adjusted the mobile banner bottom offset to sit above the fixed bottom navigation plus safe-area inset; desktop returns to the existing 20px bottom offset. Confirm at a real device size with the dock visible.

- **Share-link contract checked:** booking creation generates a dedicated random `shareToken`, and the public tracking endpoint queries that field. The UI now refuses to fabricate a tracking URL from the booking ID when the token is absent; verify legacy bookings and link expiry in integration tests.


## Final static review follow-up

- **Payment selector JSX correction:** final source inspection found a duplicated `type="button"` attribute on the full-wallet payment option, which would fail JSX/TypeScript compilation. Removed the duplicate and added visible keyboard focus styles to Cash and Online payment options; removed an unused icon import from the same component.
- **Validation boundary:** this is a source-level correction only. The current Vercel deployment status is still pending and no GitHub Actions workflow run is available for the branch head. Typecheck, tests, build, and responsive browser validation remain outstanding; keep PR #11 in draft until those pass.


## Follow-up pass — public live-tracking contract

- **Blocking integration mismatch found:** the public tracking API returned a minimized DTO with `bookingId`, masked contact numbers, and a flattened driver location, while the tracking page expected `booking._id`, pickup/drop coordinate arrays, a populated vehicle object, and a GeoJSON driver location. As a result, the map could remain in its loading/empty state and the public observer could fail to join the socket room.
- **API/page contract aligned:** the API now returns pickup/drop coordinates needed for the map, a minimal populated vehicle projection (`vehicleModel`, `number`, `type`), driver location in the expected GeoJSON coordinate format, and the SOS-active boolean used by the UI. It continues to omit OTPs, fare/payment details, and unmasked phone numbers.
- **Socket observer:** the public tracking page now uses the DTO's `bookingId` when joining/leaving the tracking room and accepts zero-valued latitude/longitude coordinates correctly.
- **Group ride link:** removed the fallback that built a public tracking URL from the booking database ID. If a secure share token is missing, the UI now disables tracking instead of exposing an ID as a token.
- **Still required:** run typecheck/tests/build, test a real token end-to-end, verify that socket authorization only allows read-only observer access with the correct token, and confirm completed/cancelled trip location visibility and token lifecycle policy. These changes have not been executed in a running app.


## Follow-up pass — public tracking token lifecycle and terminal-state privacy

- **Token lifetime:** new share tokens expire 24 hours after instant booking creation, or 12 hours after scheduled pickup. Legacy records without the expiry field use the same bounded fallback from `createdAt` or `scheduledPickupTime`. Expired links return HTTP 410 and are not cacheable.
- **Terminal-state privacy:** completed, cancelled, rejected, expired, payment-failed, no-driver, and disputed rides no longer expose the driver's live coordinates through the public tracking API. The tracking page clears any previously held driver position and stops polling/socket subscription when the link expires or the ride reaches a terminal state.
- **Socket authorization:** public observers must present the exact booking share token, and the token must be unexpired and the ride non-terminal. Terminal status emission revokes public observer room membership; driver GPS updates for terminal rides are ignored. Booking-ID-only room joins remain denied to guests.
- **Validation still outstanding:** run `npm --prefix jatri run typecheck`, `npm --prefix jatri run test`, `npm --prefix jatri run build`, and `npm --prefix socketServer test`; exercise active, expired, completed, and cancelled links against a test database and the deployed socket gateway. This commit is source-reviewed only; no end-to-end runtime result is claimed.


## Follow-up pass — isolate public observers from private booking-room events

- **Critical finding:** the public tracking page joined the same Socket.IO booking room as the passenger and driver. Several existing server events included pickup/drop OTPs in `booking-updated` payloads. A public observer could receive those room events even though the HTTP tracking DTO itself omitted OTPs.
- **Room-level data minimization:** all booking-room broadcasts now pass through a single broadcaster. Authenticated booking participants continue receiving the original event payload. Public observers receive only an allowlisted `booking-updated` or validated `driver-location` payload; OTPs, fares, payment details, phone numbers, chat, and call events are not sent to them.
- **Authoritative status changes:** the client-originated `booking-status-update` relay no longer broadcasts arbitrary status/OTP data. The active-ride page now relies on the already-authoritative authenticated API response/event instead of sending duplicate client broadcasts.
- **Tests:** added unit coverage for public payload allowlisting, GPS coordinate validation, and blocking participant-only room events. CI is running against the latest branch commit; its result must be checked before merge.
- **Remaining risk to validate:** room isolation is source-reviewed and unit-tested, but still needs an end-to-end test with an active public tracking socket and real booking events. Verify both public observers and authenticated rider/driver clients receive the correct different payloads.
