import "./globals.css";
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: " 🪙 Penny",
  description:
    "A kid-friendly financial literacy world where your coin grows by making smart money decisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
