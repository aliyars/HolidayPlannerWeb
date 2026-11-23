import { Poppins, Inter } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import { PlannerProvider } from "@/components/layout/PlannerProvider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata = {
  title: "Holiday Planner",
  description: "Find getaways, see the calendar, and plan your holidays.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <PlannerProvider>
          <Navbar />
          <main>{children}</main>
        </PlannerProvider>
      </body>
    </html>
  );
}
