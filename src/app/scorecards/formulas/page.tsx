import Link from "next/link";

const examples = [
  {
    title: "Total a player’s rounds",
    formula: "sum(round_score)",
    description: "Adds every entered round for the current player. Use this for a final total after repeatable round rows.",
  },
  {
    title: "Calculate a conditional bonus",
    formula: "upper_subtotal >= 63 ? 35 : 0",
    description: "Awards a bonus only when the player reaches a threshold.",
  },
  {
    title: "Combine fields",
    formula: "bird_points + sum(bonus) + eggs",
    description: "Adds individual fields and all entries from a list field for the current player.",
  },
  {
    title: "Shared calculated result",
    formula: "sum(players(buy_in))",
    description: "Choose “All players total: Buy-in” in the field search. Use sum(player(buy_in, 1)) to total one player’s entries.",
  },
];

export default function FormulaExamplesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href="/scorecards/new" className="text-xs text-slate-500 hover:text-slate-800 hover:underline">← Back to scorecard builder</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Formula examples</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Formulas calculate scores from fields you select in the builder. Fields are player-specific unless you create a shared calculated result and explicitly choose an “All players” field.</p>

      <div className="mt-6 space-y-4">
        {examples.map(example => (
          <section key={example.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">{example.title}</h2>
            <code className="mt-2 block rounded-lg bg-slate-100 px-3 py-2 text-sm text-indigo-800">{example.formula}</code>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{example.description}</p>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-900">
        <h2 className="font-semibold">Available functions</h2>
        <p className="mt-1"><code>sum</code>, <code>avg</code>, <code>min</code>, <code>max</code>, and <code>count</code> work with named fields. List fields can be summed with <code>sum(bonus)</code>; use <code>sum(player(bonus, 1))</code> for one player or <code>sum(players(bonus))</code> for everyone.</p>
      </section>
    </main>
  );
}
