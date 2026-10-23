"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Wallet, CalendarClock, Users } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

export default function DriveWithJaatri() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-60px" });

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-[#FAF7F0] dark:bg-[#061A16] overflow-hidden min-h-[440px] sm:min-h-[500px] lg:min-h-[540px] flex items-center py-10 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8"
      aria-label="Drive with Jaatri Driver Partnership"
    >
      {/* ================= ATMOSPHERIC TOP & BOTTOM DISSOLVES ================= */}
      {/* Subtle top fade that visually connects the image with the preceding fleet section */}
      <div className="absolute top-0 left-0 right-0 h-12 sm:h-16 bg-gradient-to-b from-[#FAF7F0] via-[#FAF7F0]/60 to-transparent dark:from-[#061A16] dark:via-[#061A16]/60 pointer-events-none z-10" />

      {/* Restrained bottom fade so the photograph blends naturally into the next section */}
      <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-gradient-to-t from-[#FAF7F0] via-[#FAF7F0]/50 to-transparent dark:from-[#061A16] dark:via-[#061A16]/50 pointer-events-none z-10" />

      {/* ================= FULL-BLEED PHOTOGRAPHIC COMPOSITION ================= */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden">
        <Image
          src="/drivejatri.webp"
          alt="Drive with Jaatri - Assamese Driver Partner with Car and Brahmaputra River"
          fill
          priority
          quality={95}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover object-[85%_center] sm:object-[80%_center] md:object-[82%_center] lg:object-center"
        />

        {/* Sophisticated Layered Gradient:
            - Mobile: Strong vertical and horizontal ivory fade to keep stacked copy perfectly legible.
            - Desktop: Strong left fade fading cleanly into transparent on the right to showcase the driver & branded sedan.
        */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F0] via-[#FAF7F0]/85 via-35% to-[#FAF7F0] dark:from-[#061A16] dark:via-[#061A16]/85 dark:via-35% dark:to-[#061A16] sm:hidden" />
        <div className="absolute inset-0 hidden sm:block bg-gradient-to-r from-[#FAF7F0] via-[#FAF7F0]/95 via-35% to-transparent sm:via-[#FAF7F0]/90 sm:via-42% md:via-[#FAF7F0]/75 md:via-48% lg:via-[#FAF7F0]/25 lg:via-55% lg:to-transparent dark:from-[#061A16] dark:via-[#061A16]/95 dark:sm:via-[#061A16]/90 dark:md:via-[#061A16]/75 dark:lg:via-[#061A16]/30" />
      </div>

      {/* ================= CONTENT CONTAINER (Grid-aligned with max-w-7xl) ================= */}
      <div className="relative z-20 max-w-7xl mx-auto w-full">
        <div className="max-w-xl lg:max-w-[620px] text-left">
          
          {/* Eyebrow: FOR OUR DRIVER PARTNERS */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-2.5 mb-2 sm:mb-2.5"
          >
            <div className="h-[2px] w-6 sm:w-8 bg-[#E34222] dark:bg-[#E06A50] rounded-full" />
            <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.18em] text-[#E34222] dark:text-[#E06A50]">
              {t("partnerSection.eyebrow", "FOR OUR DRIVER PARTNERS")}
            </span>
          </motion.div>

          {/* Main Heading: DM Serif Display in dark forest ink (#10251C) with Assamese vermilion brush stroke */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.05, ease: "easeOut" }}
            style={{
              fontFamily: "var(--font-serif), 'DM Serif Display', Georgia, serif",
            }}
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#10251C] dark:text-[#F7F5ED] tracking-tight leading-[1.08] whitespace-normal"
          >
            {t("partnerSection.titlePrefix", "Drive with")}{" "}
            <span className="relative inline-block">
              {t("partnerSection.titleBrand", "Jaatri.")}
              <svg
                aria-hidden="true"
                viewBox="0 0 100 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute -bottom-1 sm:-bottom-1.5 left-0 w-full h-[6px] sm:h-[8px] text-[#E34222] dark:text-[#E06A50] pointer-events-none"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 7 C 28 3.5, 62 10.5, 98 4"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </motion.h2>

          {/* Supporting Headline: Inter, Deep Forest Green */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          >
            <p className="text-base sm:text-xl lg:text-[22px] font-bold text-[#123D32] dark:text-[#34D399] mt-2.5 sm:mt-3 leading-snug tracking-tight">
              {t("partnerSection.headline", "Your vehicle. Your earnings. Your freedom.")}
            </p>
            {/* Description */}
            <p className="text-xs sm:text-sm lg:text-[15px] text-[#696B64] dark:text-[#B9C8BF] font-normal mt-1 leading-relaxed max-w-lg">
              {t("partnerSection.subtext", "Join Jaatri and move Assam forward, one ride at a time.")}
            </p>
          </motion.div>

          {/* Coordinated Mobile-Native Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 sm:mt-6"
          >
            {/* Benefit 1: Direct payouts */}
            <div className="bg-white/95 dark:bg-[#0B2822]/95 border border-[#DED7CA]/85 dark:border-[#24483D] rounded-[12px] p-3 flex items-center gap-3 shadow-[0_2px_8px_rgba(18,61,50,0.03)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <div className="w-9 h-9 rounded-[8px] bg-[#FAF7F0] dark:bg-[#061A16] border border-[#DED7CA]/70 dark:border-[#24483D] text-[#046A38] dark:text-[#34D399] flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-[#046A38] dark:text-[#34D399]" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] leading-snug tracking-tight truncate">
                  {t("partnerSection.card1Title", "Direct payouts")}
                </h4>
                <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium leading-tight mt-0.5">
                  {t("partnerSection.card1Desc", "100% driver pay")}
                </p>
              </div>
            </div>

            {/* Benefit 2: Flexible hours */}
            <div className="bg-white/95 dark:bg-[#0B2822]/95 border border-[#DED7CA]/85 dark:border-[#24483D] rounded-[12px] p-3 flex items-center gap-3 shadow-[0_2px_8px_rgba(18,61,50,0.03)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <div className="w-9 h-9 rounded-[8px] bg-[#FAF7F0] dark:bg-[#061A16] border border-[#DED7CA]/70 dark:border-[#24483D] text-[#046A38] dark:text-[#34D399] flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4 text-[#046A38] dark:text-[#34D399]" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] leading-snug tracking-tight truncate">
                  {t("partnerSection.card2Title", "Flexible hours")}
                </h4>
                <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium leading-tight mt-0.5">
                  {t("partnerSection.card2Desc", "Drive on your schedule")}
                </p>
              </div>
            </div>

            {/* Benefit 3: A local service */}
            <div className="bg-white/95 dark:bg-[#0B2822]/95 border border-[#DED7CA]/85 dark:border-[#24483D] rounded-[12px] p-3 flex items-center gap-3 shadow-[0_2px_8px_rgba(18,61,50,0.03)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <div className="w-9 h-9 rounded-[8px] bg-[#FAF7F0] dark:bg-[#061A16] border border-[#DED7CA]/70 dark:border-[#24483D] text-[#046A38] dark:text-[#34D399] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[#046A38] dark:text-[#34D399]" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-[#10251C] dark:text-[#F7F5ED] leading-snug tracking-tight truncate">
                  {t("partnerSection.card3Title", "A local service")}
                </h4>
                <p className="text-[11px] text-[#696B64] dark:text-[#B9C8BF] font-medium leading-tight mt-0.5">
                  {t("partnerSection.card3Desc", "Built for Assam, by Assam")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Call-to-Action Hierarchy */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 sm:mt-7"
          >
            {/* Primary CTA */}
            <Link
              href="/partner/onboard/vehicle"
              className="group inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-[8px] bg-[#046A38] hover:bg-[#03532C] dark:bg-[#046A38] dark:hover:bg-[#03532C] text-white font-bold text-sm sm:text-base transition-all duration-200 active:scale-[0.97] shadow-[0_4px_16px_rgba(4,106,56,0.22)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38]"
            >
              <span>{t("partnerSection.ctaPrimary", "Become a Jaatri Partner")}</span>
              <ArrowRight className="w-4 h-4 text-[#FAF7F0] transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.5} />
            </Link>

            {/* Secondary CTA */}
            <Link
              href="/partner-terms"
              className="inline-flex min-h-[44px] items-center px-1 text-sm sm:text-base font-semibold text-[#123D32] dark:text-[#388463] hover:text-[#0D3027] dark:hover:text-emerald-400 underline underline-offset-4 decoration-[#123D32]/40 dark:decoration-[#388463]/40 hover:decoration-[#123D32] transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#046A38] rounded-[8px]"
            >
              {t("partnerSection.ctaSecondary", "Learn more")}
            </Link>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
