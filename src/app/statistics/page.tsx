"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HiOutlineChartBar } from "react-icons/hi";
import { useAuth } from "@/components/AuthProvider";
import { formatScore, formatWinRate, ScoreTrend, WinsChart } from "@/components/StatisticsCharts";
import { getStatisticsHistory, getTemplate } from "@/lib/api-client";
import { getAllGuestData } from "@/lib/guest-store";
import { buildStatistics, summarizePlayers, summarizeScores, type ScoredGame, type StatisticsHistory } from "@/lib/statistics";

async function guestStatisticsHistory(): Promise<StatisticsHistory> {
  const { scorecards, scores, templates } = getAllGuestData();
  const history: StatisticsHistory = { scorecards: [], players: [], values: [], templateCells: Object.create(null) };
  for (const template of templates) history.templateCells[template.id] = template.cells;
  const missingTemplates = new Set<string>();
  for (const card of scorecards) {
    const saved = scores[card.id];
    if (!saved?.players.length || !saved.values.length) continue;
    history.scorecards.push({ ...card, cells: saved.cells });
    history.players.push(...saved.players.map(player => ({ ...player, scorecard_id: card.id })));
    history.values.push(...saved.values.map(value => ({ ...value, scorecard_id: card.id })));
    if (!saved.cells?.length && !history.templateCells[card.template_id] && !card.template_id.startsWith("guest-")) {
      missingTemplates.add(card.template_id);
    }
  }
  await Promise.all(Array.from(missingTemplates, async id => {
    const { template } = await getTemplate(id);
    history.templateCells[id] = template.cells;
  }));
  return history;
}

