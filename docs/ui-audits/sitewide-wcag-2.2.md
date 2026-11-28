# Jaatri site-wide accessibility pass

Target: [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/). This is a code and fixture audit, not a conformance certification. It builds on the separate SOS correction in PR #20.

## Changes

| Area | Work | Relevant criteria |
| --- | --- | --- |
| Shared navigation | Functional skip link takes focus to visible content; main landmarks and distinct page titles are available on core pages. Scroll spacing accounts for fixed navigation. The decorative startup overlay no longer obscures the page. | 2.4.1, 2.4.2, 2.4.3, 2.4.11 |
| Language | Homepage and shared navigation/footer strings identify their actual language, including English fallback; language options identify their native script and selection state. The overall page remains English where untranslated content is still used. | 3.1.1, 3.1.2, 4.1.2 |
| Dialogs and forms | Native language and settings dialogs with containment, Escape, and return focus. Cookie choices no longer cover page content and use labelled controls. Visible form labels and switch state added to settings, profile and checkout. | 1.3.1, 2.1.1, 2.1.2, 2.4.3, 3.3.2, 4.1.2 |
| Rides and checkout | Focusable booking scroll region, keyboard-activated address suggestions, and announced suggestion counts; ride expand/share names match visible text, group-ride switch exposes name/state, shared trip uses a valid description list. | 1.3.1, 2.1.1, 2.5.3, 4.1.2 |
| Contrast and motion | Higher-contrast controls in ride, payout, referral and not-found states; reduced-motion CSS also covers persistent animations. | 1.4.3, 1.4.11, 2.2.2 |
| Errors | A custom application-wide failure screen has a clear title, a language, initial heading focus, and a route back home. | 2.4.2, 2.4.3, 3.1.1 |

## Repeat the local browser audit

Use a clean checkout without a production .env or production credentials. The runner loads only loopback, intercepts browser API calls with fixtures, and blocks external traffic. Do not change it to target a preview or production deploy; hosted previews may share production data services.

```sh
cd jatri
npm ci
npm install --prefix /tmp/jaatri-a11y playwright-core@1.65.1 axe-core@4.14.1 @sparticuz/chromium@158.0.0
AUTH_SECRET=local-fixture-only npm run build -- --webpack
AUTH_SECRET=local-fixture-only npm run start -- --hostname 127.0.0.1 --port 3498
# In another terminal at jatri/:
node e2e/site-audit.mjs
```

Set AUDIT_CHROMIUM to a local Chromium executable if needed. Set AUDIT_ONLY to a route prefix for a focused rerun. Set AUDIT_OUTPUT to choose where the JSON matrix is written. Review fixture errors, redirects, manual-review nodes and upstream dependencies as well as automatic violations. A screen rendering an intentional error or missing fixture does not count as verifying its successful workflow.

## What still needs manual validation

- Full screen-reader interaction (NVDA/Firefox or Chromium, VoiceOver/Safari, and TalkBack/Chrome), including live availability, error recovery, route selection and payment.
- Reflow and focus visibility at real browser zoom and text spacing overrides; Windows high contrast and mobile orientation changes. Initial-width checks do not cover all interaction states.
- Complete authenticated journeys against a separately isolated database, including populated driver workspace and vendor review, OTP and verification retries, driver matching and video KYC. Review live map and payment provider UI separately in sandbox mode.
- Audit remaining localized application text, metadata and accessible names. Do not claim whole-site WCAG conformance before the remaining complete processes and manual checks are verified.
