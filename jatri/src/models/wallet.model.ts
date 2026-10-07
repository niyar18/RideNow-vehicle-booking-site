import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWallet extends Document {
  userId: Types.ObjectId;
  balance: number;          // Available withdrawable earnings for driver / payment balance for user
  pendingEarnings: number;  // In-flight / pending earnings
  platformDues: number;     // Commission / adjustments owed to RideNow (e.g. from cash rides)
  outstandingAmount: number;// Unpaid cancellation charges owed by customer
  currency: string;         // Currency code e.g. "INR"
  totalEarnings: number;    // Lifetime driver earnings
  totalCommission: number;  // Lifetime platform commission
  totalWithdrawn: number;   // Total payout withdrawn to bank/UPI
  status: "active" | "frozen";
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    pendingEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformDues: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCommission: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "frozen"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Wallet =
  mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", WalletSchema);

export default Wallet;
