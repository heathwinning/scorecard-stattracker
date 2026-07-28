import { Parser } from "expr-eval";

/**
 * Formula engine powered by expr-eval.
 *
 * Custom aggregation functions (SUM, AVG, MIN, MAX, COUNT) resolve cell keys
 * — including wildcards like "round_*" — against the provided cell context.
 */

export interface CellContext {
  key: string;
  value: number;
}

function buildCellMap(cells: CellContext[]): Map<string, number> {
  return new Map(cells.map((c) => [c.key, c.value]));
}

/** Expand an exact key or wildcard pattern to an array of numeric values. */
function resolveValues(key: string, cellMap: Map<string, number>): number[] {
  if (cellMap.has(key)) return [cellMap.get(key)!];

  if (key.includes("*")) {
    const regex = new RegExp(
      "^" + key.replace(/\*/g, ".*").replace(/_/g, "_") + "$"
    );
    const vals: number[] = [];
    for (const [k, v] of cellMap) {
      if (regex.test(k)) vals.push(v);
    }
    return vals;
  }
  return [];
}

/** Flatten mixed args (strings = cell refs, numbers = literals) into a number array. */
function flattenArgs(
  args: unknown[],
  cellMap: Map<string, number>
): number[] {
  return args.flatMap((arg) => {
    if (typeof arg === "string") return resolveValues(arg, cellMap);
    if (typeof arg === "number") return [arg];
    return [];
  });
}

function createParser(cellMap: Map<string, number>): Parser {
  const p = new Parser();

  p.functions.SUM = (...args: unknown[]) =>
    flattenArgs(args, cellMap).reduce((a, b) => a + b, 0);

  p.functions.AVG = (...args: unknown[]) => {
    const v = flattenArgs(args, cellMap);
    return v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length;
  };

  p.functions.MIN = (...args: unknown[]) => {
    const v = flattenArgs(args, cellMap);
    return v.length === 0 ? 0 : Math.min(...v);
  };

  p.functions.MAX = (...args: unknown[]) => {
    const v = flattenArgs(args, cellMap);
    return v.length === 0 ? 0 : Math.max(...v);
  };

  p.functions.COUNT = (...args: unknown[]) =>
    flattenArgs(args, cellMap).length;

  return p;
}

/** Evaluate a formula expression. Returns 0 on any error. */
export function evaluateFormula(
  expression: string,
  cells: CellContext[]
): number {
  if (!expression?.trim()) return 0;
  try {
    const parser = createParser(buildCellMap(cells));
    const result = parser.evaluate(expression.trim());
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
    p.evaluate(expression.trim());
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
