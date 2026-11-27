import { auth } from "@/auth";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import PublicHome from "@/shared/components/PublicHome";
import { redirect } from "next/navigation";
import GeoUpdater from "@/features/maps/components/GeoUpdater";
import ActiveRideBanner from "@/features/rides/components/ActiveRideBanner";

export default async function Home() {
  const session = await auth();

  // Instant role redirect checks based on verified session JWT (synced in auth.ts)
  // Eliminates blocking DB connection latency on every page transition to "/"
  if (session?.user?.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (session?.user?.role === "vendor") {
    redirect("/partners/dashboard");
  }

  return (
    <div className="w-full min-h-screen bg-[var(--background)]">
      <Nav />
      <GeoUpdater userId={session?.user?.id} />
      <PublicHome />

      {/* Floating active ride recovery pill when user has an ongoing trip */}
      <ActiveRideBanner variant="floating" />

      <Footer />
    </div>
  );
}
