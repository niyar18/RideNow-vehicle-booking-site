
import { auth } from "@/auth";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import VendorDashboard from "@/features/partner/components/VendorDashboard";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import connectDb from "@/lib/db";
import GeoUpdater from "@/features/maps/components/GeoUpdater";
import { redirect } from "next/navigation";

export default async function PartnersDashboardPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "vendor") {
    redirect("/");
  }

  await connectDb();
  const user = await User.findById(session.user.id).lean();

  if (!user) {
    redirect("/");
  }

  const vehicle = await Vehicle.findOne({ owner: user._id }).lean();

  const isVehicleApproved = vehicle?.status === "approved";
  const vendorStep = isVehicleApproved ? 7 : (user.vendorOnboardingStep ?? 0);
  const vendorStatus = (user.vendorStatus as any) || "pending";
  const videoKycStatus = (user.videoKycStatus as any) || "not_required";

  const initialPricing = vehicle
    ? {
        imageUrl: vehicle.imageUrl || null,
        baseFare: vehicle.baseFare || null,
        pricePerKm: vehicle.pricePerKm || null,
        waitingCharge: vehicle.waitingCharge || 0,
        status: vehicle.status,
        rejectionReason: vehicle.rejectionReason || null,
        type: vehicle.type,
      }
    : null;

  const initialUserData = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    mobileNumber: user.mobileNumber,
    walletBalance: user.walletBalance || 0,
    vendorStatus: user.vendorStatus,
    vendorOnboardingStep: vendorStep,
    videoKycStatus: user.videoKycStatus,
    videoKycRoomId: user.videoKycRoomId,
    vendorRejectionReason: user.vendorRejectionReason,
    videoKycRejectionReason: user.videoKycRejectionReason,
  };

  return (
    <div className="w-full min-h-screen bg-[var(--background)] transition-colors">
      <Nav user={initialUserData} />
      <GeoUpdater userId={session?.user?.id} />
      <VendorDashboard
        vendorStep={vendorStep}
        vendorStatus={vendorStatus}
        videoKycStatus={videoKycStatus}
        initialPricing={initialPricing}
        initialUserData={initialUserData}
      />
      <Footer />
    </div>
  );
}

export const metadata = { title: "Driver workspace" };
