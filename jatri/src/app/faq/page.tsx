import { ChevronDown } from "lucide-react";
import { PublicHeading, PublicLink, PublicPage } from "@/shared/components/public/PublicPage";
import styles from "@/shared/components/public/public-page.module.css";

const faqs = [
  {
    q: "How do I book a ride on Jaatri?",
    a: "Visit the Ride / Book page, enter your pickup and drop locations using our Assam-wide autocomplete, select your desired vehicle category (from Scooty to Car Premier or Cargo Freight), and confirm your booking. Upfront fares and driver distance are displayed transparently before confirmation.",
  },
  {
    q: "What payment methods are supported?",
    a: "Jaatri supports UPI (Google Pay, PhonePe, Paytm), credit/debit cards, net banking, Cash on Trip completion, and your integrated Jaatri digital wallet.",
  },
  {
    q: "How does Jaatri ensure passenger safety?",
    a: "All driver partners undergo strict background checks, vehicle commercial registration vetting, and valid licensing checks. For immediate help, call 112 directly. Jaatri’s in-app SOS records a safety incident; it does not call emergency services or notify emergency contacts.",
  },
  {
    q: "What is Jaatri's cancellation policy?",
    a: "You may cancel free of charge before a driver partner has commenced moving towards your pickup point. If cancelled after driver arrival or significant en-route movement, a nominal compensation fee goes directly to the driver partner to cover fuel expenditure.",
  },
  {
    q: "How are trip fares calculated?",
    a: "Fares are calculated strictly based on upfront distance (in km), estimated duration, vehicle category base fare, and applicable statutory highway tolls. Jaatri eliminates opaque surge pricing algorithms to maintain honest fares for riders and drivers.",
  },
  {
    q: "How can vehicle owners and drivers partner with Jaatri?",
    a: "Navigate to 'Drive with Jaatri' or /partner/onboard. Submit your vehicle registration (RC), commercial permit, driving license, and bank account for direct daily payouts. Our verification team approves profiles within 24 to 48 hours.",
  },
  {
    q: "What should I do if I forget an item in a Jaatri vehicle?",
    a: "If your completed ride screen is still open, select ‘Report Safety Concern or Lost Item’ to file an in-app report. You can also find your trip details in Bookings. Do not send your booking reference to an unverified email address.",
  },
  {
    q: "Can I book cargo or logistics vehicles for freight?",
    a: "Yes! Jaatri includes dedicated logistics categories including Cargo Mini (Loading) for goods up to 500 kg and Heavy Freight (Truck) for commercial loads up to 2,000 kg across Assam.",
  },
];

export default function FAQPage() {
  return (
    <PublicPage>
      <PublicHeading label="Help / FAQs" title="Good to know.">
        Answers on booking a ride, paying for it, and driving with Jaatri.
      </PublicHeading>
      <div className={styles.detailLayout}>
        <div className={styles.faqList} aria-label="Common questions">
          {faqs.map(({ q, a }, index) => (
            <details key={q} name="faq" open={index === 0 ? true : undefined} className={styles.faqItem}>
              <summary>{q}<ChevronDown size={19} aria-hidden="true" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <aside className={styles.detailPanel} aria-labelledby="faq-help">
          <p className={styles.kicker}>Jaatri Care</p>
          <h2 className={`${styles.sectionTitle} mt-2`} id="faq-help">Still need a hand?</h2>
          <p className={styles.sectionNote}>Our Guwahati desk can help with your booking and account questions.</p>
          <div className={`${styles.calloutActions} mt-3`}>
            <PublicLink href="/contact">Contact support</PublicLink>
            <PublicLink href="/safety" muted>Ride safety</PublicLink>
          </div>
        </aside>
      </div>
    </PublicPage>
  );
}

export const metadata = { title: "Frequently asked questions" };
