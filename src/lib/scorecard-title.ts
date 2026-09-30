export function formatScorecardDate(gameDate?: string): string {
  const date = gameDate ? new Date(gameDate) : new Date();
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function defaultScorecardTitle(gameName: string, gameDate?: string): string {
  return `${gameName.trim() || "Game"} — ${formatScorecardDate(gameDate)}`;
}

export function scorecardDisplayTitle(title: string | null | undefined, gameName?: string | null, gameDate?: string): string {
  return title?.trim() || (gameName ? defaultScorecardTitle(gameName, gameDate) : "Untitled Game");
}
