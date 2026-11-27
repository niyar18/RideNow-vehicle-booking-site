"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BriefcaseBusiness, CalendarDays, CarFront, Home, MapPin, Package, Plane, Route, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import LandingBooking from "./Herosection";
import MobileHome from "./MobileHome";
import styles from "./landing.module.css";

const services = [
  { key: "local", title: "Everyday rides", detail: "Autos, bikes and cabs", href: "/book?category=cars", Icon: CarFront },
  { key: "outstation", title: "Outstation", detail: "Go beyond the city", href: "/book?category=cars&service=outstation", Icon: Route },
  { key: "schedule", title: "Scheduled rides", detail: "Pick a time that suits you", href: "/book?reserve=true", Icon: CalendarDays },
  { key: "goods", title: "Parcel & cargo", detail: "Send something across town", href: "/book?category=trucks&serviceMode=logistics", Icon: Package },
];

const destinations = [
  { name: "Guwahati", id: "guwahati", detail: "The city by the river", lat: 26.1445, lng: 91.7362 },
  { name: "Kaziranga", id: "kaziranga", detail: "A weekend in the wild", lat: 26.5775, lng: 93.1711 },
  { name: "Majuli", id: "majuli", detail: "Life on the river island", lat: 26.9602, lng: 94.1973 },
  { name: "Shillong", id: "shillong", detail: "A getaway in the hills", lat: 25.5788, lng: 91.8933 },
];

