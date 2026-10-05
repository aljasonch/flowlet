import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { TimezoneCookie } from "@/components/TimezoneCookie";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-sans",
});

export const metadata: Metadata = {
  title: "Personal Money Manager",
  description: "Cash flow tracking and portfolio snapshot",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans relative">
        <div
          aria-hidden="true"
          className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]"
        >
          <div
            style={{ backgroundColor: "var(--shape-a)" }}
            className="absolute -top-[10vmin] -left-[10vmin] w-[50vmin] h-[50vmin] rounded-full"
          />
          <div
            style={{ backgroundColor: "var(--shape-b)" }}
            className="absolute top-[35%] -right-[15vmin] w-[55vmin] h-[55vmin] rounded-3xl"
          />
          <div
            style={{ backgroundColor: "var(--shape-c)" }}
            className="absolute -bottom-[15vmin] left-[20%] w-[50vmin] h-[50vmin] rounded-full"
          />
        </div>
        <TimezoneCookie />
        {children}
      </body>
    </html>
  );
}
