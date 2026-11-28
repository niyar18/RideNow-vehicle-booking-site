"use client";

export default function SiteSkipLink() {
  return (
    <a
      className="jaatri-skip-link"
      href="#main-content"
      onClick={(event) => {
        const root = document.getElementById("main-content");
        const main = root && Array.from(root.querySelectorAll<HTMLElement>("main, [role='main']")).find((el) => el.getClientRects().length > 0);
        const fallback = root && Array.from(root.querySelectorAll<HTMLElement>("h1")).find((el) => el.getClientRects().length > 0);
        const target = main || fallback || root;
        if (!target) return;
        event.preventDefault();
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }}
    >
      Skip to content
    </a>
  );
}