function Summary({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ label, value }) => (
        <div key={label} className="card min-w-0 p-4">
          <dt className="text-sm font-medium text-slate-500">{label}</dt>
          <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Statistics({ games }: { games: ScoredGame[] }) {
  const [gameId, setGameId] = useState("");
  const [playerKey, setPlayerKey] = useState("");
  const [scoreGameId, setScoreGameId] = useState("");

  const templates = useMemo(() => {
    const names = new Map(games.map(game => [game.templateId, game.templateName]));
    return Array.from(names).sort((a, b) => a[1].localeCompare(b[1]));
  }, [games]);
  const filteredGames = useMemo(() => games.filter(game => !gameId || game.templateId === gameId), [games, gameId]);
  const players = useMemo(() => summarizePlayers(filteredGames), [filteredGames]);
  const player = players.find(player => player.key === playerKey);
  const viewGames = player ? filteredGames.filter(game => game.players.some(result => result.key === player.key)) : filteredGames;
  const scoreTemplates = new Set(viewGames.map(game => game.templateId));
  const currentScoreGameId = scoreTemplates.has(scoreGameId) ? scoreGameId : viewGames[viewGames.length - 1]?.templateId;
  const scoreGames = viewGames.filter(game => game.templateId === currentScoreGameId);
  const scoresFor = (game: ScoredGame) => player ? game.players.filter(result => result.key === player.key) : game.players;
  const scoreSummary = summarizeScores(scoreGames.flatMap(scoresFor));
  const points = scoreGames.map(game => ({ game, value: summarizeScores(scoresFor(game))!.average }));
  const summary = player ? [
    { label: "Games with scores", value: player.games },
    { label: "Wins", value: player.outcomes.win },
    { label: "Win rate", value: formatWinRate(player.winRate) },
    { label: "Ties", value: player.outcomes.tie },
  ] : [
    { label: "Games with scores", value: viewGames.length },
    { label: "Players", value: players.length },
    { label: "Games with a winner", value: viewGames.filter(game => game.players.some(player => player.outcome === "win")).length },
    { label: "Tied games", value: viewGames.filter(game => game.players.some(player => player.outcome === "tie")).length },
  ];
  const outcomes = player ? [
    { key: "win", label: "Wins", value: player.outcomes.win },
    { key: "loss", label: "Losses", value: player.outcomes.loss },
    { key: "tie", label: "Ties", value: player.outcomes.tie },
  ] : players.filter(player => player.winRate !== undefined).map(player => ({
    key: player.key, label: player.name, value: player.outcomes.win,
  }));

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-semibold text-slate-700">
          Game
          <select className="input-field mt-1" value={gameId} onChange={event => {
            setGameId(event.target.value);
            setScoreGameId("");
          }}>
            <option value="">All games</option>
            {templates.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm font-semibold text-slate-700">
          Player
          <select className="input-field mt-1" value={player?.key ?? ""} onChange={event => setPlayerKey(event.target.value)}>
            <option value="">All players</option>
            {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(player => <option key={player.key} value={player.key}>{player.name}</option>)}
          </select>
        </label>
      </div>

      <Summary items={summary} />

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card min-w-0 p-4 sm:p-5 lg:col-span-3" aria-labelledby="score-trend-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="score-trend-heading" className="font-bold text-slate-900">Score trend</h2>
              <p className="text-sm text-slate-500">{player ? "Recorded score" : "Average score per game"}</p>
            </div>
            {scoreTemplates.size > 1 ? (
              <select aria-label="Game for score trend" className="input-field !w-auto max-w-full" value={currentScoreGameId} onChange={event => setScoreGameId(event.target.value)}>
                {templates.filter(([id]) => scoreTemplates.has(id)).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            ) : <span className="text-sm font-medium text-slate-600">{scoreGames[0]?.templateName}</span>}
          </div>
          {scoreSummary && (
            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
              {[
                ["Average", scoreSummary.average],
                ["Lowest", scoreSummary.min],
                ["Highest", scoreSummary.max],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{formatScore(Number(value))}</dd>
                </div>
              ))}
            </dl>
          )}
          <ScoreTrend key={JSON.stringify([currentScoreGameId, player?.key])} points={points} individual={!!player} />
        </section>

        <section className="card min-w-0 p-4 sm:p-5 lg:col-span-2" aria-labelledby="wins-heading">
          <h2 id="wins-heading" className="font-bold text-slate-900">{player ? `${player.name}’s results` : "Wins by player"}</h2>
          <p className="text-sm text-slate-500">{player ? "Wins, losses, and ties" : "Select a player to see their record"}</p>
          {(player ? player.winRate !== undefined : outcomes.length > 0)
            ? <WinsChart bars={outcomes} onSelect={player ? undefined : setPlayerKey} />
            : <p className="py-12 text-center text-sm text-slate-500">No ranked results in this view.</p>}
        </section>
      </div>

      {!player && (
        <section className="card min-w-0" aria-labelledby="player-summary-heading">
          <h2 id="player-summary-heading" className="px-4 py-4 font-bold text-slate-900 sm:px-5">Player summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-5">Player</th>
                  {["Games", "Wins", "Losses", "Ties", "Win rate", ...(gameId ? ["Average", "Lowest", "Highest"] : [])].map(label => (
                    <th key={label} scope="col" className="px-3 py-3 text-right last:pr-4 sm:last:pr-5">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {players.map(player => (
                  <tr key={player.key}>
                    <th scope="row" className="whitespace-normal px-4 py-3 sm:px-5">
                      <button type="button" className="break-words text-left font-semibold text-indigo-700 hover:underline" onClick={() => setPlayerKey(player.key)}>{player.name}</button>
                    </th>
                    {[player.games, player.outcomes.win, player.outcomes.loss, player.outcomes.tie, formatWinRate(player.winRate),
                      ...(gameId ? [formatScore(player.scores.average), formatScore(player.scores.min), formatScore(player.scores.max)] : [])].map((value, index) => (
                      <td key={index} className="px-3 py-3 text-right tabular-nums text-slate-700 last:pr-4 sm:last:pr-5">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="text-xs leading-relaxed text-slate-500">Player history is grouped by name. Results use saved scores once every player has a score and may include games in progress. Ties for first count as ties in the win rate.</p>
    </div>
  );
}

export default function StatisticsPage() {
  const { user, isGuest, loading } = useAuth();
  const source = loading ? null : isGuest || !user ? "guest" : user.id;
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<{ source: string; attempt: number; games?: ScoredGame[] }>();

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    const request = source === "guest" ? guestStatisticsHistory() : getStatisticsHistory(controller.signal);
    request.then(buildStatistics).then(games => {
      if (!controller.signal.aborted) setHistory({ source, attempt, games });
    }).catch(() => {
      if (!controller.signal.aborted) setHistory({ source, attempt });
    });
    return () => controller.abort();
  }, [source, attempt]);

  const result = history?.source === source && history.attempt === attempt ? history : undefined;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="page-header">
        <div>
          <h1 className="page-title">Statistics</h1>
          <p className="page-subtitle">Explore scores and wins from your saved games.</p>
        </div>
        <Link href="/scores" className="btn-secondary self-start sm:self-auto">My Scores</Link>
      </header>
      {!result ? (
        <div role="status" className="card p-8 text-center text-sm text-slate-500">Loading statistics…</div>
      ) : !result.games ? (
        <div className="empty-state" role="alert">
          <p className="empty-state-title">Couldn’t load statistics</p>
          <button type="button" className="btn-secondary mt-2" onClick={() => setAttempt(attempt + 1)}>Try again</button>
        </div>
      ) : result.games.length ? <Statistics key={source} games={result.games} /> : (
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineChartBar className="h-6 w-6 text-indigo-600" /></div>
          <p className="empty-state-title">No scores to chart yet</p>
          <p className="empty-state-desc">Record a score in a saved game to start tracking results.</p>
          <Link href="/scorecards" className="btn-primary mt-2">Browse Scorecards</Link>
        </div>
      )}
    </div>
  );
}
