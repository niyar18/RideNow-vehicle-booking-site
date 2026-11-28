import { Clock, MapPin, Phone } from "lucide-react";
import { PublicHeading, PublicLink, PublicPage } from "@/shared/components/public/PublicPage";
import styles from "@/shared/components/public/public-page.module.css";

export default function ContactPage() {
  return (
    <PublicPage>
      <PublicHeading
        label="Help / Guwahati"
        title="Talk to Jaatri."
        side={<PublicLink href="/faq" muted>See common questions</PublicLink>}
      >
        Find your trip details and answers to common questions.
      </PublicHeading>

      <div className={styles.detailLayout}>
        <section className={styles.detailPanel} aria-labelledby="contact-compose">
          <h2 className={styles.sectionTitle} id="contact-compose">Help with a booking</h2>
          <p className={styles.sectionNote}>Open your bookings to find trip details and receipts. This page does not accept email requests.</p>
          <PublicLink href="/bookings">View my bookings</PublicLink>
        </section>

        <div>
          <section className={styles.detailPanel} aria-labelledby="contact-desk">
            <h2 className={styles.cardName} id="contact-desk">Guwahati support desk</h2>
            <ul className={styles.detailList}>
              <li><Phone size={18} aria-hidden="true" /><div><strong>Ride support</strong><p><a href="tel:+918005287466">+91 800-JATRI-NOW</a></p></div></li>
              <li><MapPin size={18} aria-hidden="true" /><div><strong>Operations centre</strong><p>GS Road, Christian Basti, Guwahati<br />Assam 781005, India</p></div></li>
            </ul>
          </section>
          <section className={styles.detailPanel} aria-labelledby="contact-hours">
            <h2 className={styles.cardName} id="contact-hours">Desk hours · IST</h2>
            <ul className={styles.detailList}>
              <li><Clock size={18} aria-hidden="true" /><div><strong>Driver onboarding</strong><p>Mon–Sat, 9 am to 6 pm</p></div></li>
              <li><Clock size={18} aria-hidden="true" /><div><strong>Grievance office</strong><p>Mon–Fri, 10 am to 5 pm</p></div></li>
            </ul>
          </section>
        </div>
      </div>
    </PublicPage>
  );
}
