"use client";

import { RootState } from "@/redux/store";
import { motion } from "framer-motion";
import { Bike, Car, Bus, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

export default function HeroSection({
  onAuthRequired,
}: {
  onAuthRequired: () => void;
}) {
  const router = useRouter();
  const { userData } = useSelector(
    (state: RootState) => state.user
  );

  const handleBookNow = () => {
    if (!userData) {
      // ❌ NOT LOGGED IN
      onAuthRequired();
      return;
    }

    // ✅ LOGGED IN
    router.push("/book");
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/heroImage.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/80" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-white font-extrabold text-4xl sm:text-5xl md:text-7xl"
        >
          Book Any Vehicle
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 max-w-xl text-gray-300"
        >
          From daily rides to heavy transport — all in one platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-8 flex gap-8 text-gray-300"
        >
          <Bike size={30} />
          <Car size={30} />
          <Bus size={30} />
          <Truck size={30} />
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleBookNow}
          className="
            mt-12 px-10 py-4
            bg-white text-black
            rounded-full font-semibold
            shadow-xl
          "
        >
          Book Now
        </motion.button>
      </div>
    </section>
  );
}
