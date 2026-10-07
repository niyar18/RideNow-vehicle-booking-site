import mongoose, { Schema, Document, Types } from "mongoose";

export type TransactionType = "credit" | "debit";

export type CleanWalletType =
  | "RIDE_PAYMENT"
  | "COMMISSION"
  | "EARNING"
  | "REFUND"
  | "WITHDRAWAL"
  | "ADJUSTMENT"
  | "TOPUP"
  | "CASH_COLLECTION"
  | "INCENTIVE"
  | "TIP"
  | "PENALTY"
  | "SETTLE_DUES"
  | "CANCELLATION_CHARGE"
  | "OUTSTANDING_RECOVERY"
  | "CANCELLATION_COMPENSATION";

export type TransactionCategory =
  | "topup"
  | "ride_payment"
  | "ride_refund"
  | "partner_earning"
  | "commission_deduct"
  | "cash_collection"
  | "incentive"
  | "tip"
  | "penalty"
  | "settle_dues"
  | "withdrawal"
  | "withdrawal_refund"
  | "promo_bonus"
  | "admin_adjustment"
  | "cancellation_charge"
  | "outstanding_recovery"
  | "cancellation_compensation";

export type TransactionStatus = "pending" | "success" | "failed" | "reversed";

export interface IWalletTransaction extends Document {
  transactionId: string;
  walletId?: Types.ObjectId;
  userId: Types.ObjectId;
  rideId?: Types.ObjectId;
  bookingId?: Types.ObjectId;
  withdrawalId?: Types.ObjectId;
  adminId?: Types.ObjectId;
  type: TransactionType;
  transactionType: CleanWalletType;
  category: TransactionCategory;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  platformDuesBefore?: number;
  platformDuesAfter?: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  description: string;
  status: TransactionStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rideId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: "Withdrawal",
      default: null,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: [
        "RIDE_PAYMENT",
        "COMMISSION",
        "EARNING",
        "REFUND",
        "WITHDRAWAL",
        "ADJUSTMENT",
        "TOPUP",
        "CASH_COLLECTION",
        "INCENTIVE",
        "TIP",
        "PENALTY",
        "SETTLE_DUES",
        "CANCELLATION_CHARGE",
        "OUTSTANDING_RECOVERY",
        "CANCELLATION_COMPENSATION",
      ],
      default: "EARNING",
      index: true,
    },
    category: {
      type: String,
      enum: [
        "topup",
        "ride_payment",
        "ride_refund",
        "partner_earning",
        "commission_deduct",
        "cash_collection",
        "incentive",
        "tip",
        "penalty",
        "settle_dues",
        "withdrawal",
        "withdrawal_refund",
        "promo_bonus",
        "admin_adjustment",
        "cancellation_charge",
        "outstanding_recovery",
        "cancellation_compensation",
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceBefore: {
      type: Number,
      required: true,
      default: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      default: 0,
    },
    platformDuesBefore: {
      type: Number,
      default: 0,
    },
    platformDuesAfter: {
      type: Number,
      default: 0,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "reversed"],
      default: "success",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
WalletTransactionSchema.index({ bookingId: 1, transactionType: 1 });

const WalletTransaction =
  mongoose.models.WalletTransaction ||
  mongoose.model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);

export default WalletTransaction;
