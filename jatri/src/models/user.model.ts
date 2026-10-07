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

export type VerificationItemStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

export interface IDriverVerificationStatus {
  identity: VerificationItemStatus;
  drivingLicense: VerificationItemStatus;
  face: VerificationItemStatus;
  background: VerificationItemStatus;
  address: VerificationItemStatus;
  bank: VerificationItemStatus;
  vehicle: VerificationItemStatus;
}

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

  /* ===== DRIVER MULTI-FACTOR VERIFICATION ENGINE ===== */
  driverVerificationStatus?: IDriverVerificationStatus;

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
  isMobileVerified: boolean;
  otp?: string;
  otpExpiresAt?: Date;

  /* ===== STUDENT PROGRAM (ANNUAL 12-MONTH VERIFIED BENEFIT) ===== */
  isStudent?: boolean;
  studentVerification?: {
    status: "not_verified" | "pending" | "verified" | "expired" | "rejected";
    institutionName?: string;
    verificationMethod?: "institutional_email" | "student_id" | "enrollment_document";
    studentName?: string;
    studentIdNumber?: string;
    eduEmail?: string;
    documentType?: string;
    academicYear?: string;
    verifiedAt?: Date;
    expiresAt?: Date;
    verificationReference?: string;
    rejectionReason?: string;
  };
  studentDetails?: {
    eduEmail?: string;
    institution?: string;
    verifiedAt?: Date;
    expiresAt?: Date;
  };

  /* ===== WALLET & OUTSTANDING DUES ===== */
  walletBalance: number;
  outstandingAmount?: number; // Unpaid cancellation charges recovered on next ride

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
    },

    password: {
      type: String,
    },

    mobileNumber: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    isMobileVerified: {
      type: Boolean,
      default: false,
      index: true,
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

    /* ===== DRIVER MULTI-FACTOR VERIFICATION ENGINE ===== */
    driverVerificationStatus: {
      identity: {
        type: String,
        enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
        default: "not_submitted",
      },
      drivingLicense: {
        type: String,
        enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
        default: "not_submitted",
      },
      face: {
        type: String,
        enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
        default: "not_submitted",
      },
      background: {
        type: String,
        enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
        default: "not_submitted",
      },
      address: {
        type: String,
        enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
        default: "not_submitted",
      },
      bank: {
        type: String,
        enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
        default: "not_submitted",
      },
      vehicle: {
        type: String,
        enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
        default: "not_submitted",
      },
    },

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

    /* ===== STUDENT PROGRAM (ANNUAL 12-MONTH BENEFIT) ===== */
    isStudent: {
       type: Boolean,
       default: false,
       index: true,
    },
    studentVerification: {
      status: {
        type: String,
        enum: ["not_verified", "pending", "verified", "expired", "rejected"],
        default: "not_verified",
        index: true,
      },
      institutionName: { type: String, trim: true },
      verificationMethod: {
        type: String,
        enum: ["institutional_email", "student_id", "enrollment_document"],
      },
      studentName: { type: String, trim: true },
      studentIdNumber: { type: String, trim: true },
      eduEmail: { type: String, trim: true, lowercase: true },
      documentType: { type: String, trim: true },
      academicYear: { type: String, trim: true },
      verifiedAt: { type: Date },
      expiresAt: { type: Date, index: true },
      verificationReference: { type: String, trim: true },
      rejectionReason: { type: String, trim: true },
    },
    studentDetails: {
      eduEmail: String,
      institution: String,
      verifiedAt: Date,
      expiresAt: Date,
    },

    /* ===== WALLET & OUTSTANDING DUES ===== */
    walletBalance: {
      type: Number,
      default: 0,
      index: true,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
  },
  { timestamps: true }
);

/* ===== GEO INDEX ===== */
UserSchema.index({ location: "2dsphere" });
UserSchema.index({ location: "2dsphere", role: 1, isOnline: 1 });

const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;