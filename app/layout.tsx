import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const mulish = Mulish({
  subsets: ["latin"],
  variable: "--font-mulish",
  display: "swap",
});
export const metadata: Metadata = {
  title: "3D Venue Simulation",
  description: "This is a 3d venue simulation tool for event setup.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={mulish.variable}>
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
