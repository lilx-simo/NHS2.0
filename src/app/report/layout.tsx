import AppLayout from "@/components/AppLayout";

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
