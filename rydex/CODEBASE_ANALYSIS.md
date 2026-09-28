# Codebase Analysis - Functions by File

**Project Type:** Next.js + TypeScript Ride-sharing Application  
**Total Files Analyzed:** 115 TypeScript/TSX files  
**Date:** June 1, 2026

---

## 📑 Table of Contents

1. [Root Level Files](#root-level-files)
2. [App Routes & Pages](#app-routes--pages)
3. [API Routes](#api-routes)
4. [Components](#components)
5. [Hooks](#hooks)
6. [Models](#models)
7. [Libraries](#libraries)
8. [Redux](#redux)
9. [Authentication](#authentication)
10. [Summary](#summary)

---

## Root Level Files

### `Provider.tsx`
- **Purpose:** Root provider component for the application
- **Functions:** 
  - `Provider` - Main provider wrapper component

### `auth.ts`
- **Purpose:** Authentication logic and password verification
- **Functions:**
  - Email field definition
  - Password field definition
  - User object definition
  - `isMatch` - Password matching function

### `auth/server.ts`
- **Purpose:** Server-side authentication configuration
- **Functions:**
  - `auth` - NextAuth configuration

### `auth/index.ts`
- **Purpose:** Auth module export file (empty/index)

### `initUser.ts`
- **Purpose:** User initialization logic
- **Functions:**
  - `InitUser` - Initialize user on app load

### `proxy.ts`
- **Purpose:** Request proxy/middleware configuration
- **Functions:**
  - `PUBLIC_ROUTES` - Public route constants
  - `PUBLIC_API_ROUTES` - Public API route constants
  - `VENDOR_ONBOARDING_START` - Vendor onboarding route constant
  - `proxy` - Main proxy middleware function
  - Configuration objects for session and role-based routing

---

## App Routes & Pages

### Admin Dashboard
**`app/admin/dashboard/page.tsx`**
- **Purpose:** Admin dashboard main page
- **Functions:**
  - `AdminDashboardPage` - Main page component
  - `session` - Session retrieval

**`app/admin/dashboard/AdminDashboardClient.tsx`**
- **Purpose:** Admin dashboard client-side component
- **Functions:**
  - `AdminDashboardClient` - Main dashboard component
  - `router` - Router instance
  - `loadAll` - Load all dashboard data
  - `TabButton` - Tab button component
  - `KYC_STATUS` - KYC status constants
  - `AVATAR_COLORS` - Avatar color configuration
  - `ContentList` - Content list display component
  - `startKyc` - Start KYC process
  - `KPI_CONFIG` - KPI configuration
  - `Kpi` - KPI display component
  - Helper functions for data formatting and trend calculation

### Admin Vendor Management
**`app/admin/vendors/[id]/page.tsx`**
- **Purpose:** Admin vendor review and management page
- **Functions:**
  - `AdminVendorReviewPage` - Main vendor review component
  - `load` - Load vendor data
  - `approveVendor` - Approve vendor action
  - `rejectVendor` - Reject vendor action
  - `AnimatedCard` - Animated card component
  - `DocPreview` - Document preview component
  - `isImage` - Image type check
  - `isPdf` - PDF type check
  - `ConfirmModal` - Confirmation modal component
  - `RejectModal` - Rejection reason modal component
  - `InfoRow` - Information row display
  - `StatusBadge` - Status badge component
  - `Badge` - Generic badge component

### Admin Vehicle Management
**`app/admin/vehicles/[id]/page.tsx`**
- **Purpose:** Admin vehicle review page
- **Functions:**
  - `AdminVehicleReviewPage` - Main vehicle review component
  - `load` - Load vehicle data
  - `approve` - Approve vehicle
  - `reject` - Reject vehicle
  - `Card` - Card component
  - `Info` - Information display
  - `StatusBadge` - Status badge
  - `ConfirmModal` - Confirmation modal
  - `RejectModal` - Rejection modal

### User Booking
**`app/book/page.tsx`**
- **Purpose:** Vehicle booking page
- **Functions:**
  - `VEHICLES` - Vehicle configuration constants
  - `stepVariants` - Animation variants for steps
  - `BookPage` - Main booking page component
  - `canContinue` - Validation function
  - `searchAddress` - Search address function
  - `useCurrentLocation` - Get user's current location
  - Helper functions for address formatting and progress tracking

**`app/bookings/page.tsx`**
- **Purpose:** User's booking history page
- **Functions:**
  - `MyBookingsPage` - Main bookings list component
  - `fetchBookings` - Fetch user's bookings
  - `getStatusColor` - Get color for booking status
  - `formatDate` - Format date display
  - `filteredBookings` - Filter bookings based on status

### Ride Management
**`app/ride/[id]/page.tsx`**
- **Purpose:** Active ride tracking page for customer
- **Functions:**
  - `LiveRideMap` - Live ride map component
  - `STATUS_CONFIG` - Ride status configuration
  - `PAYMENT_LABEL` - Payment display labels
  - `PEEK_H` - Peek height constant
  - `RidePage` - Main ride page component
  - `fetchBooking` - Fetch booking details
  - `handleCancel` - Cancel ride action
  - Various display and formatting functions

**`app/partner/active-ride/page.tsx`**
- **Purpose:** Active ride tracking page for driver
- **Functions:**
  - `LiveRideMap` - Live ride map component
  - `MAP_STATUS` - Map status constants
  - `STATUS_LABEL` - Status label mapping
  - `PAYMENT_BADGE` - Payment display
  - `DriverRidePage` - Main driver ride component
  - `sendPickupOtp` - Send pickup OTP
  - `handleVerifyOtp` - Verify OTP
  - `sendDropOtp` - Send drop-off OTP
  - `handleVerifyDropOtp` - Verify drop OTP
  - Multiple helper components (ActionBar, PanelContent, CompletedScreen, etc.)

### Partner/Vendor Pages
**`app/partner/bookings/page.tsx`**
- **Purpose:** Partner's booking history
- **Functions:**
  - `PartnerBookingsPage` - Main component
  - `fetchBookings` - Fetch partner's bookings
  - `getStatusColor` - Status color mapping
  - `getVehicleIcon` - Get vehicle icon
  - `formatDate` - Date formatting

**`app/partner/onboard/page.tsx`** - Vendor onboarding main page
- **Functions:**
  - `STEPS` - Onboarding steps definition
  - `PartnerOnboard` - Main onboarding component

**`app/partner/onboard/vehicle/page.tsx`** - Vehicle registration during onboarding
- **Functions:**
  - `VEHICLES` - Vehicle type configuration
  - `VEHICLE_REGEX` - Vehicle number validation regex
  - `PartnerVehiclePage` - Main vehicle page
  - `load` - Load vehicle data
  - `submitVehicle` - Submit vehicle registration

**`app/partner/onboard/documents/page.tsx`** - Document upload during onboarding
- **Functions:**
  - `PartnerDocumentsPage` - Main documents page
  - `canContinue` - Validation check
  - `handleFileChange` - File upload handler
  - `submitDocuments` - Submit uploaded documents
  - `DocUpload` - Document upload component

**`app/partner/onboard/bank/page.tsx`** - Bank details during onboarding
- **Functions:**
  - `IFSC_REGEX` - IFSC code validation
  - `PartnerBankPage` - Main bank page
  - Validation functions for bank details
  - `handleSubmit` - Submit bank information
  - `InputField` - Reusable input field component

**`app/partner/pending-requests/page.tsx`** - Pending booking requests for driver
- **Functions:**
  - `VendorPendingPage` - Main pending requests page
  - `fetchPendingBookings` - Fetch pending bookings
  - `handleAction` - Handle accept/reject actions

### Search & Checkout
**`app/search/page.tsx`** - Search results page
- **Functions:**
  - `SearchPage` - Main search page

**`app/search/SearchPageContent.tsx`** - Search results content
- **Functions:**
  - `RouteMap` - Route map display
  - `VEHICLE_META` - Vehicle metadata
  - `SearchPageContent` - Main search content component
  - `fetchNearbyVehicles` - Fetch nearby vehicles
  - Helper functions for geocoding and vehicle lookup

**`app/checkout/page.tsx`** - Checkout main page
- **Functions:**
  - `CheckoutPage` - Main checkout component

**`app/checkout/CheckoutContent.tsx`** - Checkout content/logic
- **Functions:**
  - `VEHICLE_ICONS` - Vehicle icon mapping
  - `CheckoutContent` - Main checkout logic
  - `VehicleIcon` - Vehicle icon component
  - `handleCreateBooking` - Create booking
  - `handlePaymentConfirm` - Payment confirmation
  - `handleCancelBooking` - Cancel booking
  - `loadRazorpayScript` - Load Razorpay payment script
  - Multiple payment and booking management functions

### Other Pages
**`app/layout.tsx`**
- **Purpose:** Root layout for Next.js app
- **Functions:**
  - `geistSans` - Font family configuration
  - `geistMono` - Monospace font configuration
  - `metadata` - App metadata
  - `RootLayout` - Root layout component

**`app/page.tsx`** - Home page
- **Functions:**
  - `Home` - Home page component
  - `session` - Session check
  - `user` - User data retrieval

**`app/contact/page.tsx`** - Contact page
- **Functions:**
  - `ContactPage` - Main contact page
  - `handleChange` - Form input change handler
  - `handleSubmit` - Form submission
  - `contactInfo` - Contact information constant
  - `Icon` - Icon component

**`app/faq/page.tsx`** - FAQ page
- **Functions:**
  - `FAQPage` - Main FAQ page
  - `faqs` - FAQ list constant

**`app/fleet/page.tsx`** - Fleet information page
- **Functions:**
  - `FleetPage` - Main fleet page
  - `features` - Features list
  - `Icon` - Icon component

**`app/video-kyc/[roomId]/page.tsx`** - Video KYC page
- **Functions:**
  - `VideoKYCPage` - Main video KYC component
  - Refs: `containerRef`, `previewRef`, `zpRef`, `joinedRef`
  - `handleApprove` - Approve KYC
  - `handleReject` - Reject KYC
  - `init` - Initialize video call
  - `toggleCamera` - Toggle camera on/off
  - `toggleMic` - Toggle microphone on/off
  - `startCall` - Start video call
  - `Modal` - Modal component for approval/rejection

---

## API Routes

### Admin APIs
**`app/api/admin/dashboard/route.ts`** - Get admin dashboard data
- **Functions:**
  - `GET` - Fetch dashboard metrics (vendors, vehicles, earnings)

**`app/api/admin/earnings/route.ts`** - Get admin earnings
- **Functions:**
  - `GET` - Fetch 7-day earnings data

**`app/api/admin/vendors/[id]/route.ts`** - Get vendor details
- **Functions:**
  - `GET` - Fetch specific vendor information

**`app/api/admin/vendors/[id]/approve/route.ts`** - Approve vendor
- **Functions:**
  - `POST` - Approve vendor registration

**`app/api/admin/vendors/[id]/reject/route.ts`** - Reject vendor
- **Functions:**
  - `POST` - Reject vendor registration

**`app/api/admin/vendors/video-kyc/pending/route.ts`** - Get pending KYC vendors
- **Functions:**
  - `GET` - Fetch vendors pending video KYC

**`app/api/admin/vendors/video-kyc/start/[vendorId]/route.ts`** - Start video KYC
- **Functions:**
  - `PATCH` - Initialize video KYC session

**`app/api/admin/vendors/video-kyc/complete/route.ts`** - Complete video KYC
- **Functions:**
  - `PATCH` - Mark KYC as completed

**`app/api/admin/vehicles/[id]/route.ts`** - Get vehicle details
- **Functions:**
  - `GET` - Fetch vehicle information

**`app/api/admin/vehicles/[id]/approve/route.ts`** - Approve vehicle
- **Functions:**
  - `POST` - Approve vehicle registration

**`app/api/admin/vehicles/[id]/reject/route.ts`** - Reject vehicle
- **Functions:**
  - `POST` - Reject vehicle registration

### Authentication APIs
**`app/api/auth/register/route.ts`** - User registration
- **Functions:**
  - `POST` - Register new user with OTP generation

**`app/api/auth/verify-otp/route.ts`** - OTP verification
- **Functions:**
  - `POST` - Verify OTP and complete registration

### Booking APIs
**`app/api/booking/create/route.ts`** - Create booking
- **Functions:**
  - `POST` - Create new booking

**`app/api/booking/[id]/route.ts`** - Get booking details
- **Functions:**
  - `GET` - Fetch booking information

**`app/api/booking/[id]/status/route.ts`** - Get booking status
- **Functions:**
  - `GET` - Fetch current booking status

**`app/api/booking/[id]/accept/route.ts`** - Accept booking (driver)
- **Functions:**
  - `POST` - Accept booking request

**`app/api/booking/[id]/reject/route.ts`** - Reject booking (driver)
- **Functions:**
  - `POST` - Reject booking request

**`app/api/booking/[id]/cancel/route.ts`** - Cancel booking
- **Functions:**
  - `POST` - Cancel booking

**`app/api/booking/[id]/arriving/route.ts`** - Driver arriving
- **Functions:**
  - `POST` - Update status to arriving

**`app/api/booking/[id]/arrived/route.ts`** - Driver arrived
- **Functions:**
  - `POST` - Update status to arrived

**`app/api/booking/[id]/start/route.ts`** - Start ride
- **Functions:**
  - `POST` - Start the ride

**`app/api/booking/[id]/complete/route.ts`** - Complete ride
- **Functions:**
  - `POST` - Mark ride as completed

**`app/api/booking/[id]/expire/route.ts`** - Expire booking
- **Functions:**
  - `POST` - Mark booking as expired

**`app/api/booking/[id]/confirm-payment/route.ts`** - Confirm payment
- **Functions:**
  - `POST` - Confirm payment for booking

### Partner APIs
**`app/api/partner/bookings/route.ts`** - Get partner's bookings
- **Functions:**
  - `GET` - Fetch all partner bookings

**`app/api/partner/bookings/pending/route.ts`** - Get pending bookings
- **Functions:**
  - `GET` - Fetch pending booking requests

**`app/api/partner/bookings/active/route.ts`** - Get active bookings
- **Functions:**
  - `GET` - Fetch active/ongoing bookings

**`app/api/partner/bookings/counts/route.ts`** - Get booking counts
- **Functions:**
  - `GET` - Get pending and active booking counts

**`app/api/partner/bookings/send-pickup-otp/route.ts`** - Send pickup OTP
- **Functions:**
  - `POST` - Send OTP for pickup verification

**`app/api/partner/bookings/verify-pickup-otp/route.ts`** - Verify pickup OTP
- **Functions:**
  - `POST` - Verify pickup OTP

**`app/api/partner/bookings/send-drop-otp/route.ts`** - Send drop OTP
- **Functions:**
  - `POST` - Send OTP for drop-off

**`app/api/partner/bookings/verify-drop-otp/route.ts`** - Verify drop OTP
- **Functions:**
  - `POST` - Verify drop-off OTP

**`app/api/partner/vehicle/route.ts`** - Vehicle management
- **Functions:**
  - `POST` - Register new vehicle
  - `GET` - Get partner's vehicle
  - `VEHICLE_REGEX` - Vehicle validation

**`app/api/partner/vehicle/pricing/route.ts`** - Vehicle pricing
- **Functions:**
  - `POST` - Set vehicle pricing
  - `GET` - Get pricing details

**`app/api/partner/vehicle/pricing/edit/route.ts`** - Edit pricing
- **Functions:**
  - `PATCH` - Update vehicle pricing

**`app/api/partner/documents/route.ts`** - Document management
- **Functions:**
  - `GET` - Get partner's documents
  - `POST` - Upload documents

**`app/api/partner/earnings/route.ts`** - Partner earnings
- **Functions:**
  - `GET` - Fetch partner's 7-day earnings

**`app/api/partner/bank/route.ts`** - Bank details
- **Functions:**
  - `POST` - Save bank details
  - `GET` - Get bank information

**`app/api/partner/video-kyc/request/route.ts`** - Request video KYC
- **Functions:**
  - `PATCH` - Request video KYC session

### User APIs
**`app/api/user/bookings/route.ts`** - Get user's bookings
- **Functions:**
  - `GET` - Fetch user's booking history

### Vehicle APIs
**`app/api/vehicles/nearby/route.ts`** - Find nearby vehicles
- **Functions:**
  - `POST` - Search for nearby vehicles

### Payment APIs
**`app/api/payment/create/route.ts`** - Create payment order
- **Functions:**
  - `POST` - Create Razorpay payment order

**`app/api/payment/verify/route.ts`** - Verify payment
- **Functions:**
  - `POST` - Verify payment completion

### Chat APIs
**`app/api/chat/send/route.ts`** - Send chat message
- **Functions:**
  - `POST` - Send message in ride chat

**`app/api/chat/get-all/route.ts`** - Get chat messages
- **Functions:**
  - `POST` - Fetch chat history

### User Profile APIs
**`app/api/me/route.ts`** - Get current user
- **Functions:**
  - `GET` - Fetch logged-in user's profile

### Socket APIs
**`app/api/socket/connect/route.ts`** - Socket connection
- **Functions:**
  - `POST` - Initialize socket connection

### Zego Video APIs
**`app/api/zego/token/route.ts`** - Generate Zego token for video
- **Functions:**
  - `generateToken04` - Generate video call token
  - `POST` - Create token for video KYC

---

## Components

### Map Components
**`components/LiveTrackingMap.tsx`**
- **Purpose:** Real-time ride tracking map
- **Functions:**
  - `driverIcon` - Driver marker icon
  - `pickupIcon` - Pickup location icon
  - `dropIcon` - Drop location icon
  - `AutoFollow` - Auto-follow map functionality
  - `LiveRideMap` - Main live tracking component

**`components/RouteMap.tsx`**
- **Purpose:** Display route between pickup and drop
- **Functions:**
  - `pickupIcon` - Pickup marker
  - `dropIcon` - Drop marker
  - `FitBounds` - Fit map to route bounds
  - `ZoomControlsWrapper` - Zoom controls
  - `RouteMap` - Main route display component
  - `DragHintBadge` - UI hint for dragging locations

### Chart Components
**`components/AdminEarning.tsx`**
- **Purpose:** Admin earnings chart
- **Functions:**
  - `CustomTooltip` - Chart tooltip
  - `AdminEarningsChart` - Main chart component
  - Various data calculation functions

**`components/AdminStatusChart.tsx`**
- **Purpose:** Admin vendor/vehicle status donut chart
- **Functions:**
  - `STATUS_CONFIG` - Status configuration
  - `RADIAN` - Chart radian constant
  - `StatusDonutChart` - Main donut chart
  - `Icon` - Status icon display

**`components/PartnerEarningChart.tsx`**
- **Purpose:** Partner earnings chart
- **Functions:**
  - `CustomTooltip` - Chart tooltip
  - `PartnerEarningsChart` - Main chart component
  - Earnings calculation functions

### Navigation & Layout
**`components/Nav.tsx`**
- **Purpose:** Main navigation bar
- **Functions:**
  - `NAV_ITEMS` - Navigation items configuration
  - `Nav` - Main navigation component
  - `fetchCounts` - Fetch pending/active counts
  - `handleLogout` - Logout function
  - `renderNavItems` - Render navigation items
  - `ProfileContent` - User profile dropdown
  - `VehicleStack` - Vehicle selection component
  - `Icon` - Navigation icon display

**`components/Footer.tsx`**
- **Purpose:** Application footer
- **Functions:**
  - `Footer` - Main footer component

**`components/Herosection.tsx`**
- **Purpose:** Hero section on home page
- **Functions:**
  - `HeroSection` - Main hero component
  - `handleBookNow` - Navigate to booking

**`components/PublicHome.tsx`**
- **Purpose:** Public home page content
- **Functions:**
  - `PublicHome` - Main public home component

### Authentication
**`components/AuthModal.tsx`**
- **Purpose:** Login/signup modal
- **Functions:**
  - `AuthModal` - Main auth modal component
  - `handleOtpChange` - OTP input handler
  - `handleLogin` - Login function
  - `handleGoogleLogin` - Google OAuth login
  - `handleSignUp` - Signup function
  - `handleVerifyOtp` - OTP verification

### Ride & Booking
**`components/RideChat.tsx`**
- **Purpose:** Chat during ride
- **Functions:**
  - `QUICK_REPLIES` - Quick message templates
  - `AI_SUGGESTIONS` - AI suggested responses
  - `RideChat` - Main chat component
  - `sendMessage` - Send message function
  - `formatTime` - Time formatting
  - `formatDate` - Date formatting
  - Message grouping and display functions

**`components/VehicleBookingCard.tsx`**
- **Purpose:** Vehicle selection card
- **Functions:**
  - `TYPE_CONFIG` - Vehicle type configuration
  - `VehicleBookingCard` - Main card component

**`components/VehicleCategoriesSlider.tsx`**
- **Purpose:** Horizontal vehicle categories slider
- **Functions:**
  - `VEHICLE_CATEGORIES` - Categories configuration
  - `VehicleCategoriesSlider` - Main slider component
  - Scroll and visibility tracking functions

### Vendor Dashboard
**`components/VendorDashboard.tsx`**
- **Purpose:** Partner/vendor dashboard
- **Functions:**
  - `STEPS` - Onboarding steps
  - `TOTAL_STEPS` - Total step count
  - `VendorDashboard` - Main dashboard component
  - `getActiveStep` - Get current step
  - `goToStep` - Navigate to step
  - `PricingModal` - Pricing configuration modal
  - `submitPricing` - Submit pricing
  - `StatusCard` - Step status display
  - `ActionCard` - Action buttons
  - `RejectionCard` - Rejection reason display
  - `PriceInput` - Price input field

### Location
**`components/GeoUpdater.tsx`**
- **Purpose:** Update driver location in real-time
- **Functions:**
  - `GeoUpdater` - Main geolocation update component
  - Location tracking and socket emission

---

## Hooks

**`hooks/useGetMe.tsx`**
- **Purpose:** Fetch current user information
- **Functions:**
  - `useGetMe` - Custom hook to get user data
  - Redux dispatch for user state management

---

## Models

**`models/user.model.ts`**
- **Purpose:** User database model
- **Functions:**
  - `UserSchema` - Mongoose schema definition
  - `User` - User model

**`models/vehicle.model.ts`**
- **Purpose:** Vehicle database model
- **Functions:**
  - `VehicleSchema` - Mongoose schema
  - `Vehicle` - Vehicle model

**`models/booking.model.ts`**
- **Purpose:** Booking database model
- **Functions:**
  - `BookingSchema` - Mongoose schema
  - `Booking` - Booking model

**`models/vehicleDocument.model.ts`**
- **Purpose:** Vehicle documents database model
- **Functions:**
  - `DocumentSchema` - Mongoose schema
  - `VehicleDocument` - Document model

**`models/partnerBank.model.ts`**
- **Purpose:** Partner bank details database model
- **Functions:**
  - `VendorBankSchema` - Mongoose schema
  - `PartnerBank` - Bank model

**`models/chatMessage.model.ts`**
- **Purpose:** Chat message database model
- **Functions:**
  - `ChatMessageSchema` - Mongoose schema
  - `ChatMessage` - Chat model

---

## Libraries

**`lib/db.ts`**
- **Purpose:** Database connection management
- **Functions:**
  - `mongodbUrl` - MongoDB connection string
  - `connectDb` - Connect to MongoDB database
  - `conn` - Connection cache

**`lib/cloudinary.ts`**
- **Purpose:** Cloudinary image upload
- **Functions:**
  - `uploadOnCloudinary` - Upload image to Cloudinary
  - Buffer conversion utilities

**`lib/mailer.ts`**
- **Purpose:** Email sending
- **Functions:**
  - `resend` - Email service instance
  - `sendMail` - Send email function

**`lib/razorpay.ts`**
- **Purpose:** Razorpay payment gateway integration
- **Functions:**
  - `razorpay` - Razorpay instance

**`lib/stripe.ts`**
- **Purpose:** Stripe payment gateway integration
- **Functions:**
  - `stripe` - Stripe instance

**`lib/socket.ts`**
- **Purpose:** Socket.io connection management
- **Functions:**
  - `getSocket` - Get or create socket connection

---

## Redux

**`redux/store.ts`**
- **Purpose:** Redux store configuration
- **Functions:**
  - `store` - Redux store instance

**`redux/userSlice.ts`**
- **Purpose:** User state management
- **Functions:**
  - `initialState` - Initial user state
  - `userSlice` - Redux user slice with reducers

**`redux/StoreProvider.tsx`**
- **Purpose:** Redux provider wrapper
- **Functions:**
  - `StoreProvider` - Redux provider component

---

## Authentication

**`next-auth.d.ts`**
- **Purpose:** TypeScript definitions for NextAuth
- Type definitions for session and user

**`global.d.ts`**
- **Purpose:** Global TypeScript definitions
- Global type definitions for the application

---

## Summary

### Statistics
- **Total Files:** 115 TypeScript/TSX files
- **Main Categories:**
  - App Routes/Pages: 20+
  - API Routes: 45+
  - Components: 13
  - Models: 6
  - Library Files: 6
  - Redux: 3
  - Authentication: 4
  - Utilities: 8

### Key Features
1. **Ride Booking System** - Users can book rides with real-time tracking
2. **Driver/Partner Management** - Registration, onboarding, KYC, earnings tracking
3. **Admin Dashboard** - Manage vendors, vehicles, and monitor earnings
4. **Payment Integration** - Razorpay and Stripe integration
5. **Real-time Chat** - During rides (Socket.io)
6. **Video KYC** - Zego video KYC for partner verification
7. **Geolocation** - Real-time location tracking
8. **Document Management** - Upload and verify documents

### Technology Stack
- **Frontend:** Next.js 14+, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, Node.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js
- **Payment:** Razorpay, Stripe
- **Real-time:** Socket.io
- **Storage:** Cloudinary for images
- **Video:** Zego for video KYC

### Architecture Highlights
- Role-based access control (User, Partner/Driver, Admin)
- Complete user journey from booking to payment
- Multi-step vendor onboarding with KYC
- Real-time ride tracking and updates
- Earnings analytics for both admin and partners
- Document verification workflow

---

*Generated: June 1, 2026*
