"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, House, MapPin, Plane, Plus, Search } from "lucide-react";
import type { RootState } from "@/redux/store";
import { LocalizedText, useTranslation } from "@/context/LanguageContext";
import styles from "./mobile-home.module.css";

const destinations = [
  { id: "guwahati", name: "Guwahati", detail: "The city by the river", lat: 26.1445, lng: 91.7362 },
  { id: "shillong", name: "Shillong", detail: "A getaway in the hills", lat: 25.5788, lng: 91.8933 },
  { id: "kaziranga", name: "Kaziranga", detail: "A weekend in the wild", lat: 26.5775, lng: 93.1711 },
  { id: "majuli", name: "Majuli", detail: "Life on the river island", lat: 26.9602, lng: 94.1973 },
];
const services = [
  { key: "local", title: "Car rides", detail: "For everyday journeys", image: "/vehicle-art/mini.webp", link: "/book?category=cars&fresh=true" },
  { key: "outstation", title: "Outstation", detail: "Go beyond the city", image: "/vehicle-art/priority.webp", link: "/book?category=cars&service=outstation&fresh=true" },
  { key: "goods", title: "Parcel & cargo", detail: "Send something across town", image: "/vehicle-art/loading.webp", link: "/book?category=trucks&serviceMode=logistics&fresh=true" },
  { key: "schedule", title: "Scheduled rides", detail: "Choose your pickup time", image: "/vehicle-art/car.webp", link: "/book?reserve=true&fresh=true" },
];
const fleet = [
  { id: "scooty", key: "scooty", title: "Scooty" },
  { id: "bike", key: "bike", title: "Moto" },
  { id: "auto", key: "auto", title: "Auto" },
  { id: "e-rickshaw", key: "eRickshaw", title: "Toto" },
  { id: "mini", key: "mini", title: "Mini" },
  { id: "car", key: "car", title: "Premier" },
  { id: "priority", key: "priority", title: "XL Priority" },
  { id: "loading", key: "loading", title: "Express Mini" },
  { id: "truck", key: "truck", title: "Freight" },
];

