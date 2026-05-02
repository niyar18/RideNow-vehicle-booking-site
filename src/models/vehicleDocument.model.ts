import mongoose, { Schema, Types } from "mongoose";

export type DocumentStatus = "pending" | "approved" | "rejected";

export interface IVehicleDocument {
  owner: Types.ObjectId;

  aadhaarUrl?: string;
  licenseUrl?: string;
  rcUrl?: string;

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

    aadhaarUrl: String,
    licenseUrl: String,
    rcUrl: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: String,
  },
  { timestamps: true }
);

const VehicleDocument= mongoose.models.VehicleDocument ||
  mongoose.model("VehicleDocument", DocumentSchema);

  export default VehicleDocument
