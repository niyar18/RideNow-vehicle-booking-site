import mongoose, { Schema, Document, Types } from "mongoose";

export type BookingStatus =
  | "requested"
  | "searching_driver"
  | "driver_assigned"
  | "awaiting_payment"
  | "confirmed"
  | "driver_arriving"
  | "driver_arrived"
  | "arrived"
  | "started"
  | "ride_started"
  | "ride_in_progress"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired"
  | "auto_rematching"
  | "no_drivers_available"
  | "payment_failed"
  | "disputed"
  | "scheduled";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "cash"
  | "failed";

export type SettlementStatus = "pending" | "success" | "failed";

export interface IGroupMember {
  user?: Types.ObjectId;
  name: string;
  email: string;
  status: "creator" | "accepted" | "pending" | "declined";
  shareAmount: number;
}

export interface IIntermediateStop {
  address: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  order: number;
  completed?: boolean;
}

export interface IAddressDetails {
  name: string;
  formattedAddress: string;
  locality?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  placeId?: string;
  location?: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface IBooking extends Document {
  user: Types.ObjectId;
  driver?: Types.ObjectId;
  vehicle?: Types.ObjectId;

  pickupAddress: string;
  dropAddress: string;
  pickupDetails?: IAddressDetails;
  dropDetails?: IAddressDetails;
  isMultiStop?: boolean;
  stops?: IIntermediateStop[];

  pickupLocation: {
    type: "Point";
    coordinates: [number, number];
  };

  dropLocation: {
    type: "Point";
    coordinates: [number, number];
  };

  fare: number;
  walletAmountPaid?: number;
  cashAmountDue?: number;
  onlineAmountPaid?: number;

  status: BookingStatus;
  paymentStatus: PaymentStatus;

  paymentDeadline?: Date;

  userMobileNumber: string;
  driverMobileNumber?: string;
  adminCommission: number;
  partnerAmount: number;
  pickupOtp: string;
  pickupOtpExpires: Date;
  pickupOtpFailedAttempts?: number;
  pickupOtpLockedUntil?: Date | null;

  dropOtp: string;
  dropOtpExpires: Date;
  dropOtpFailedAttempts?: number;
  dropOtpLockedUntil?: Date | null;
  dropOtpBypassed?: boolean;
  dropOtpBypassReason?: string;

  settlementStatus?: SettlementStatus;
  settlementError?: string | null;
  settlementFailedAt?: Date | null;
  settledAt?: Date | null;

  driverPreference?: "any" | "woman";
  matchingPolicyVersion?: string;
  candidateDrivers: Types.ObjectId[];
  currentDriverIndex: number;
  isPanicActive?: boolean;
  panicActivatedAt?: Date;
  shareToken?: string;
  shareTokenExpiresAt?: Date;
  isGroupRide?: boolean;
  groupInviteCode?: string;
  groupMembers?: IGroupMember[];
  splitFarePerPerson?: number;
  isSmartPickup?: boolean;
  smartPickupDetails?: {
    venueName: string;
    spotName: string;
    instructions: string;
    walkingTimeText: string;
  };
  isAutoRematching?: boolean;
  cancelledDriverIds?: Types.ObjectId[];
  reMatchCount?: number;
  isRouteDeviated?: boolean;
  safetyStatus?: "normal" | "deviation_detected" | "passenger_confirmed_safe" | "sos_activated";
  lastSafetyCheckInAt?: Date;
  safetyNotes?: string;
  fareBreakdown?: {
    vehicleType: string;
    baseFare: number;
    distanceKm: number;
    pricePerKm: number;
    distanceFare: number;
    timeMinutes: number;
    pricePerMinute: number;
    timeFare: number;
    platformFee: number;
    surgeMultiplier: number;
    surgeAmount: number;
    taxes: number;
    discount: number;
    isStudentDiscountApplied?: boolean;
    studentDiscount?: number;
    totalFare: number;
    cancellationDues?: number;
  };
  cancellationDuesIncluded?: number;
  isFamilyRide?: boolean;
  familyMemberDetails?: {
    name: string;
    relation: string;
    phone?: string;
  };
  serviceMode?: "passenger" | "logistics";
  cargoDetails?: {
    cargoType?: string;
    cargoWeightKg?: number;
    receiverContact?: string;
    deliveryNotes?: string;
  };
  isScheduled?: boolean;
  scheduledPickupTime?: Date;
  scheduledReminderSent?: boolean;
  acceptedAt?: Date;
  startedAt?: Date;
  actualPickupTime?: Date;
  completedAt?: Date;
  estimatedDropoffTime?: Date;
  actualDropoffTime?: Date;
  routeCoordinates?: [number, number][];
  routeDistanceKm?: number;
  routePolyline?: string;
  tripDurationMinutes?: number;
  tipAmount?: number;
  cancelledBy?: "user" | "driver" | "admin" | "system";
  cancellationReason?: string;
  cancellationFee?: number;
  cancellationFeeApplied?: boolean;
  driverCompensation?: number;
  isPlatformAdvance?: boolean;
  outstandingAccrued?: number;
  cancelledAt?: Date;
  rating?: number;
  feedback?: string;
  ratingTags?: string[];
  ratedAt?: Date;
  customerRating?: number;
  customerFeedback?: string;
  customerRatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    driver: { type: Schema.Types.ObjectId, ref: "User", required: false, index: true },
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle", required: false },

    pickupAddress: { type: String, required: true },
    dropAddress: { type: String, required: true },
    pickupDetails: {
      name: { type: String },
      formattedAddress: { type: String },
      locality: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      placeId: { type: String },
    },
    dropDetails: {
      name: { type: String },
      formattedAddress: { type: String },
      locality: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      placeId: { type: String },
    },

    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    dropLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    

    fare: { type: Number, required: true },
    walletAmountPaid: { type: Number, default: 0 },
    cashAmountDue: { type: Number, default: 0 },
    onlineAmountPaid: { type: Number, default: 0 },

    status: {
      type: String,
      default: "requested",
      index: true,
    },
adminCommission: {
  type: Number,
  default: 0,
},

partnerAmount: {
  type: Number,
  default: 0,
},
    settlementStatus: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true,
    },
    settlementError: {
      type: String,
      default: null,
    },
    settlementFailedAt: {
      type: Date,
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    paymentStatus: {
      type: String,
      default: "pending",
    },

    paymentDeadline: Date,

    pickupOtp: {
      type: String,
    },
    pickupOtpExpires: {
      type: Date,
    },
    pickupOtpFailedAttempts: {
      type: Number,
      default: 0,
    },
    pickupOtpLockedUntil: {
      type: Date,
      default: null,
    },

    dropOtp: {
      type: String,
    },
    dropOtpExpires: {
      type: Date,
    },
    dropOtpFailedAttempts: {
      type: Number,
      default: 0,
    },
    dropOtpLockedUntil: {
      type: Date,
      default: null,
    },
    dropOtpBypassed: {
      type: Boolean,
      default: false,
    },
    dropOtpBypassReason: {
      type: String,
    },

    userMobileNumber: { 
      type: String, 
      required: true,
      trim: true,
    },

    driverMobileNumber: { 
      type: String, 
      required: false,
      default: "",
      trim: true,
    },
    driverPreference: {
      type: String,
      enum: ["any", "woman"],
      default: "any",
      index: true,
    },
    matchingPolicyVersion: {
      type: String,
      default: "v1",
    },
    candidateDrivers: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    currentDriverIndex: {
      type: Number,
      default: 0,
    },
    isPanicActive: {
      type: Boolean,
      default: false,
    },
    panicActivatedAt: {
      type: Date,
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    shareTokenExpiresAt: {
      type: Date,
      index: true,
    },
    isGroupRide: {
      type: Boolean,
      default: false,
    },
    groupInviteCode: {
      type: String,
      index: true,
    },
    groupMembers: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        name: { type: String, required: true },
        email: { type: String, required: true },
        status: { type: String, enum: ["creator", "accepted", "pending", "declined"], default: "pending" },
        shareAmount: { type: Number, default: 0 },
      },
    ],
    splitFarePerPerson: {
      type: Number,
    },
    isSmartPickup: {
      type: Boolean,
      default: false,
    },
    smartPickupDetails: {
      venueName: { type: String },
      spotName: { type: String },
      instructions: { type: String },
      walkingTimeText: { type: String },
    },
    isAutoRematching: {
      type: Boolean,
      default: false,
    },
    cancelledDriverIds: [
      { type: Schema.Types.ObjectId, ref: "User" }
    ],
    reMatchCount: {
      type: Number,
      default: 0,
    },
    isRouteDeviated: {
      type: Boolean,
      default: false,
    },
    safetyStatus: {
      type: String,
      enum: ["normal", "deviation_detected", "passenger_confirmed_safe", "sos_activated"],
      default: "normal",
    },
    lastSafetyCheckInAt: {
      type: Date,
    },
    safetyNotes: {
      type: String,
    },
    fareBreakdown: {
      vehicleType: { type: String },
      baseFare: { type: Number },
      distanceKm: { type: Number },
      pricePerKm: { type: Number },
      distanceFare: { type: Number },
      timeMinutes: { type: Number },
      pricePerMinute: { type: Number },
      timeFare: { type: Number },
      platformFee: { type: Number },
      surgeMultiplier: { type: Number },
      surgeAmount: { type: Number },
      taxes: { type: Number },
      discount: { type: Number },
      isStudentDiscountApplied: { type: Boolean, default: false },
      studentDiscount: { type: Number, default: 0 },
      totalFare: { type: Number },
      cancellationDues: { type: Number, default: 0 },
    },
    cancellationDuesIncluded: { type: Number, default: 0 },
    isMultiStop: {
      type: Boolean,
      default: false,
    },
    stops: [
      {
        address: { type: String, required: true },
        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
          },
          coordinates: {
            type: [Number], // [lng, lat]
            required: true,
          },
        },
        order: { type: Number, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    isFamilyRide: {
      type: Boolean,
      default: false,
    },
    familyMemberDetails: {
      name: { type: String },
      relation: { type: String },
      phone: { type: String },
    },
    serviceMode: {
      type: String,
      enum: ["passenger", "logistics"],
      default: "passenger",
      index: true,
    },
    cargoDetails: {
      cargoType: { type: String, trim: true },
      cargoWeightKg: { type: Number },
      receiverContact: { type: String, trim: true },
      deliveryNotes: { type: String, trim: true },
    },
    isScheduled: {
      type: Boolean,
      default: false,
      index: true,
    },
    scheduledPickupTime: {
      type: Date,
      index: true,
    },
    scheduledReminderSent: {
      type: Boolean,
      default: false,
    },
    acceptedAt: { type: Date },
    startedAt: { type: Date },
    actualPickupTime: { type: Date },
    completedAt: { type: Date },
    estimatedDropoffTime: { type: Date },
    actualDropoffTime: { type: Date },
    routeCoordinates: { type: [[Number]], default: [] },
    routeDistanceKm: { type: Number },
    routePolyline: { type: String },
    tripDurationMinutes: { type: Number },
    tipAmount: { type: Number, default: 0 },
    cancelledBy: {
      type: String,
      enum: ["user", "driver", "admin", "system"],
    },
    cancellationReason: { type: String, trim: true },
    cancellationFee: { type: Number, default: 0 },
    cancellationFeeApplied: { type: Boolean, default: false },
    driverCompensation: { type: Number, default: 0 },
    isPlatformAdvance: { type: Boolean, default: false },
    outstandingAccrued: { type: Number, default: 0 },
    cancelledAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, trim: true, maxlength: 500 },
    ratingTags: { type: [String], default: [] },
    ratedAt: { type: Date },
    customerRating: { type: Number, min: 1, max: 5 },
    customerFeedback: { type: String, trim: true, maxlength: 500 },
    customerRatedAt: { type: Date },
  },
  { timestamps: true }
);

BookingSchema.index({ pickupLocation: "2dsphere" });
BookingSchema.index({ user: 1, status: 1, createdAt: -1 });
BookingSchema.index({ driver: 1, status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, createdAt: -1 });

const Booking = mongoose.models.Booking ||
  mongoose.model<IBooking>("Booking", BookingSchema);
export default Booking;