import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PulseTrade",
  description: "Sembol grafikleri ve teknik analiz",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
