import AppLayout from "@/components/AppLayout";

export default function TimetableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
