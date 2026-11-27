"use client";

import { type FormEvent, useState } from "react";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { PublicHeading, PublicLink, PublicPage } from "@/shared/components/public/PublicPage";
import styles from "@/shared/components/public/public-page.module.css";

const supportEmail = "support@ridenow.com";

export default function ContactPage() {
  const [prepared, setPrepared] = useState(false);

  function openEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const reply = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const body = [message, "", name, reply].join("\n");
    setPrepared(true);
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <PublicPage>
      <PublicHeading
        label="Help / Guwahati"
        title="Talk to Jaatri."
        side={<PublicLink href="/faq" muted>See common questions</PublicLink>}
      >
        Get help with a ride, a booking, or joining as a driver. If you’re writing about a trip, include your booking reference.
      </PublicHeading>

      <div className={styles.detailLayout}>
        <section className={styles.detailPanel} aria-labelledby="contact-compose">
          <h2 className={styles.sectionTitle} id="contact-compose">Write to us</h2>
          <p className={styles.sectionNote}>We’ll open your email app with your message ready to review and send.</p>
          <form className={styles.contactForm} onSubmit={openEmail}>
            <div className={styles.inputGrid}>
              <div>
                <label htmlFor="contact-name">Your name</label>
                <input id="contact-name" name="name" autoComplete="name" required maxLength={120} />
              </div>
              <div>
                <label htmlFor="contact-email">Email address</label>
                <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} />
              </div>
            </div>
            <div>
              <label htmlFor="contact-subject">What do you need help with?</label>
              <input id="contact-subject" name="subject" placeholder="For example, a missing item" required maxLength={150} />
            </div>
            <div>
              <label htmlFor="contact-message">Message</label>
              <textarea id="contact-message" name="message" rows={5} required maxLength={1800} placeholder="Tell us what happened." />
            </div>
            <button type="submit" className={styles.action}>Open email draft <ArrowUpRight size={16} aria-hidden="true" /></button>
            {prepared && <p role="status" className={styles.formStatus}>If your email app didn’t open, write directly to <a className="underline underline-offset-2" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>}
          </form>
        </section>

        <div>
          <section className={styles.detailPanel} aria-labelledby="contact-desk">
            <h2 className={styles.cardName} id="contact-desk">Guwahati support desk</h2>
            <ul className={styles.detailList}>
              <li><Phone size={18} aria-hidden="true" /><div><strong>Ride support</strong><p><a href="tel:+918005287466">+91 800-JATRI-NOW</a></p></div></li>
              <li><Mail size={18} aria-hidden="true" /><div><strong>Email support</strong><p><a href={`mailto:${supportEmail}`}>{supportEmail}</a></p></div></li>
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
