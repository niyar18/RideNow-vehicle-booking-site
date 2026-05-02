import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "user" | "vendor" | "admin";
export type VendorStatus = "pending" | "approved" | "rejected";

export type VideoKycStatus =
  | "not_required"
  | "pending"
  | "in_progress"
  | "approved"
  | "rejected";

export type VehicleType =
  | "bike"
  | "auto"
  | "car"
  | "loading"
  | "truck";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  mobileNumber?: string;

  role: UserRole;

  vendorStatus?: VendorStatus;
  vendorOnboardingStep: number;
  vendorProfileCompleted: boolean;
  vendorRejectionReason?: string;
  vendorApprovedAt?: Date;
  isVendorBlocked: boolean;

  videoKycStatus: VideoKycStatus;
  videoKycRoomId?: string;
  videoKycRejectionReason?: string;

  /* ===== DRIVER REALTIME FIELDS ===== */
socketId:string | null
  isOnline: boolean;
  currentVehicleType?: VehicleType;

  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };

  lastLocationUpdate?: Date;

  /* ===== COMMON ===== */

  isEmailVerified: boolean;
  otp?: string;
  otpExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
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

    mobileNumber: {
      type: String,
      trim: true
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
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;