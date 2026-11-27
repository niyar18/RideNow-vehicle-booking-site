import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PublicHeading, PublicLink, PublicPage } from "@/shared/components/public/PublicPage";
import styles from "@/shared/components/public/public-page.module.css";
import { VEHICLE_OPTIONS } from "@/lib/vehicleConfig";

interface FleetCategory {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  capacity: string;
}

const FLEET_CATEGORIES: FleetCategory[] = [
  {
    id: "scooty",
    name: VEHICLE_OPTIONS.scooty.label,
    description: VEHICLE_OPTIONS.scooty.tagline,
    price: "Starting from ₹7/km",
    image: "/fleet/scooty.webp?v=photo-1",
    capacity: "1 Passenger",
  },
  {
    id: "bike",
    name: VEHICLE_OPTIONS.bike.label,
    description: VEHICLE_OPTIONS.bike.tagline,
    price: "Starting from ₹8/km",
    image: "/fleet/moto.webp?v=photo-1",
    capacity: "1 Passenger",
  },
  {
    id: "auto",
    name: VEHICLE_OPTIONS.auto.label,
    description: VEHICLE_OPTIONS.auto.tagline,
    price: "Starting from ₹11.5/km",
    image: "/fleet/auto.webp?v=photo-1",
    capacity: "3 Passengers",
  },
  {
    id: "e-rickshaw",
    name: VEHICLE_OPTIONS["e-rickshaw"].label,
    description: VEHICLE_OPTIONS["e-rickshaw"].tagline,
    price: "Starting from ₹8/km",
    image: "/fleet/e-rickshaw.webp?v=photo-1",
    capacity: "3 Passengers (Eco)",
  },
  {
    id: "mini",
    name: VEHICLE_OPTIONS.mini.label,
    description: VEHICLE_OPTIONS.mini.tagline,
    price: "Starting from ₹13.5/km",
    image: "/fleet/car-mini.webp?v=photo-1",
    capacity: "4 Passengers (AC)",
  },
  {
    id: "car",
    name: VEHICLE_OPTIONS.car.label,
    description: VEHICLE_OPTIONS.car.tagline,
    price: "Starting from ₹16.5/km",
    image: "/fleet/premier.webp?v=photo-1",
    capacity: "4 Passengers (Sedan)",
  },
  {
    id: "priority",
    name: VEHICLE_OPTIONS.priority.label,
    description: VEHICLE_OPTIONS.priority.tagline,
    price: "Starting from ₹21/km",
    image: "/fleet/suv.webp?v=photo-1",
    capacity: "6 Passengers (SUV)",
  },
  {
    id: "loading",
    name: VEHICLE_OPTIONS.loading.label,
    description: VEHICLE_OPTIONS.loading.tagline,
    price: "Starting from ₹20/km",
    image: "/fleet/express-mini.webp?v=photo-1",
    capacity: "Up to 500 kg Cargo",
  },
  {
    id: "truck",
    name: VEHICLE_OPTIONS.truck.label,
    description: VEHICLE_OPTIONS.truck.tagline,
    price: "Starting from ₹35/km",
    image: "/fleet/freight.webp?v=photo-1",
    capacity: "Up to 2,000 kg Freight",
  },
];

export default function FleetPage() {
  const passenger = FLEET_CATEGORIES.filter(({ id }) => id !== "truck" && id !== "loading");
  const cargo = FLEET_CATEGORIES.filter(({ id }) => id === "truck" || id === "loading");

  return (
    <PublicPage>
      <PublicHeading label="The Jaatri fleet" title="A ride for the road ahead." side={<PublicLink href="/book?fresh=true">Get a fare estimate</PublicLink>}>
        A toto for a short trip, an AC sedan for the airport, or a cargo vehicle for the next delivery. Pick what fits your journey.
      </PublicHeading>

      <div className="space-y-12 sm:space-y-18">
        <FleetGroup title="Passenger rides" caption="For quick errands, family rides and longer trips across Assam." variants={passenger} />
        <div>
          <FleetGroup title="Parcel & freight" caption="For furniture, merchant stock and larger loads." variants={cargo} />
          <div className="pt-4">
            <p className={styles.sectionNote}>
              Photos show example vehicles. The model you get may vary. <Link href="/photo-credits" className="underline underline-offset-2">Photo credits</Link>
            </p>
          </div>
        </div>
        <aside className={styles.callout} aria-label="Driver information">
          <div>
            <h2 className={styles.sectionTitle}>Drive with Jaatri.</h2>
            <p className={styles.sectionNote}>Have a passenger or cargo vehicle? See what you need to join as a driver partner.</p>
          </div>
          <PublicLink href="/partner/onboard/vehicle">Get started</PublicLink>
        </aside>
      </div>
    </PublicPage>
  );
}

function FleetGroup({ title, caption, variants }: { title: string; caption: string; variants: FleetCategory[] }) {
  return (
    <section aria-label={title}>
      <div className="mb-4 sm:mb-6">
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionNote}>{caption}</p>
      </div>
      <div className={styles.cardGrid}>
        {variants.map((option) => (
          <Link key={option.id} href={`/book?vehicle=${option.id}&fresh=true`} className={styles.card}>
            <div className={styles.cardImage}>
              <Image
                src={option.image}
                alt=""
                fill
                sizes="(max-width: 669px) 48vw, (max-width: 1250px) 31vw, 390px"
              />
            </div>
            <div className={styles.cardBody}>
              <p className={styles.number}>{option.capacity}</p>
              <h3 className={styles.cardName}>{option.name}</h3>
              <p className={styles.cardDescription}>{option.description}</p>
              <div className={styles.cardMeta}>
                <span>{option.price.replace("Starting from ", "From ")}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
