"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, House, MapPin, Plane, Plus, Search } from "lucide-react";
import type { RootState } from "@/redux/store";
import { useTranslation } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import styles from "./mobile-home.module.css";

const destinations = [
  { id: "guwahati", name: "Guwahati", detail: "The city by the river", lat: 26.1445, lng: 91.7362 },
  { id: "shillong", name: "Shillong", detail: "A getaway in the hills", lat: 25.5788, lng: 91.8933 },
  { id: "kaziranga", name: "Kaziranga", detail: "A weekend in the wild", lat: 26.5775, lng: 93.1711 },
  { id: "majuli", name: "Majuli", detail: "Life on the river island", lat: 26.9602, lng: 94.1973 },
];
const services = [
  { key: "local", title: "Car rides", detail: "For everyday journeys", image: "/fleet/car-mini.webp?v=photo-1", link: "/book?category=cars&fresh=true" },
  { key: "outstation", title: "Outstation", detail: "Go beyond the city", image: "/fleet/suv.webp?v=photo-1", link: "/book?category=cars&service=outstation&fresh=true" },
  { key: "goods", title: "Parcel & cargo", detail: "Send something across town", image: "/fleet/express-mini.webp?v=photo-1", link: "/book?category=trucks&serviceMode=logistics&fresh=true" },
  { key: "schedule", title: "Scheduled rides", detail: "Choose your pickup time", image: "/fleet/premier.webp?v=photo-1", link: "/book?reserve=true&fresh=true" },
];
const fleet = [
  { id: "scooty", key: "scooty", title: "Scooty", asset: "scooty" },
  { id: "bike", key: "bike", title: "Moto", asset: "moto" },
  { id: "auto", key: "auto", title: "Auto", asset: "auto" },
  { id: "e-rickshaw", key: "eRickshaw", title: "Toto", asset: "e-rickshaw" },
  { id: "mini", key: "mini", title: "Mini", asset: "car-mini" },
  { id: "car", key: "car", title: "Premier", asset: "premier" },
  { id: "priority", key: "priority", title: "XL Priority", asset: "suv" },
  { id: "loading", key: "loading", title: "Express Mini", asset: "express-mini" },
  { id: "truck", key: "truck", title: "Freight", asset: "freight" },
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
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
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
        <div className={styles.photo} aria-hidden="true">
          <Image src={resolvedTheme === "dark" ? "/mobile-home/hero_landscape_dark.webp?v=photo-1" : "/mobile-home/hero_landscape.webp?v=photo-1"} fill alt="" sizes="(max-width: 767px) 100vw, 1px" fetchPriority="high" className={styles.cover} />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.greeting}>
            <div className={styles.eyebrow}><span className={styles.weave} aria-hidden="true" />{t("landing.mobileRegion", "Explore Assam, your way")}</div>
            <h1 id="mobile-home-title">{t(`landing.greeting_${greeting}`, greetingText[greeting])}{firstName && `, ${firstName}`}<br /><em>{t("landing.mobileTitle", "Ready to move?")}</em></h1>
          </div>
          <div className={styles.heroControls}>
            <Link href="/book?fresh=true" className={styles.search}>
              <Search size={20} aria-hidden />
              <span>{t("landing.mobileSearch", "Where are you going?")}</span>
              <span className={styles.searchArrow}><ArrowRight size={21} aria-hidden /></span>
            </Link>
            <div className={styles.shortcuts} aria-label={t("landing.shortcuts", "Quick destinations")}>
              <button type="button" onClick={() => goToSavedPlace("home")}><House size={16} aria-hidden />{t("landing.home", "Home")}</button>
              <button type="button" onClick={() => goToSavedPlace("work")}><BriefcaseBusiness size={16} aria-hidden />{t("landing.work", "Work")}</button>
              <Link href={bookingFor("Lokpriya Gopinath Bordoloi International Airport, Guwahati", 26.1061, 91.5859)}><Plane size={16} aria-hidden />{t("landing.airport", "Airport")}</Link>
              <Link href="/settings"><Plus size={17} aria-hidden />{t("landing.addPlace", "Add")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mobile-services-title">
        <div className={styles.sectionTitle}><h2 id="mobile-services-title">{t("landing.services", "Ways to travel")}</h2></div>
        <div className={styles.serviceGrid}>
          {services.map(({ key, title, detail, image, link }) => (
            <Link className={styles.serviceCard} href={link} key={key}>
              <div className={styles.serviceImage}><Image src={image} alt="" fill sizes="(max-width: 520px) 48vw, 245px" className={styles.cover} /></div>
              <div className={styles.serviceText}>
                <div><h3>{t(`landing.${key}Title`, title)}</h3><p>{t(`landing.${key}Detail`, detail)}</p></div>
                <ArrowUpRight size={16} aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mobile-destinations-title">
        <div className={styles.sectionTitle}>
          <h2 id="mobile-destinations-title">{t("landing.mobileDestinations", "Popular destinations")}</h2>
          <Link href="/explore">{t("landing.mobileSeeAll", "See all")} <ArrowRight size={15} aria-hidden /></Link>
        </div>
        <div className={styles.track}>
          {destinations.map((destination) => (
            <Link key={destination.id} href={bookingFor(destination.name, destination.lat, destination.lng)} className={styles.destination}>
              <div className={styles.destinationImage}>
                <Image src={`/mobile-home/dest_${destination.id}.webp?v=photo-1`} alt="" fill sizes="152px" className={styles.cover} />
              </div>
              <div className={styles.destinationLabel}>
                <span><MapPin size={14} aria-hidden /><strong>{t(`landing.${destination.id}`, destination.name)}</strong></span>
                <span>{t(`landing.${destination.id}Detail`, destination.detail)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="mobile-fleet-title">
        <div className={styles.sectionTitle}>
          <h2 id="mobile-fleet-title">{t("landing.mobileFleet", "Meet the fleet")}</h2>
          <Link href="/fleet">{t("landing.mobileSeeAll", "See all")} <ArrowRight size={15} aria-hidden /></Link>
        </div>
        <div className={styles.track}>
          {fleet.map(({ id, key, title, asset }) => (
            <Link key={id} className={styles.vehicle} href={`/book?vehicle=${id}&fresh=true`}>
              <div className={styles.vehicleImage}><Image src={`/fleet/${asset}.webp?v=photo-1`} alt="" fill sizes="133px" className={styles.cover} /></div>
              <span>{t(`fleet.${key}`, title)}<ArrowUpRight size={13} aria-hidden /></span>
            </Link>
          ))}
        </div>
        <p className={styles.representative}>{t("landing.photoExamples", "Photos show example vehicles.")}</p>
      </section>
      <div className={styles.partner}>
        <div><strong>{t("landing.driverTitle", "Drive on roads you know.")}</strong><p>{t("landing.driverLabel", "For drivers")}</p></div>
        <Link href="/partner/onboard/vehicle" aria-label={t("landing.drive", "Drive with Jaatri")}><ArrowUpRight size={22} aria-hidden /></Link>
      </div>
    </div>
  );
}
