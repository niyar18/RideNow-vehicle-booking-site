# Jaatri visual system and access checks

Jaatri uses three brand colors: Midnight (`#142238`), Ice (`#F3F8F6`), and Mint (`#91F2CE`). Use the semantic tokens in `jatri/src/app/globals.css` rather than a brand hex for text, interactive borders, focus, and actionable labels. Surface variations come from that palette. Use separate status colors for warnings or failures, always with a label or icon as well.

The nine transparent files under `jatri/public/vehicle-art/` are original AI-generated vehicle illustrations, cropped and encoded to WebP for display. They illustrate categories, not the exact vehicles a rider will get. Don't use these illustrations to represent a driver's verified vehicle photo. The Assam destination photographs remain real and credited on `/photo-credits`.

## Accessibility scope

Target [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/). The theme tests lock in a 4.5:1 text minimum for the primary token pairs and 3:1 for the tested focus and interactive borders. Core experiences should preserve discernible names, visible keyboard focus, and predictable tab order; use at least 24×24 CSS pixels for AA touch targets (44×44 where practical). Preserve zoom and support a 320 CSS-pixel viewport without horizontal page scroll. Horizontally scrolling content regions remain keyboard-reachable through their own links.

These automated and sampled manual checks do not certify conformance across the entire application. Before release, check real sign-in, map, payments, video call, and assisted-technology flows in an authorized staging environment.
