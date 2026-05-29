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

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white">
      {/* TOP SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto px-6 py-16"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* BRAND */}
          <div>
            <h2 className="text-2xl font-bold tracking-wide">RideNow</h2>
            <p className="mt-4 text-gray-400 text-sm leading-relaxed">
              Book any vehicle — from bikes to trucks.  
              Trusted owners. Transparent pricing.
            </p>

            {/* SOCIAL */}
            <div className="flex gap-4 mt-6">
              {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
                <motion.a
                  key={i}
                  whileHover={{ y: -3 }}
                  href="#"
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-white/20 hover:bg-white hover:text-black transition"
                >
                  <Icon size={18} />
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
              {["About", "Careers", "Blog", "Contact"].map((item) => (
                <li key={item}>
                  <Link
                    href="/"
                    className="text-gray-400 hover:text-white transition"
                  >
                    {item}
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
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Bike Rental",
                "Car Rental",
                "SUV & Van",
                "Truck Booking",
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="/"
                    className="text-gray-400 hover:text-white transition"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* NEWSLETTER */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-300">
              STAY UPDATED
            </h3>
            <p className="mt-4 text-gray-400 text-sm">
              Subscribe for updates & offers.
            </p>

            <div className="mt-4 flex">
              <input
                type="email"
                placeholder="Enter email"
                className="flex-1 bg-black border border-white/20 rounded-l-lg px-4 py-2 text-sm text-white focus:outline-none"
              />
              <button className="px-4 py-2 bg-white text-black rounded-r-lg hover:bg-gray-200 transition">
                <Mail size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* BOTTOM BAR */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} RideNow. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-white transition">
              Terms
            </Link>
            <Link href="/" className="hover:text-white transition">
              Legal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
