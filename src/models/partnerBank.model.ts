import mongoose, { Schema, Types } from "mongoose";

export type BankStatus =
  | "not_added"
  | "details_added"
  | "verified";

export interface IVendorBank {
  owner: Types.ObjectId;

  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
  upi?: string;

  status: BankStatus;

  createdAt: Date;
  updatedAt: Date;
}

const VendorBankSchema = new Schema<IVendorBank>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },

    accountNumber: {
      type: String,
      required: true,
    },

    ifsc: {
      type: String,
      required: true,
      uppercase: true,
    },

    upi: String,

    status: {
      type: String,
      enum: ["not_added", "details_added", "verified"],
      default: "details_added",
    },
  },
  { timestamps: true }
);

const PartnerBank =
  mongoose.models.PartnerBank ||
  mongoose.model<IVendorBank>("PartnerBank", VendorBankSchema);

export default PartnerBank;
