"use client";

import { RootState } from "@/redux/store";
import { motion } from "framer-motion";
import { Bike, Car, Bus, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Image from "next/image";
import { useTranslation } from "@/context/LanguageContext";

export default function HeroSection({
  onAuthRequired,
}: {
  onAuthRequired: () => void;
}) {
  const { t } = useTranslation();
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
      <Image
        src="/heroImage.webp"
        alt="RideNow Fleet Background"
        fill
        priority
        quality={80}
        sizes="100vw"
        className="object-cover object-center pointer-events-none"
      />
      <div className="absolute inset-0 bg-black/80" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-white font-extrabold text-4xl sm:text-5xl md:text-7xl"
        >
          {t("hero.bookAnyVehicle", "Book Any Vehicle")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 max-w-xl text-gray-300"
        >
          {t("hero.subtitleFull", "From daily rides to heavy transport — all in one platform.")}
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

        <button
          onClick={handleBookNow}
          className="mt-10 px-8 py-3.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl font-bold text-base transition active:scale-98"
        >
          {t("hero.bookARide", "Book a Ride")}
        </button>
      </div>
    </section>
  );
}
