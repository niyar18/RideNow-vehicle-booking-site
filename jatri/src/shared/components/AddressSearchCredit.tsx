export function AddressSearchCredit({ geoapify }: { geoapify: boolean }) {
  const linkClass = "inline-flex min-h-6 items-center underline underline-offset-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <div className="flex flex-wrap items-center gap-x-2 px-2 py-1 border-t border-[var(--border-default)] text-xs text-[var(--text-secondary)]" aria-label="Address data credits" role="group">
      <a className={linkClass} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>
      {geoapify && <a className={linkClass} href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Powered by Geoapify</a>}
    </div>
  );
}
