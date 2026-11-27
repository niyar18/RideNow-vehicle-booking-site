"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "@/context/LanguageContext";
import { GamosaBorder } from "./GamosaMotif";

const sections = [
  { title: "footer.services", fallback: "Travel", links: [
    ["footer.rides", "Book a ride", "/book?fresh=true"], ["footer.cargo", "Cargo", "/book?category=trucks&serviceMode=logistics"],
    ["footer.rentals", "Rentals", "/book?rental=true"], ["nav.fleet", "Fleet", "/fleet"], ["footer.myBookings", "My bookings", "/bookings"],
  ] },
  { title: "footer.safetySupport", fallback: "Help and safety", links: [
    ["footer.safetyStandards", "Ride safety", "/safety"], ["footer.faq", "Help and FAQs", "/faq"],
    ["footer.contact", "Contact", "/contact"], ["footer.grievanceOfficer", "Grievance officer", "/grievance"],
  ] },
  { title: "footer.legal", fallback: "Legal", links: [
    ["footer.privacy", "Privacy", "/privacy"], ["footer.terms", "Terms of service", "/terms"],
    ["footer.paymentTerms", "Payment terms", "/payment-terms"], ["footer.refunds", "Cancellations and refunds", "/cancellation-refund"],
    ["footer.driverTerms", "Driver terms", "/partner-terms"], ["footer.cookies", "Cookie policy", "/cookies"],
    ["landing.photoCredits", "Photo credits", "/photo-credits"],
  ] },
];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative bg-[#142238] text-[#fcfaef]">
      <GamosaBorder height={10} accentColor="#d58d74" />
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-8 px-5 py-12 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-8 md:py-16">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" aria-label="Jaatri Home" className="inline-flex">
            <Image src="/logojatri.webp" alt="Jaatri, by RideNow" width={240} height={76} className="h-11 w-auto object-contain brightness-0 invert" />
          </Link>
          <p className="my-3 text-[26px] leading-tight tracking-tight [font-family:var(--font-serif)]">{t("footer.tagline", "More than a ride.")}</p>
          <p className="max-w-68 text-sm leading-relaxed text-[#d8e4d8]">{t("footer.aboutText", "Assam's local mobility platform for everyday journeys, vehicle rentals and deliveries.")}</p>
          <Link href="/partner/onboard/vehicle" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#aaf5da] hover:underline">
            {t("footer.becomePartner", "Become a partner")} <ArrowUpRight size={15} aria-hidden />
          </Link>
        </div>
        {sections.map(({ title, fallback, links }) => (
          <div key={title}>
            <h2 className="mb-3 text-[11px] font-bold tracking-[.12em] text-[#aaf5da] uppercase">{t(title, fallback)}</h2>
            <ul className="space-y-1.5">
              {links.map(([key, label, href]) => <li key={key}>
                <Link href={href} className="inline-flex min-h-8 items-center text-sm leading-snug text-[#d8e4d8] hover:text-white hover:underline">{t(key, label)}</Link>
              </li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[#6c8973] bg-[#0d182b]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-5 sm:px-8 md:flex-row md:items-center">
          <p className="text-xs text-[#d8e4d8]">© {new Date().getFullYear()} Jaatri by RideNow</p>
          <div className="flex flex-wrap items-center gap-3"><ThemeToggle variant="footer" /><LanguageSelector variant="footer" /></div>
        </div>
      </div>
    </footer>
  );
}
