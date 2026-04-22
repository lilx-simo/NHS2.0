import AppLayout from "@/components/AppLayout";

export default function AuditLogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
