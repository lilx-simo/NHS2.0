"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Dash Board", href: "/dashboard" },
  { label: "Capacity Planner", href: "/capacity-planner" },
  { label: "Time Table", href: "/timetable" },
  { label: "Additional Sessions", href: "/additional-sessions" },
  { label: "Report", href: "/report" },
  { label: "Audit Log", href: "/audit-log" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen bg-nhs-light-blue">
      {/* NHS Header Bar */}
      <header className="w-full h-[72px] bg-nhs-blue flex items-center px-[66px] shrink-0">
        <Image
          src="/nhs-logo.png"
          alt="NHS Logo"
          width={71}
          height={50}
          priority
        />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[200px] bg-white shrink-0 flex flex-col justify-between overflow-y-auto">
          <nav className="flex flex-col">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-center h-[93px]"
                >
                  <span
                    className={`flex items-center justify-center h-[50px] w-[150px] rounded-[10px] text-[14px] ${
                      isActive
                        ? "bg-nhs-blue text-white"
                        : "bg-nhs-light-blue text-black"
                    }`}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Profile section */}
          <div className="flex items-center gap-3 px-4 pb-6">
            <div className="w-[40px] h-[40px] rounded-full bg-red-500 shrink-0" />
            <div className="h-[20px] w-[80px] bg-gray-300 rounded" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
