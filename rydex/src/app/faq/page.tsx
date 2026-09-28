"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "How do I book a ride?",
      a: "Simply visit our Book page, select your pickup and dropoff locations, choose your vehicle category, and confirm. Payment can be made via card, wallet, or cash.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept all major credit/debit cards, digital wallets, and cash payments. You can also link your bank account for online transfers.",
    },
    {
      q: "Is it safe to use RideNow?",
      a: "Yes, safety is our top priority. All drivers undergo background verification, vehicles are regularly inspected, and you can track your ride in real-time.",
    },
    {
      q: "Can I cancel my booking?",
      a: "Yes, you can cancel free of charge if the driver hasn't started moving. After that, standard cancellation charges apply.",
    },
    {
      q: "Do you offer corporate packages?",
      a: "Yes, we offer customized corporate packages with special pricing. Contact our business team for more details.",
    },
    {
      q: "How can I become a partner/driver?",
      a: "Visit the partner onboarding page and complete the verification process. You'll need valid documents and your vehicle to get started.",
    },
    {
      q: "What if I left something in the vehicle?",
      a: "Contact our support team immediately with your booking details. We'll help you connect with the driver to recover your item.",
    },
    {
      q: "How are fares calculated?",
      a: "Fares are based on distance, time, and vehicle category. You'll see the estimated fare before confirming your booking.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black text-white justify-between">
      <Nav />
      <div className="flex-1 pt-40 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto px-4"
        >
        <h1 className="text-5xl font-bold mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-gray-400 mb-12">
          Find answers to common questions about RideNow services.
        </p>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 transition cursor-pointer select-none"
              >
                <h3 className="text-left text-lg font-semibold">{faq.q}</h3>
                <motion.div
                  animate={{ rotate: openIdx === idx ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={24} />
                </motion.div>
              </button>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: openIdx === idx ? "auto" : 0,
                  opacity: openIdx === idx ? 1 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="p-6 text-gray-400 bg-black border-t border-white/10">
                  {faq.a}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 p-8 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl text-center"
        >
          <h3 className="text-2xl font-bold mb-4">Still need help?</h3>
          <p className="text-gray-400 mb-6">
            Can't find the answer you're looking for? Our support team is here to help.
          </p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition"
          >
            Contact Us
          </a>
        </motion.div>
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}
