import mongoose, { Schema, Document } from "mongoose";

export interface IStudentConfig extends Document {
  discountPercentage: number;      // Default 10%
  maxDiscountCap: number;          // Default ₹50
  minFare: number;                 // Default ₹100
  validityMonths: number;          // Default 12 months
  eligibleVehicleTypes: string[];  // Default ["bike", "auto", "car"]
  allowStackingWithPromo: boolean; // Default false
  isActive: boolean;               // Default true
  createdAt: Date;
  updatedAt: Date;
}

const StudentConfigSchema = new Schema<IStudentConfig>(
  {
    discountPercentage: { type: Number, default: 10, min: 1, max: 100 },
    maxDiscountCap: { type: Number, default: 50, min: 0 },
    minFare: { type: Number, default: 100, min: 0 },
    validityMonths: { type: Number, default: 12, min: 1 },
    eligibleVehicleTypes: {
      type: [String],
      default: ["bike", "auto", "car"],
    },
    allowStackingWithPromo: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const StudentConfig =
  mongoose.models.StudentConfig ||
  mongoose.model<IStudentConfig>("StudentConfig", StudentConfigSchema);

export default StudentConfig;
