"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "ridenow_cookie_consent_v1";
const button = "min-h-11 rounded-md border border-[var(--border-interactive)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-subtle)]";

export default function CookieConsent() {
  const title = useId();
  const choices = useId();
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Still offer the choice during this visit when persistent storage is unavailable.
      setVisible(true);
    }
  }, []);

  function save(nextAnalytics: boolean, nextMarketing: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        necessary: true, analytics: nextAnalytics, marketing: nextMarketing, timestamp: Date.now(),
      }));
    } catch {}
    setVisible(false);
    document.querySelector<HTMLAnchorElement>(".jaatri-skip-link")?.focus({ preventScroll: true });
  }

  if (!visible) return null;
  return (
    <section aria-labelledby={title} className="relative z-20 mx-auto mb-3 mt-[6.5rem] w-[calc(100%-1.5rem)] max-w-[70rem] rounded-xl border border-[var(--border-interactive)] bg-[var(--surface-raised)] p-4 text-[var(--text-primary)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-prose">
          <h2 id={title} className="font-bold">Cookie preferences</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Essential storage keeps booking and sign-in working. Optional storage helps measure performance and remember preferences.{" "}
            <Link href="/privacy" className="inline-flex min-h-6 items-center underline underline-offset-2">Privacy policy</Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={button} onClick={() => save(false, false)}>Essential only</button>
          <button type="button" className={button} onClick={() => save(true, true)}>Accept all</button>
          <button type="button" className={button} aria-expanded={customize} aria-controls={choices} onClick={() => setCustomize((value) => !value)}>Customize settings</button>
        </div>
      </div>
      <div id={choices} hidden={!customize} className="mt-4 border-t border-[var(--border-default)] pt-3">
        <fieldset>
          <legend className="text-sm font-semibold">Optional cookies and storage</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="size-5 shrink-0" />
            Performance and telemetry
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} className="size-5 shrink-0" />
            Personalization and saved places
          </label>
        </fieldset>
        <button type="button" className={button} onClick={() => save(analytics, marketing)}>Save choice</button>
      </div>
    </section>
  );
}
