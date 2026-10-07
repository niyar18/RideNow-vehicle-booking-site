import mongoose, { Schema, Types } from "mongoose";

export type DocumentStatus = "pending" | "approved" | "rejected";
export type DocVerificationItemStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

export interface IVehicleDocument {
  owner: Types.ObjectId;

  // Identity Documents
  aadhaarUrl?: string;
  aadhaarMaskedNumber?: string;
  panNumber?: string;
  panUrl?: string;
  panStatus?: DocVerificationItemStatus;

  // Driving License
  licenseUrl?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  licenseClass?: string;
  licenseStatus?: DocVerificationItemStatus;

  // Vehicle Registration Certificate (RC)
  rcUrl?: string;
  rcNumber?: string;
  rcExpiry?: Date;
  rcStatus?: DocVerificationItemStatus;

  // Insurance Policy
  insuranceUrl?: string;
  insurancePolicyNumber?: string;
  insuranceExpiry?: Date;
  insuranceType?: "commercial" | "third_party" | "comprehensive";
  insuranceStatus?: DocVerificationItemStatus;

  // Pollution Under Control (PUC)
  pucUrl?: string;
  pucExpiry?: Date;
  pucStatus?: DocVerificationItemStatus;

  // Fitness Certificate
  fitnessUrl?: string;
  fitnessExpiry?: Date;
  fitnessStatus?: DocVerificationItemStatus;

  // Commercial Permit
  permitUrl?: string;
  permitNumber?: string;
  permitExpiry?: Date;
  permitStatus?: DocVerificationItemStatus;

  // Police / Character & Antecedent Verification
  policeVerificationUrl?: string;
  policeVerificationCertificateNo?: string;
  policeVerificationDate?: Date;
  policeVerificationStatus?: DocVerificationItemStatus;

  // Vehicle Inspection Photos
  vehiclePhotos?: string[];

  // Overall Status (Legacy & Aggregate)
  status: DocumentStatus;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IVehicleDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Identity Documents
    aadhaarUrl: String,
    aadhaarMaskedNumber: String,
    panNumber: String,
    panUrl: String,
    panStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    // Driving License
    licenseUrl: String,
    licenseNumber: String,
    licenseExpiry: Date,
    licenseClass: String,
    licenseStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    // Registration Certificate (RC)
    rcUrl: String,
    rcNumber: String,
    rcExpiry: Date,
    rcStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    // Insurance Policy
    insuranceUrl: String,
    insurancePolicyNumber: String,
    insuranceExpiry: Date,
    insuranceType: {
      type: String,
      enum: ["commercial", "third_party", "comprehensive"],
    },
    insuranceStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    // PUC Certificate
    pucUrl: String,
    pucExpiry: Date,
    pucStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    // Fitness Certificate
    fitnessUrl: String,
    fitnessExpiry: Date,
    fitnessStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    // Commercial Permit
    permitUrl: String,
    permitNumber: String,
    permitExpiry: Date,
    permitStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    // Police / Character & Antecedent Verification
    policeVerificationUrl: String,
    policeVerificationCertificateNo: String,
    policeVerificationDate: Date,
    policeVerificationStatus: {
      type: String,
      enum: ["not_submitted", "pending", "verified", "rejected", "expired"],
      default: "not_submitted",
    },

    // Vehicle Photos
    vehiclePhotos: [String],

    // Overall Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: String,
  },
  { timestamps: true }
);

const VehicleDocument =
  mongoose.models.VehicleDocument ||
  mongoose.model("VehicleDocument", DocumentSchema);

export default VehicleDocument;
