# Route and tracking maps

The booking/search route editor, rider and shared trip tracking, and driver dashboard share the same map controls, location and vehicle markers, and Midnight/Ice/Mint palette. The admin workspace does not embed a map.

- The booking editor keeps pickup, destination and stop labels distinct. Activate a visible marker to adjust the corresponding location, use the arrow keys to move the map, then confirm the new pin or press Escape to cancel. Asynchronous address lookups cannot replace a newer selection.
- On an active trip, the map maintains the trip route separately from the driver's approach to pickup. The map fits the relevant points on load and status transitions; it does not continually override manual pan or zoom as GPS positions change. The driver dashboard keeps its marker current as the vehicle type and availability change.
- Road routing keeps the existing provider/fallback sequence. When the road distance is unavailable, the map labels the approximate route instead of presenting it as a confirmed road route. Authoritative pricing is a separate server operation; see [Fare pricing](./fare-pricing.md).

Raster tiles use the [official OpenStreetMap tile URL](https://operations.osmfoundation.org/policies/tiles/) and keep attribution on the map. Next generates two same-origin MapLibre modules under `public/map-runtime/<installed version>/` from the lockfile-installed package. The worker and its relative shared import are kept together to avoid hashed module resolution issues. Assets are generated during normal Next dev/build and are not committed. This does not relax the existing Content Security Policy. For a standalone Next packaging workflow, copy the built `public/` tree as usual.

Tests can use fixed tile images, routes, and synthetic positions without contacting the tile or routing providers or accessing live GPS. The public tile service has no availability guarantee; production usage should follow its service policy.
