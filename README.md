# 🚗 RideNow – Vehicle Booking Platform

RideNow is a full-stack vehicle booking web application that allows users to browse, book, and manage rides seamlessly. It includes secure authentication, real-time booking flow, and email notifications for a smooth user experience.

---

## 🌟 Features

- 🔐 **Authentication System**
  - Email & Password login
  - Google OAuth integration
  - Secure session handling (NextAuth)

- 🚘 **Vehicle Booking**
  - Browse available vehicles
  - Book rides with user details
  - Manage bookings

- 👤 **User Roles**
  - User & Admin roles
  - Protected routes
  - Role-based access control

- 📧 **Email Notifications**
  - Registration confirmation
  - Booking updates
  - Powered by Resend API

- 🗄️ **Database Integration**
  - MongoDB with Mongoose
  - User & booking data management

- ⚡ **Modern Stack**
  - Next.js (App Router)
  - TypeScript
  - Tailwind CSS

---

## 🛠️ Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS  
- **Backend:** Next.js API Routes  
- **Authentication:** NextAuth.js  
- **Database:** MongoDB + Mongoose  
- **Email Service:** Resend  
- **Deployment:** Vercel (recommended)

---

## 📁 Project Structure

```bash
src/
 ├── app/
 │   ├── api/
 │   │   ├── auth/
 │   │   └── register/
 │   ├── admin/
 │   ├── dashboard/
 │   └── page.tsx
 ├── lib/
 │   ├── db.ts
 │   └── mailer.ts
 ├── models/
 │   └── user.model.ts
 ├── auth.ts
 └── proxy.ts