function Weave({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 94 18" fill="none" aria-hidden="true">
    <path d="M0 2h94M0 16h94M2 9h8m8 0h6m9 0h6m16 0h6m9 0h6m8 0h8" stroke="currentColor" strokeWidth="1.2" />
    <path d="m10 9 4-4 4 4-4 4zm14 0 4-4 5 4-5 4zm15 0 8-6 8 6-8 6zm22 0 5-4 4 4-4 4zm15 0 4-4 4 4-4 4z" stroke="currentColor" strokeWidth="1.1" />
  </svg>;
}

function toBooking(drop: string, lat?: number, lng?: number) {
  const params = new URLSearchParams({ drop, category: "cars" });
  if (lat !== undefined && lng !== undefined) {
    params.set("dropLat", String(lat));
    params.set("dropLng", String(lng));
  }
  return `/book?${params.toString()}`;
}

export default function PublicHome() {
  const { t } = useTranslation();
  const router = useRouter();

  function goToSavedPlace(type: "home" | "work") {
    try {
      const stored = JSON.parse(localStorage.getItem("jaatri_saved_places") || "[]");
      if (Array.isArray(stored)) {
        const place = stored.find((item) => {
          const label = String(item?.label ?? "").toLowerCase();
          return label.includes(type) || (type === "work" && label.includes("office"));
        });
        if (typeof place?.address === "string" && place.address.trim()) {
          router.push(toBooking(place.address));
          return;
        }
      }
    } catch {}
    router.push("/settings");
  }

  return (
    <main>
      <div className="md:hidden"><MobileHome /></div>
      <div className={`hidden md:block ${styles.landing}`}>
      <section className={styles.hero} aria-labelledby="jaatri-home-title">
        <div className={styles.heroContent}>
          <p className={styles.kicker}><Weave />{t("landing.region", "From Assam, for the way we travel")}</p>
          <h1 id="jaatri-home-title">{t("landing.titleFirst", "Familiar roads.")}<br /><span>{t("landing.titleSecond", "New journeys.")}</span></h1>
          <p className={styles.intro}>{t("landing.intro", "A ride to the station, a weekend in the hills, or a parcel across town. Start wherever you are.")}</p>
          <LandingBooking />
          <div className={styles.shortcuts} aria-label={t("landing.shortcuts", "Quick destinations")}>
            <button type="button" onClick={() => goToSavedPlace("home")}><Home size={15} aria-hidden />{t("landing.home", "Home")}</button>
            <button type="button" onClick={() => goToSavedPlace("work")}><BriefcaseBusiness size={15} aria-hidden />{t("landing.work", "Work")}</button>
            <Link href={toBooking("Lokpriya Gopinath Bordoloi International Airport, Guwahati", 26.1061, 91.5859)}><Plane size={15} aria-hidden />{t("landing.airport", "Airport")}</Link>
          </div>
        </div>
        <figure className={styles.heroArt}>
          <div className={styles.artImage}>
            <Image src="/hero/brahmaputra-at-dusk-desktop.webp" fill alt="" fetchPriority="high" sizes="(max-width: 767px) 1px, 50vw" className={styles.cover} />
            <div className={styles.artStamp} lang="as">নমস্কাৰ</div>
          </div>
          <figcaption>
            <span><MapPin size={16} aria-hidden />{t("landing.heroLocation", "Lachit Ghat, Guwahati")}</span>
            <small>{t("landing.assam", "Assam, India")}</small>
          </figcaption>
        </figure>
      </section>

      <section className={styles.services} aria-labelledby="jaatri-ways-title">
        <div className={styles.sectionHead}>
          <div><p className={styles.eyebrow}>{t("landing.services", "Ways to travel")}</p><h2 id="jaatri-ways-title">{t("landing.servicesTitle", "A ride for every kind of day.")}</h2></div>
          <Link className={styles.textLink} href="/fleet">{t("landing.seeFleet", "See the fleet")} <ArrowRight size={16} aria-hidden /></Link>
        </div>
        <div className={styles.serviceGrid}>
          {services.map(({ key, title, detail, href, Icon }) => (
            <Link href={href} key={key} className={styles.service}>
              <Icon className={styles.serviceIcon} size={25} strokeWidth={1.55} aria-hidden />
              <div><h3>{t(`landing.${key}Title`, title)}</h3><p>{t(`landing.${key}Detail`, detail)}</p></div>
              <ArrowUpRight className={styles.serviceArrow} size={19} aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.destinations} aria-labelledby="jaatri-destination-title">
        <div className={styles.sectionHead}>
          <div><p className={styles.eyebrow}>{t("landing.destinations", "Closer than you think")}</p><h2 id="jaatri-destination-title">{t("landing.destinationsTitle", "Take the long way home.")}</h2></div>
          <Link className={styles.textLink} href="/explore">{t("landing.explore", "Explore with Jaatri")} <ArrowRight size={16} aria-hidden /></Link>
        </div>
        <div className={styles.destinationGrid}>
          {destinations.map((destination) => (
            <Link className={styles.destination} key={destination.id} href={toBooking(destination.name, destination.lat, destination.lng)}>
              <div className={styles.destinationImage}><Image src={`/mobile-home/dest_${destination.id}.webp?v=photo-1`} alt="" fill sizes="(max-width: 760px) 45vw, 25vw" className={styles.cover} /></div>
              <div className={styles.destinationLabel}>
                <div><h3>{t(`landing.${destination.id}`, destination.name)}</h3><p>{t(`landing.${destination.id}Detail`, destination.detail)}</p></div>
                <ArrowUpRight size={18} aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.partnerGroup} aria-label={t("landing.community", "Our community")}>
        <div className={styles.partner}>
          <Weave className={styles.partnerWeave} />
          <p className={styles.eyebrow}>{t("landing.driverLabel", "For drivers")}</p>
          <h2>{t("landing.driverTitle", "Drive on roads you know.")}</h2>
          <p>{t("landing.driverDetail", "Join Jaatri as a driver partner and choose when you work.")}</p>
          <Link href="/partner/onboard/vehicle" className={styles.partnerLink}>{t("landing.drive", "Drive with Jaatri")} <ArrowUpRight size={18} aria-hidden /></Link>
        </div>
        <div className={styles.safety}>
          <ShieldCheck size={29} strokeWidth={1.6} aria-hidden />
          <h2>{t("landing.safetyTitle", "Look out for each other.")}</h2>
          <p>{t("landing.safetyDetail", "See how driver verification, trip sharing and pickup PINs work.")}</p>
          <Link href="/safety" className={styles.textLink}>{t("landing.safety", "Ride safety")} <ArrowDownRight size={17} aria-hidden /></Link>
        </div>
      </section>
      </div>
    </main>
  );
}
