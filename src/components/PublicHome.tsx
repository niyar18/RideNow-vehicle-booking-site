"use client";

import { useState } from "react";
import HeroSection from "@/components/Herosection";
import VehicleCategoriesSlider from "@/components/VehicleCategoriesSlider";
import AuthModal from "@/components/AuthModal";

export default function PublicHome() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <HeroSection onAuthRequired={() => setAuthOpen(true)} />
      <VehicleCategoriesSlider />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
