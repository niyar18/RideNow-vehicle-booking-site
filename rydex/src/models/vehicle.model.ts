import mongoose, { Schema, Types } from "mongoose";

export type VehicleType =
  | "bike"
  | "auto"
  | "car"
  | "loading"
  | "truck";

export type VehicleStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface IVehicle {
  owner: Types.ObjectId;

  type: VehicleType;
  number: string;
  vehicleModel: string;

  // 🔥 NEW
  imageUrl?: string;
  baseFare?: number;
  pricePerKm?: number;
  waitingCharge?: number;

  status: VehicleStatus;
  rejectionReason?: string;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["bike", "auto", "car", "loading", "truck"],
      required: true,
    },

    number: {
      type: String,
      required: true,
      uppercase: true,
      unique: true,
    },

    vehicleModel: {
      type: String,
      required: true,
    },

    // 🔥 PRICING
    imageUrl: String,
    baseFare: Number,
    pricePerKm: Number,
    waitingCharge: Number,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Vehicle =
  mongoose.models.Vehicle ||
  mongoose.model<IVehicle>("Vehicle", VehicleSchema);

export default Vehicle;
