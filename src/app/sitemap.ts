import { MetadataRoute } from "next";

// Known seed template IDs with their game slugs for SEO-friendly sitemap
const SEED_TEMPLATES = [
  { id: "yahtzee", game: "yahtzee" },
  { id: "uno", game: "uno" },
  { id: "catan", game: "catan" },
  { id: "spades", game: "spades" },
  { id: "scrabble", game: "scrabble" },
  { id: "cornhole", game: "cornhole" },
  { id: "poker", game: "poker" },
  { id: "phase10", game: "phase-10" },
  { id: "golf", game: "golf-card" },
  { id: "ticket", game: "ticket-to-ride" },
  { id: "wingspan", game: "wingspan" },
];

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://scorecard-stattracker.pages.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/templates`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/dashboard`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  // Add individual template pages
  for (const tpl of SEED_TEMPLATES) {
    entries.push({
      url: `${BASE_URL}/scorecards/${tpl.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Add game-filtered gallery pages
  const gameSlugs = [...new Set(SEED_TEMPLATES.map((t) => t.game))];
  for (const slug of gameSlugs) {
    entries.push({
      url: `${BASE_URL}/scorecards/game/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
