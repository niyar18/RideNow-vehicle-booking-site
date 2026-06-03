# Implementation Plan - Fare Setup & Safety Features

This implementation plan details:
1. An explanation of how the fare price is currently calculated for a journey.
2. The design and implementation steps for customer safety features:
   - **Masked Calling**: Preventing the driver from seeing the customer's actual number by masking it in APIs and simulating a premium secure call flow.
   - **OTP Ride Initiation**: Verifying how this is already handled securely to ensure a ride only starts after OTP verification.
   - **Panic/SOS Button**: Adding an emergency panic button on the customer's side during a ride, notifying the server, and prompting emergency actions.

---

## 1. Fare Price Calculation Explanation

In the existing codebase, fare calculation is fully automated and based on the vehicle properties configured by the vendor (driver) and the distance calculated via map routes:
- **Base Fields**: The `Vehicle` schema (defined in [vehicle.model.ts](file:///d:/RideNow-vehicle-booking-site-main/src/models/vehicle.model.ts)) contains pricing parameters:
  - `baseFare` (flat initial charge)
  - `pricePerKm` (rate per kilometer)
- **Distance Calculation**: The pickup and drop locations are mapped on the client-side (`RouteMap` component on the search page), which calculates the path distance (`km`).
- **Calculation Formula**: When the customer books a vehicle (in [SearchPageContent.tsx](file:///d:/RideNow-vehicle-booking-site-main/src/app/search/SearchPageContent.tsx)), the dynamic fare is computed as:
  $$\text{Fare} = \text{round}(\text{baseFare} + (\text{km} \times \text{pricePerKm}))$$
- **Checkout & Booking**: This calculated fare is passed to the checkout page as a URL parameter and subsequently saved in the `Booking` document (defined in [booking.model.ts](file:///d:/RideNow-vehicle-booking-site-main/src/models/booking.model.ts)) when the booking request is created.

---

## 2. Customer Safety Features Design

### A. Masked Calling for Privacy
To protect the customer's privacy, we will ensure that the driver does not see or receive the customer's raw phone number.
1. **API Level Masking**:
   - In `/api/partner/bookings/active` (where the driver fetches their active ride details), we will intercept the response and mask the `userMobileNumber` field (e.g., changing `+919876543210` to `+91 ••••• ••210`).
2. **UI Secure Calling Simulation**:
   - In [active-ride/page.tsx](file:///d:/RideNow-vehicle-booking-site-main/src/app/partner/active-ride/page.tsx) (the driver's interface), we will replace the direct `tel:` phone link with an in-app **Secure Masked Call** interface.
   - When the driver clicks **Call**, it will open a beautiful glassmorphic modal simulating a VoIP secure bridge connection ("Connecting securely to customer via private relay...", "Ringing...", and "Connected (00:03)" with functional Mute, Speaker, and End Call buttons).

### B. OTP-Based Ride Initiation
We verified that the OTP verification to start the ride is **already fully functional**:
1. When the driver arrives at the pickup, they trigger `/api/partner/bookings/send-pickup-otp`, generating a random 4-digit OTP and sending it to the user's email.
2. The user sees this OTP on their live tracking page (`/ride/[id]`).
3. The driver inputs the OTP, triggering `/api/partner/bookings/verify-pickup-otp`. If correct, the booking status changes to `started`, launching the ride. We will keep this robust flow as-is.

### C. Panic (SOS) Button
We will add a panic trigger for passengers in distress during an ongoing ride.
1. **Database Update**:
   - Modify the [booking.model.ts](file:///d:/RideNow-vehicle-booking-site-main/src/models/booking.model.ts) schema to store:
     - `isPanicActive` (boolean, default: `false`)
     - `panicActivatedAt` (Date)
2. **API Endpoint**:
   - Create a new API route: `POST /api/booking/[id]/panic` to toggle panic status, log it, and trigger a mock emergency email notification to the RideNow Security Dispatch team using the existing mailer utility.
3. **UI Implementation (Customer Side)**:
   - In [ride/[id]/page.tsx](file:///d:/RideNow-vehicle-booking-site-main/src/app/ride/[id]/page.tsx), if the booking status is `started`, display a high-visibility, pulsing red **SOS/Panic** button.
   - Clicking it triggers a countdown (allowing cancellation in case of accident), then calls the panic API.
   - Once activated, displays an emergency dashboard overlay:
     - **Quick Actions**: Call local emergency services (`112` / `911`), contact emergency support.
     - **Live Share**: Display active status details to share.
     - **Silent Alert**: Indicate that security dispatch has been notified.
4. **UI Implementation (Driver Side)**:
   - In the driver ride dashboard, if socket updates indicate `isPanicActive` is true, show a subtle alert or help guide so the driver is aware standard security guidelines are in progress.

---

## 3. Proposed Changes

### Database & Models

#### [MODIFY] [booking.model.ts](file:///d:/RideNow-vehicle-booking-site-main/src/models/booking.model.ts)
- Add fields `isPanicActive: { type: Boolean, default: false }` and `panicActivatedAt: Date`.

---

### Backend APIs

#### [NEW] [route.ts](file:///d:/RideNow-vehicle-booking-site-main/src/app/api/booking/[id]/panic/route.ts)
- Create a POST endpoint that sets `isPanicActive` to `true`, logs `panicActivatedAt`, and sends an email notification to support.

#### [MODIFY] [route.ts](file:///d:/RideNow-vehicle-booking-site-main/src/app/api/partner/bookings/active/route.ts)
- Mask `userMobileNumber` (e.g. `+91 ••••• ••123`) before returning the booking JSON to the partner.

---

### Frontend Components & Pages

#### [MODIFY] [page.tsx](file:///d:/RideNow-vehicle-booking-site-main/src/app/ride/[id]/page.tsx) (Customer Ride Page)
- Check if status is `"started"`. If yes, show a prominent **SOS** panic button in the panel.
- Implement the SOS overlay (countdown, quick call buttons, panic state tracker, and call to `/api/booking/[id]/panic`).

#### [MODIFY] [page.tsx](file:///d:/RideNow-vehicle-booking-site-main/src/app/partner/active-ride/page.tsx) (Driver Ride Page)
- Intercept the call action. Instead of `tel:`, open an in-app simulated secure masked call dialog.
- Implement a simulated secure call component with connection animations, timer, mute, speaker, and end call options.
- Listen for panic socket event or fetch status to display a safety alert if triggered.

---

## 4. Verification Plan

### Manual Verification
- **Fare Price Check**: Validate fare calculations by checking vehicle config (base fare & price per km) and verify the checkout page is correctly showing the formula output: `baseFare + km * pricePerKm`.
- **OTP Start Ride**: Verify ride only transitions to `started` after inputting the correct pickup OTP.
- **Mask Calling Test**: Log in as a driver, view active booking, verify that `userMobileNumber` is masked in both network requests and the UI, and verify clicking the call button opens the simulated secure calling system.
- **Panic SOS Test**: Log in as a passenger, start the ride, click the SOS panic button, verify the countdown triggers, confirm the POST call to the panic endpoint succeeds, and verify the emergency layout appears.
