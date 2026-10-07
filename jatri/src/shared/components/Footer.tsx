"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
} from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import { useTranslation } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="w-full bg-black text-white">
      {/* TOP SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-12">

          {/* BRAND */}
          <div>
            <h2 className="text-2xl font-bold tracking-wide">RideNow</h2>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed">
              {t("footer.aboutText", "Book any vehicle — from bikes to trucks. Trusted owners. Transparent pricing.")}
            </p>

            {/* SOCIAL */}
            <div className="flex gap-4 mt-6">
              {[
                { Icon: Facebook, href: "https://facebook.com", name: "Facebook" },
                { Icon: Instagram, href: "https://instagram.com", name: "Instagram" },
                { Icon: Twitter, href: "https://twitter.com", name: "Twitter" },
                { Icon: Linkedin, href: "https://linkedin.com", name: "LinkedIn" },
              ].map((item, i) => (
                <motion.a
                  key={i}
                  whileHover={{ y: -3 }}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.name}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-white/20 hover:bg-white hover:text-black transition cursor-pointer select-none"
                >
                  <item.Icon size={18} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* LINKS */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-300">
              COMPANY
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { label: "About", href: "/" },
                { label: "Careers", href: "/" },
                { label: "Blog", href: "/" },
                { label: "Contact Us", href: "/contact" },
                { label: "Help & FAQs", href: "/faq" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* SERVICES */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-300">
              SERVICES
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { label: "Book a Ride", href: "/book" },
                { label: "Our Fleet", href: "/fleet" },
                { label: "RideNow Wallet", href: "/wallet" },
                { label: "My Bookings", href: "/bookings" },
                { label: "Become a Partner", href: "/partner/onboard/vehicle" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* SAFETY & SUPPORT */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-300">
              SAFETY & SUPPORT
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { label: "Safety Standards", href: "/safety" },
                { label: "Help & FAQs", href: "/faq" },
                { label: "Contact Us", href: "/contact" },
                { label: "Grievance Officer", href: "/grievance" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* LEGAL & COMPLIANCE */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-300">
              LEGAL & COMPLIANCE
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { label: "Privacy Policy (DPDP)", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Payment & Settlements", href: "/payment-terms" },
                { label: "Cancellation & Refund", href: "/cancellation-refund" },
                { label: "Driver Partner Agreement", href: "/partner-terms" },
                { label: "Cookie Policy", href: "/cookies" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* BOTTOM BAR */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col lg:flex-row justify-between items-center text-xs text-gray-500 gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
            <p>© {new Date().getFullYear()} RideNow Mobility Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <LanguageSelector variant="footer" />
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
            <Link href="/privacy" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              Terms & Conditions
            </Link>
            <Link href="/payment-terms" className="hover:text-white transition">
              Payment Terms
            </Link>
            <Link href="/cancellation-refund" className="hover:text-white transition">
              Refunds
            </Link>
            <Link href="/partner-terms" className="hover:text-white transition">
              Driver Terms
            </Link>
            <Link href="/cookies" className="hover:text-white transition">
              Cookies
            </Link>
            <Link href="/grievance" className="hover:text-white transition">
              Grievance Redressal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
