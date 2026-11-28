import type { ReactNode } from "react";

export const metadata = { title: "Your profile" };

export default function PageLayout({ children }: { children: ReactNode }) {
  return children;
}
