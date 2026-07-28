import type { Metadata } from "next";

const GAME_SEO: Record<string, { name: string; description: string; keywords: string[] }> = {
  yahtzee: {
    name: "Yahtzee",
    description:
      "Free Yahtzee scorecard templates with auto-calculation. Track upper section scores, 63-point bonus, lower section totals, and grand total. No sign-up required.",
    keywords: ["yahtzee scorecard", "yahtzee score sheet", "yahtzee online", "dice game scorecard", "free yahtzee score keeper"],
  },
  uno: {
    name: "Uno",
    description:
      "Free Uno scorecard templates to track scores across multiple rounds. Record remaining cards per player and auto-calculate running totals.",
    keywords: ["uno scorecard", "uno score sheet", "uno score tracker", "card game scorecard", "free uno score keeper"],
  },
  catan: {
    name: "Catan",
    description:
      "Free Catan victory point tracker templates. Count settlements, cities, longest road, largest army, and VP development cards with automatic calculation.",
    keywords: ["catan score tracker", "catan victory point counter", "settlers of catan scorecard", "board game scorer"],
  },
  spades: {
    name: "Spades",
    description:
      "Free Spades score sheet templates. Track bids, tricks, and sandbags with automatic scoring using standard Spades rules.",
    keywords: ["spades score sheet", "spades score tracker", "spades scoring", "card game scorecard", "trick taking game scorer"],
  },
  scrabble: {
    name: "Scrabble",
    description:
      "Free Scrabble score keeper templates. Enter words and scores, get automatic running totals. Track up to 12 words per player.",
    keywords: ["scrabble score keeper", "scrabble score sheet", "scrabble word tracker", "word game scorecard"],
  },
  cornhole: {
    name: "Cornhole",
    description:
      "Free cornhole scoreboard templates. Track bags in the hole and on the board per round. Auto-calculates team scores for up to 6 rounds.",
    keywords: ["cornhole scoreboard", "cornhole score tracker", "bags scorecard", "lawn game scorer"],
  },
  poker: {
    name: "Poker",
    description:
      "Free poker night tracker templates. Log buy-ins and cash-outs, calculate net profit/loss per player, and track the house balance.",
    keywords: ["poker tracker", "poker night scorecard", "poker buy in tracker", "cash game tracker"],
  },
  "phase-10": {
    name: "Phase 10",
    description:
      "Free Phase 10 scorecard templates. Track phase completion and scores across up to 10 rounds with automatic running totals.",
    keywords: ["phase 10 scorecard", "phase 10 score sheet", "phase 10 tracker", "card game scorecard"],
  },
  "golf-card": {
    name: "Golf Card Game",
    description:
      "Free Golf card game scorecard templates. Track scores across 9 holes with auto-calculated totals. Perfect for family game night.",
    keywords: ["golf card game scorecard", "golf card game score sheet", "card game scorer"],
  },
  "ticket-to-ride": {
    name: "Ticket to Ride",
    description:
      "Free Ticket to Ride score tracker templates. Enter route points, destination tickets, and longest path bonus. Auto-calculates final score.",
    keywords: ["ticket to ride score tracker", "ticket to ride scorecard", "board game scorer", "train game scorecard"],
  },
  wingspan: {
    name: "Wingspan",
    description:
      "Free Wingspan scorecard templates. Track bird card points, bonus cards, end-of-round goals, eggs, cached food, and tucked cards with automatic grand total calculation.",
    keywords: ["wingspan scorecard", "wingspan score tracker", "wingspan score sheet", "bird board game scorer", "wingspan scoring app"],
  },
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const seo = GAME_SEO[params.slug];
  if (!seo) {
    return { title: "Game Templates" };
  }
  return {
    title: `${seo.name} Scorecard Templates — Free Online Score Keeper`,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      title: `Free ${seo.name} Scorecard Templates`,
      description: seo.description,
    },
  };
}

export default function GameTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
