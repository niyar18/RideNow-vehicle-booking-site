import mongoose, { Schema, Document } from "mongoose";



const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
    },

    role: {
      type: String,
      enum: ["user", "vendor", "admin"],
      default: "user",
      index: true,
    },

    /* ===== VENDOR ===== */

    vendorStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
    },

    vendorOnboardingStep: {
      type: Number,
      default: 0,
      min: 0,
      max: 8,
    },

    vendorProfileCompleted: {
      type: Boolean,
      default: false,
    },

    vendorRejectionReason: String,
    vendorApprovedAt: Date,

    isVendorBlocked: {
      type: Boolean,
      default: false,
    },

    /* ===== VIDEO KYC ===== */

    videoKycStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "in_progress",
        "approved",
        "rejected",
      ],
      default: "not_required",
    },

    videoKycRoomId: String,
    videoKycRejectionReason: String,

    /* ===== DRIVER REALTIME DATA ===== */

    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },

    socketId:{
      type:String,
      default:null
    },

    currentVehicleType: {
      type: String,
      enum: ["bike", "auto", "car", "loading", "truck"],
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },

    lastLocationUpdate: {
      type: Date,
    },

    /* ===== AUTH ===== */

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    otp: String,
    otpExpiresAt: Date,
  },
  { timestamps: true }
);

/* ===== GEO INDEX ===== */
UserSchema.index({ location: "2dsphere" });

const User =
  mongoose.models.User || mongoose.model("User", UserSchema);

export default User;