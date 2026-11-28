# SOS accessibility and safety checks

Jaatri's in-app SOS and India's emergency number are separate. Call 112 is a direct dial link and is not gated on submitting an SOS. The incident confirmation does not imply that any emergency responder, family contact, or monitoring desk received a message.

## Covered in this change

- Native modal semantics, accessible names and descriptions, keyboard activation, focus containment, Escape and return focus (WCAG 2.2 AA: 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11, 4.1.2).
- A persistent live region for recording/success and an assertive error region for failure. The direct call link is available before and after either result. Status does not depend on color (1.4.1, 4.1.3).
- Explicit high-contrast colors in both themes, minimum 44px actions, no animated SOS indicators, and a scrollable dialog that reflows at 320 CSS pixels (1.4.3, 1.4.10, 1.4.11, 2.5.8).

## Verification and limits

- Local Chromium: rider at 320px (dark preference) and driver at 1280px (light preference). Verified initial focus on Call 112, Tab containment, Escape and restored focus, accessible dial link, a mocked recording failure followed by a successful retry, target size, and no horizontal overflow in the dialog. No phone call, live incident, or real notification was sent.
- axe WCAG A/AA scan: no automatic violations in both tested dialogs. Manually checked the SOS text color pairs (minimum 9.3:1 for the defined enabled foreground/background pairs).
- Public first-pass axe smoke at 320px on Home, Book, Explore, Safety and FAQ returned no automatic violations in the states tested. Some rules returned manual-review items, including contrast on Home and text/name matching on several pages. This was not an audit of the full site.
- Review complete booking, account, payment and admin flows with accessible fixtures, including errors and responsive variants. Test actual screen-reader output, high-contrast settings, zoom/reflow, and non-English pages. The existing Assamese page-language mismatch needs separate review. Automated tests and the scope of this change do not establish whole-site WCAG conformance.
