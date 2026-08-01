import type { TemplateCell, TemplateRule } from "./api-client";

export function resolveLayout(baseCells: TemplateCell[], rules: TemplateRule[], selectedKeys: string[]) {
  const cells = baseCells.map(cell => ({ ...cell, config_json: { ...cell.config_json } }));
  const selectedRules = rules.filter(rule => selectedKeys.includes(rule.rule_key));
  for (const rule of selectedRules) {
    const definition = rule.definition_json || {};
    Object.entries(definition.overrides || {}).forEach(([cellKey, patch]) => {
      const index = cells.findIndex(cell => cell.cell_key === cellKey);
      if (index >= 0) cells[index] = { ...cells[index], ...patch, config_json: { ...cells[index].config_json, ...(patch.config_json || {}) } };
    });
    // Rule cells must be predeclared on the template so their IDs can safely
    // be referenced by persisted cell values. A rule enables them by key.
    (definition.cells || []).forEach((cell) => {
      const existing = cells.findIndex(item => item.id === cell.id || item.cell_key === cell.cell_key);
      if (existing >= 0) cells[existing] = { ...cells[existing], ...cell, config_json: { ...cells[existing].config_json, ...(cell.config_json || {}) } };
    });
  }
  return {
    cells: cells
      .filter(cell => {
        const ruleKey = (cell.config_json as Record<string, unknown>)?.rule_key;
        return typeof ruleKey !== "string" || selectedKeys.includes(ruleKey);
      })
      .sort((left, right) => left.sort_order - right.sort_order),
    selectedRules,
  };
}
