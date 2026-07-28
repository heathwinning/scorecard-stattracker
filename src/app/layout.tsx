import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Scorecard StatTracker — Free Online Scorecard Templates for Any Game",
    template: "%s | Scorecard StatTracker",
  },
  description:
    "Create customizable scorecards for board games, card games, and party games. Free online score keeper with drag & drop builder, auto-calculation, and multiplayer sharing.",
  keywords: [
    "scorecard", "score keeper", "game scorecard", "board game scorer",
    "card game score sheet", "yahtzee scorecard", "uno scorecard",
    "catan score tracker", "spades score sheet", "scrabble score keeper",
    "cornhole scoreboard", "poker tracker", "phase 10 scorecard",
    "free scorecard template", "online scorecard",
  ],
  openGraph: {
    title: "Scorecard StatTracker — Free Online Scorecard Templates",
    description:
      "Create customizable scorecards for any game. Drag & drop builder, auto-calculation, multiplayer sharing. Free and no sign-up required.",
    url: "https://scorecard-stattracker.pages.dev",
    siteName: "Scorecard StatTracker",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scorecard StatTracker — Free Online Scorecard Templates",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1e293b",
                color: "#f8fafc",
                borderRadius: "12px",
                fontSize: "14px",
                padding: "12px 16px",
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "#f8fafc" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#f8fafc" } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
