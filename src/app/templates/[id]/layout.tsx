import type { Metadata } from "next";

// SEO metadata for known seed templates
const TEMPLATE_SEO: Record<
  string,
  { title: string; description: string }
> = {
  "tpl-yahtzee": {
    title: "Yahtzee Scorecard Template — Free Online Score Keeper",
    description:
      "Free printable Yahtzee scorecard with auto-calculation. Track upper section, lower section, 63-point bonus, and grand total. Works on any device.",
  },
  "tpl-uno": {
    title: "Uno Scorecard Template — Track Rounds & Scores",
    description:
      "Free Uno scorecard to track remaining cards per player across multiple rounds. Auto-calculates running totals. Perfect for Uno game nights.",
  },
  "tpl-catan": {
    title: "Catan Score Tracker — Victory Point Counter",
    description:
      "Free Catan victory point tracker. Count settlements, cities, longest road, largest army, and development cards. Auto-calculates total VP with conditional bonuses.",
  },
  "tpl-spades": {
    title: "Spades Score Sheet — Bid & Trick Tracker",
    description:
      "Free Spades score sheet. Track bids, tricks won, sandbags, and calculate scores automatically. Supports standard Spades scoring rules.",
  },
  "tpl-scrabble": {
    title: "Scrabble Score Keeper — Word Score Tracker",
    description:
      "Free Scrabble score keeper. Enter each word and its score, get automatic running totals. Track up to 12 words per player.",
  },
  "tpl-cornhole": {
    title: "Cornhole Scoreboard — Bag Tracker",
    description:
      "Free cornhole scoreboard. Track bags in the hole (3 pts) and on the board (1 pt) per round. Auto-calculates team totals for up to 6 rounds.",
  },
  "tpl-poker": {
    title: "Poker Night Tracker — Buy-in & Cash-out Logger",
    description:
      "Free poker night money tracker. Record buy-ins and cash-outs, see net profit/loss per player, and track the house balance automatically.",
  },
  "tpl-phase10": {
    title: "Phase 10 Scorecard — Phase & Round Tracker",
    description:
      "Free Phase 10 scorecard. Track current phase per player and scores across up to 10 rounds. Auto-calculates running totals. Lowest score wins!",
  },
  "tpl-golf": {
    title: "Golf Card Game Scorecard — 9-Hole Tracker",
    description:
      "Free Golf card game scorecard. Track scores across 9 holes with auto-calculated totals. Lower score wins. Great for family game night.",
  },
  "tpl-ticket": {
    title: "Ticket to Ride Score Tracker — Route & Ticket Counter",
    description:
      "Free Ticket to Ride score tracker. Enter route points, completed & unfinished tickets, longest path bonus. Auto-calculates final score including 10-point bonus.",
  },
  "tpl-wingspan": {
    title: "Wingspan Scorecard — Bird Collection Score Tracker",
    description:
      "Free Wingspan scorecard with auto-calculation. Track bird card points, bonus cards, end-of-round goals, eggs, cached food, and tucked cards. Perfect for 1-5 players.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const seo = TEMPLATE_SEO[params.id];
  if (seo) {
    return {
      title: seo.title,
      description: seo.description,
      openGraph: {
        title: seo.title,
        description: seo.description,
      },
    };
  }

  return {
    title: "Scorecard Template",
    description:
      "View and use this custom scorecard template. Track scores for any game with auto-calculation.",
  };
}

export default function TemplateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

// Generate structured data for known templates
export function generateStaticParams() {
  return Object.keys(TEMPLATE_SEO).map((id) => ({ id }));
}
