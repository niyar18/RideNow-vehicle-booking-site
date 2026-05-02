import { auth } from "@/auth";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

import VendorDashboard from "@/components/VendorDashboard";

import User from "@/models/user.model";
import connectDb from "@/lib/db";
import PublicHome from "@/components/PublicHome";
import AdminDashboard from "./admin/dashboard/page";
import { redirect, RedirectType } from "next/navigation"
import GeoUpdater from "@/components/GeoUpdater";

export default async function Home() {
  const session = await auth();

  let vendorData: {
    vendorStep: number;
    vendorStatus: "pending" | "approved" | "rejected";
  } | null = null;

  let isVendor = false;

  // ✅ DATABASE = SINGLE SOURCE OF TRUTH
  if (session?.user?.id) {
    await connectDb();

    const user = await User.findById(session.user.id)
      .select("role vendorOnboardingStep vendorStatus")
      .lean();

    if (user?.role === "vendor") {
      isVendor = true;
      vendorData = {
        vendorStep: user.vendorOnboardingStep ?? 0,
        vendorStatus: user.vendorStatus ?? "pending",
      };
    }
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <Nav />
 <GeoUpdater userId={session?.user?.id}/>
      {isVendor && vendorData ? (
        <VendorDashboard
          vendorStep={vendorData.vendorStep}
          vendorStatus={vendorData.vendorStatus}
        />
      ) :session?.user?.role==="admin"?(redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard`,RedirectType.push)): (
        <PublicHome />
      )}

      <Footer />
    </div>
  );
}
