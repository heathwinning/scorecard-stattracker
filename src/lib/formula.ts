import { Parser } from "expr-eval";

/**
 * Formula engine powered by expr-eval.
 *
 * Custom aggregation functions resolve named fields in the provided cell
 * context. List fields are already represented by their per-player total, so
 * `SUM(bonus)` means "sum this player's bonus entries" without a wildcard.
 */

export interface CellContext {
  key: string;
  value: number;
  /** Individual values for a repeatable/list field. */
  items?: number[];
  /** Formula results are addressable directly, but excluded from wildcard sums. */
  aggregate?: boolean;
}

function buildCellMap(cells: CellContext[]): Map<string, number> {
  return new Map(cells.map((c) => [c.key, c.value]));
}

/** Resolve one named field to its numeric value. */
function resolveValues(key: string, cellMap: Map<string, number>): number[] {
  if (cellMap.has(key)) return [cellMap.get(key)!];
  return [];
}

/** Flatten mixed args (strings = cell refs, numbers = literals) into a number array. */
function flattenArgs(
  args: unknown[],
  cellMap: Map<string, number>
): number[] {
  const flatten = (arg: unknown): number[] => {
    if (typeof arg === "string") return resolveValues(arg, cellMap);
    if (typeof arg === "number") return [arg];
    if (Array.isArray(arg)) return arg.flatMap(flatten);
    return [];
  };
  return args.flatMap(flatten);
}

function createParser(
  cellMap: Map<string, number>,
  aggregateMap: Map<string, number>,
  listMap: Map<string, number[]>
): Parser {
  const p = new Parser();

  p.functions.SUM = (...args: unknown[]) =>
    flattenArgs(args, aggregateMap).reduce((a, b) => a + b, 0);

  p.functions.AVG = (...args: unknown[]) => {
    const v = flattenArgs(args, aggregateMap);
    return v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length;
  };

  p.functions.MIN = (...args: unknown[]) => {
    const v = flattenArgs(args, aggregateMap);
    return v.length === 0 ? 0 : Math.min(...v);
  };

  p.functions.MAX = (...args: unknown[]) => {
    const v = flattenArgs(args, aggregateMap);
    return v.length === 0 ? 0 : Math.max(...v);
  };

  p.functions.COUNT = (...args: unknown[]) =>
    flattenArgs(args, aggregateMap).length;
  p.functions.sum = p.functions.SUM;
  p.functions.avg = p.functions.AVG;
  p.functions.min = p.functions.MIN;
  p.functions.max = p.functions.MAX;
  p.functions.count = p.functions.COUNT;

  const playerValue = (key: unknown, index: unknown) => {
    if (typeof key !== "string" || typeof index !== "number" || !Number.isInteger(index) || index < 1) return [];
    const playerKey = `player_${index}_${key}`;
    return listMap.get(playerKey) ?? [cellMap.get(playerKey) ?? 0];
  };
  const allPlayersValue = (key: unknown) => {
    if (typeof key !== "string") return [];
    const suffix = `_${key}`;
    const values: number[] = [];
    for (const [contextKey, value] of cellMap) {
      if (/^player_\d+_/.test(contextKey) && contextKey.endsWith(suffix)) {
        values.push(...(listMap.get(contextKey) ?? [value]));
      }
    }
    return values;
  };
  p.functions.PLAYER = playerValue;
  p.functions.player = playerValue;
  p.functions.PLAYERS = allPlayersValue;
  p.functions.players = allPlayersValue;

  return p;
}

function normalizeFormulaExpression(expression: string): string {
  // Pass a field key to player()/players() as a string rather than evaluating
  // it in the current-player scope first. Player indexes are one-based, in
  // the same order as scorecard columns.
  return expression.trim()
    .replace(/\bplayer\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,/gi, 'PLAYER("$1",')
    .replace(/\bplayers\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/gi, 'PLAYERS("$1")');
}

/** Evaluate a formula expression. Returns 0 on any error. */
export function evaluateFormula(
  expression: string,
  cells: CellContext[]
): number {
  if (!expression?.trim()) return 0;
  try {
    const cellMap = buildCellMap(cells);
    // Formula results remain addressable directly, but are excluded from
    // aggregate functions so a subtotal cannot be counted again.
    const aggregateMap = buildCellMap(cells.filter(cell => cell.aggregate !== false));
    const listMap = new Map(cells.flatMap(cell => cell.items ? [[cell.key, cell.items] as const] : []));
    const parser = createParser(cellMap, aggregateMap, listMap);
    const normalized = normalizeFormulaExpression(expression);
    // Bare identifiers (e.g. `upper_subtotal + upper_bonus`) resolve against
    // the cell context. Only valid identifier keys are exposed as variables;
    // wildcard-only keys are resolved inside SUM/AVG/... via the cell map.
    const scope: Record<string, number> = {};
    for (const [key, value] of cellMap) {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) scope[key] = value;
    }
    // Optional rule cells are absent from a resolved layout when their module
    // is not selected. Treat their references as zero so a data-defined total
    // can safely include every optional category.
    for (const identifier of normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []) {
      if (!(identifier in scope) && !["SUM", "AVG", "MIN", "MAX", "COUNT", "sum", "avg", "min", "max", "count", "PLAYER", "PLAYERS", "player", "players"].includes(identifier)) {
        scope[identifier] = 0;
      }
    }
    const result = parser.evaluate(normalized, scope);
    return Math.round((typeof result === "number" ? result : 0) * 100) / 100;
  } catch {
    return 0;
  }
}

/** Validate a formula. Returns null if valid, error message otherwise. */
export function validateFormula(expression: string): string | null {
  if (!expression?.trim()) return null;
  try {
    const p = new Parser();
    p.functions.SUM = () => 0;
    p.functions.AVG = () => 0;
    p.functions.MIN = () => 0;
    p.functions.MAX = () => 0;
    p.functions.COUNT = () => 0;
    p.functions.sum = () => 0;
    p.functions.avg = () => 0;
    p.functions.min = () => 0;
    p.functions.max = () => 0;
    p.functions.count = () => 0;
    p.functions.PLAYER = () => 0;
    p.functions.player = () => 0;
    p.functions.PLAYERS = () => 0;
    p.functions.players = () => 0;
    p.evaluate(normalizeFormulaExpression(expression));
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid formula";
  }
}

/** Extract cell-key references from a formula (for dependency tracking). */
export function getFormulaReferences(expression: string): string[] {
  if (!expression?.trim()) return [];
  try {
    const parsed = new Parser().parse(expression.trim());
    const refs: string[] = [];

    function walk(node: unknown): void {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (n.type === "Variable" && typeof n.name === "string") refs.push(n.name);
      if (n.type === "Function" && Array.isArray(n.args))
        for (const a of n.args) walk(a);
      if (Array.isArray(n.values)) for (const v of n.values) walk(v);
      if (n.left) walk(n.left);
      if (n.right) walk(n.right);
    }

    walk(parsed);
    return [...new Set(refs)];
  } catch {
    return [];
  }
}
