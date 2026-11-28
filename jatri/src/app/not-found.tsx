import Link from "next/link";
import Nav from "@/shared/components/Nav";
import Footer from "@/shared/components/Footer";
import { HomeIcon } from "@/shared/components/icons/AppIcons";
import { Car, Compass, ArrowLeft, ShieldCheck } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#061A16] text-[#10251C] dark:text-[#F7F5ED] flex flex-col transition-colors duration-200">
      <Nav />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="max-w-2xl w-full mx-auto p-8 sm:p-12 rounded-[16px] bg-[#FAF7F0] dark:bg-[#0B2822] border border-[#DED7CA] dark:border-[#24483D] shadow-sm text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5EBDD] dark:bg-[#143D32] text-[#123D32] dark:text-[#A3E635] text-xs font-semibold uppercase tracking-wider mb-6">
            <Compass className="w-3.5 h-3.5" />
            <span>404 • Destination Not Found • <span lang="as">যাত্ৰা অব্যাহত ৰাখক</span></span>
          </div>

          {/* Large Hero Number */}
          <h1 className="font-serif text-6xl sm:text-7xl font-normal text-[#10251C] dark:text-[#F7F5ED] tracking-tight mb-3">
            404
          </h1>

          {/* Headline */}
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#10251C] dark:text-[#F7F5ED] tracking-tight mb-4">
            You&apos;ve Taken an Unmapped Turn
          </h2>

          {/* Description */}
          <p className="text-[#696B64] dark:text-[#B9C8BF] text-base sm:text-lg max-w-md mx-auto leading-relaxed mb-8">
            The road, stop, or ride page you&apos;re looking for doesn&apos;t exist, has been rerouted, or moved. Let&apos;s get your journey back on track.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#123D32] hover:bg-[#0D3027] dark:bg-[#28664D] dark:hover:bg-[#347858] px-6 py-3 text-sm font-semibold text-[#FAF7F0] shadow-sm transition-all duration-200"
            >
              <HomeIcon size={16} />
              <span>Return Home</span>
            </Link>

            <Link
              href="/book"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-[8px] bg-white dark:bg-[#10352C] border border-[#DED7CA] dark:border-[#24483D] hover:border-[#123D32] dark:hover:border-[#28664D] px-6 py-3 text-sm font-semibold text-[#10251C] dark:text-[#F7F5ED] transition-all duration-200"
            >
              <Car className="w-4 h-4 text-[#123D32] dark:text-[#A3E635]" />
              <span>Book a Ride</span>
            </Link>
          </div>

          {/* Helpful Quick Links Grid */}
          <div className="pt-8 border-t border-[#DED7CA]/60 dark:border-[#24483D]/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#505e53] dark:text-[#B9C8BF] mb-4">
              Explore Jaatri Services
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <Link
                href="/book"
                className="p-3 rounded-[10px] bg-white/70 dark:bg-[#10352C]/70 border border-[#DED7CA]/70 dark:border-[#24483D]/70 hover:border-[#123D32] dark:hover:border-[#28664D] transition group"
              >
                <span className="text-xs font-semibold text-[#10251C] dark:text-[#F7F5ED] block group-hover:text-[#123D32] dark:group-hover:text-[#A3E635]">
                  Book Ride
                </span>
                <span className="text-[11px] text-[#505e53] dark:text-[#B9C8BF]">
                  Instant dispatch
                </span>
              </Link>
              <Link
                href="/fleet"
                className="p-3 rounded-[10px] bg-white/70 dark:bg-[#10352C]/70 border border-[#DED7CA]/70 dark:border-[#24483D]/70 hover:border-[#123D32] dark:hover:border-[#28664D] transition group"
              >
                <span className="text-xs font-semibold text-[#10251C] dark:text-[#F7F5ED] block group-hover:text-[#123D32] dark:group-hover:text-[#A3E635]">
                  Our Fleet
                </span>
                <span className="text-[11px] text-[#505e53] dark:text-[#B9C8BF]">
                  Bike, Auto, Cab
                </span>
              </Link>
              <Link
                href="/safety"
                className="p-3 rounded-[10px] bg-white/70 dark:bg-[#10352C]/70 border border-[#DED7CA]/70 dark:border-[#24483D]/70 hover:border-[#123D32] dark:hover:border-[#28664D] transition group"
              >
                <span className="text-xs font-semibold text-[#10251C] dark:text-[#F7F5ED] block group-hover:text-[#123D32] dark:group-hover:text-[#A3E635]">
                  Safety Hub
                </span>
                <span className="text-[11px] text-[#505e53] dark:text-[#B9C8BF]">
                  Emergency guidance
                </span>
              </Link>
              <Link
                href="/contact"
                className="p-3 rounded-[10px] bg-white/70 dark:bg-[#10352C]/70 border border-[#DED7CA]/70 dark:border-[#24483D]/70 hover:border-[#123D32] dark:hover:border-[#28664D] transition group"
              >
                <span className="text-xs font-semibold text-[#10251C] dark:text-[#F7F5ED] block group-hover:text-[#123D32] dark:group-hover:text-[#A3E635]">
                  Support
                </span>
                <span className="text-[11px] text-[#505e53] dark:text-[#B9C8BF]">
                  Help & Grievance
                </span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
