"use client";

import { motion } from "framer-motion";
import { Car, Zap, Shield, TrendingUp } from "lucide-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function FleetPage() {
  const features = [
    {
      icon: Car,
      title: "Diverse Vehicle Options",
      description: "Choose from bikes, cars, and trucks for every need",
    },
    {
      icon: Zap,
      title: "Quick Booking",
      description: "Reserve your vehicle in seconds with our easy-to-use platform",
    },
    {
      icon: Shield,
      title: "Safety First",
      description: "All vehicles are inspected and verified for your safety",
    },
    {
      icon: TrendingUp,
      title: "Affordable Rates",
      description: "Competitive pricing that fits your budget",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black text-white justify-between">
      <Nav />
      <div className="flex-1 pt-40">
        {/* Hero Section */}
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto px-4 mb-20"
      >
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Our Fleet
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl">
          Explore our wide range of vehicles designed to meet every transportation need. From bikes to trucks, we've got you covered.
        </p>
      </motion.div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition"
              >
                <Icon className="w-12 h-12 mb-4 text-white" />
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Vehicle Categories */}
      <div className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-4xl font-bold mb-12">Vehicle Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "Bikes",
              description: "Quick and efficient for solo travels",
              price: "Starting from $2/km",
            },
            {
              name: "Cars",
              description: "Comfortable rides for personal and family trips",
              price: "Starting from $4/km",
            },
            {
              name: "Trucks",
              description: "Heavy-duty vehicles for cargo and bulk transport",
              price: "Starting from $6/km",
            },
          ].map((category, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-8"
            >
              <h3 className="text-2xl font-bold mb-3">{category.name}</h3>
              <p className="text-gray-400 mb-4">{category.description}</p>
              <p className="text-white font-semibold">{category.price}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="max-w-6xl mx-auto px-4 py-20 text-center"
      >
        <h2 className="text-4xl font-bold mb-6">Ready to ride?</h2>
        <a
          href="/book"
          className="inline-block px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition"
        >
          Book Now
        </a>
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}