const subscribe = () => () => {};
const getServerGreeting = () => "day";
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
};
const greetingText: Record<string, string> = { day: "Good day", morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" };

function bookingFor(address: string, lat?: number, lng?: number) {
  const params = new URLSearchParams({ drop: address, category: "cars", fresh: "true" });
  if (lat !== undefined && lng !== undefined) {
    params.set("dropLat", String(lat));
    params.set("dropLng", String(lng));
  }
  return `/book?${params.toString()}`;
}

export default function MobileHome() {
  const router = useRouter();
  const { t, textLanguage } = useTranslation();
  const { data: session } = useSession();
  const user = useSelector((state: RootState) => state.user.userData) || session?.user;
  const firstName = user?.name?.trim()?.split(/\s+/)[0];
  const greeting = useSyncExternalStore(subscribe, getGreeting, getServerGreeting);

  function goToSavedPlace(kind: "home" | "work") {
    try {
      const saved = JSON.parse(localStorage.getItem("jaatri_saved_places") || "[]");
      if (Array.isArray(saved)) {
        const match = saved.find((place) => {
          const label = String(place?.label ?? "").toLowerCase();
          return label.includes(kind) || (kind === "work" && label.includes("office"));
        });
        if (typeof match?.address === "string" && match.address.trim()) {
          router.push(bookingFor(match.address));
          return;
        }
      }
    } catch {}
    router.push("/settings");
  }

  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="mobile-home-title">
        <div className={styles.photo} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.greeting}>
            <div className={styles.eyebrow}><span className={styles.weave} aria-hidden="true" /><LocalizedText id="landing.mobileRegion" fallback="Explore Assam, your way" /></div>
            <h1 id="mobile-home-title"><LocalizedText id={`landing.greeting_${greeting}`} fallback={greetingText[greeting]} />{firstName && `, ${firstName}`}<br /><em><LocalizedText id="landing.mobileTitle" fallback="Ready to move?" /></em></h1>
          </div>
          <div className={styles.heroControls}>
            <Link href="/book?fresh=true" className={styles.search}>
              <Search size={20} aria-hidden />
              <span><LocalizedText id="landing.mobileSearch" fallback="Where are you going?" /></span>
              <span className={styles.searchArrow}><ArrowRight size={21} aria-hidden /></span>
            </Link>
            <div className={styles.shortcuts} role="group" aria-label={t("landing.shortcuts", "Quick destinations")}>
              <button type="button" onClick={() => goToSavedPlace("home")}><House size={16} aria-hidden /><LocalizedText id="landing.home" fallback="Home" /></button>
              <button type="button" onClick={() => goToSavedPlace("work")}><BriefcaseBusiness size={16} aria-hidden /><LocalizedText id="landing.work" fallback="Work" /></button>
              <Link href={bookingFor("Lokpriya Gopinath Bordoloi International Airport, Guwahati", 26.1061, 91.5859)}><Plane size={16} aria-hidden /><LocalizedText id="landing.airport" fallback="Airport" /></Link>
              <Link href="/settings"><Plus size={17} aria-hidden /><LocalizedText id="landing.addPlace" fallback="Add" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mobile-services-title">
        <div className={styles.sectionTitle}><h2 id="mobile-services-title"><LocalizedText id="landing.services" fallback="Ways to travel" /></h2></div>
        <div className={styles.serviceGrid}>
          {services.map(({ key, title, detail, image, link }) => (
            <Link className={styles.serviceCard} href={link} key={key}>
              <div className={styles.serviceImage}><Image src={image} alt="" fill sizes="(max-width: 520px) 48vw, 245px" className={styles.vehicleArt} /></div>
              <div className={styles.serviceText}>
                <div><h3><LocalizedText id={`landing.${key}Title`} fallback={title} /></h3><p><LocalizedText id={`landing.${key}Detail`} fallback={detail} /></p></div>
                <ArrowUpRight size={16} aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mobile-destinations-title">
        <div className={styles.sectionTitle}>
          <h2 id="mobile-destinations-title"><LocalizedText id="landing.mobileDestinations" fallback="Popular destinations" /></h2>
          <Link href="/explore"><LocalizedText id="landing.mobileSeeAll" fallback="See all" /> <ArrowRight size={15} aria-hidden /></Link>
        </div>
        <div className={styles.track}>
          {destinations.map((destination) => (
            <Link key={destination.id} href={bookingFor(destination.name, destination.lat, destination.lng)} className={styles.destination}>
              <div className={styles.destinationImage}>
                <Image src={`/mobile-home/dest_${destination.id}.webp?v=photo-1`} alt="" fill sizes="152px" className={styles.cover} />
              </div>
              <div className={styles.destinationLabel}>
                <span><MapPin size={14} aria-hidden /><strong><LocalizedText id={`landing.${destination.id}`} fallback={destination.name} /></strong></span>
                <span><LocalizedText id={`landing.${destination.id}Detail`} fallback={destination.detail} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mobile-fleet-title">
        <div className={styles.sectionTitle}>
          <h2 id="mobile-fleet-title"><LocalizedText id="landing.mobileFleet" fallback="Meet the fleet" /></h2>
          <Link href="/fleet"><LocalizedText id="landing.mobileSeeAll" fallback="See all" /> <ArrowRight size={15} aria-hidden /></Link>
        </div>
        <div className={styles.track}>
          {fleet.map(({ id, key, title }) => (
            <Link key={id} className={styles.vehicle} href={`/book?vehicle=${id}&fresh=true`}>
              <div className={styles.vehicleImage}><Image src={`/vehicle-art/${id}.webp`} alt="" fill sizes="133px" className={styles.vehicleArt} /></div>
              <span><LocalizedText id={`fleet.${key}`} fallback={title} /><ArrowUpRight size={13} aria-hidden /></span>
            </Link>
          ))}
        </div>
        <p className={styles.representative}><LocalizedText id="landing.vehicleIllustrations" fallback="Illustrations show vehicle types, not exact models." /></p>
      </section>
      <div className={styles.partner}>
        <div><strong><LocalizedText id="landing.driverTitle" fallback="Drive on roads you know." /></strong><p><LocalizedText id="landing.driverLabel" fallback="For drivers" /></p></div>
        <Link href="/partner/onboard/vehicle" lang={textLanguage("landing.drive")} aria-label={t("landing.drive", "Drive with Jaatri")}><ArrowUpRight size={22} aria-hidden /></Link>
      </div>
    </div>
  );
}
