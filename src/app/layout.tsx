import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Web3Provider } from "@/providers/Web3Provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Shift — Your Savings, Supercharged",
  description:
    "A savings account powered by 20+ DeFi protocols across 60+ chains. One tap. Zero complexity. Built with LI.FI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
