export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminChrome from "@/features/admin/components/AdminChrome";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/");
  }

  return <AdminChrome>{children}</AdminChrome>;
}
