import { auth } from "@/auth";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import VendorDashboard from "@/components/VendorDashboard";
import User from "@/models/user.model";
import connectDb from "@/lib/db";
import GeoUpdater from "@/components/GeoUpdater";
import { redirect } from "next/navigation";

export default async function PartnersDashboardPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "vendor") {
    redirect("/");
  }

  await connectDb();
  const user = await User.findById(session.user.id)
    .select("vendorOnboardingStep vendorStatus videoKycStatus")
    .lean();

  if (!user) {
    redirect("/");
  }

  const vendorStep = user.vendorOnboardingStep ?? 0;
  const vendorStatus = (user.vendorStatus as any) || "pending";
  const videoKycStatus = (user.videoKycStatus as any) || "not_required";

  return (
    <div className="w-full min-h-screen bg-white">
      <Nav />
      <GeoUpdater userId={session?.user?.id} />
      <VendorDashboard
        vendorStep={vendorStep}
        vendorStatus={vendorStatus}
        videoKycStatus={videoKycStatus}
      />
      <Footer />
    </div>
  );
}
