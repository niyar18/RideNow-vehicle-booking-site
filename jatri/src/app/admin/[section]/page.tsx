import { notFound } from "next/navigation";
import { adminTools } from "@/features/admin/components/AdminShortcuts";
import { FareControls } from "@/features/admin/components/FareControls";
import { OperationsQueue, type QueueSection } from "@/features/admin/components/OperationsQueue";
import styles from "@/features/admin/components/admin-ui.module.css";

export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const tool = adminTools.find((item) => item.key === section);
  if (!tool) notFound();
  return <main id="admin-content" tabIndex={-1} className={styles.content}>
    <header className={styles.controlIntro}>
      <p className={styles.eyebrow}>Jaatri / Operations</p>
      <h1 className={styles.title}>{tool.title}</h1>
      <p className={styles.introText}>{tool.description}</p>
    </header>
    {section === "pricing" ? <FareControls /> : <OperationsQueue key={section} section={section as QueueSection} />}
  </main>;
}
