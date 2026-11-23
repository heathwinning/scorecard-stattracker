import { getDB, queryFirst, execute } from "./db";

export async function claimPlayerSlot(db: ReturnType<typeof getDB>, cardId: string, userId: string, slotId: string, name?: string) {
  const slot = await queryFirst(db, "SELECT id FROM scorecard_players WHERE id = ?1 AND scorecard_id = ?2", [slotId, cardId]);
  if (!slot) return "missing";

  const claimed = await queryFirst(db, `UPDATE scorecard_participants SET player_slot_id = ?1
    WHERE scorecard_id = ?2 AND user_id = ?3
      AND NOT EXISTS (
        SELECT 1 FROM scorecard_participants WHERE scorecard_id = ?2 AND player_slot_id = ?1 AND user_id <> ?3
      )
      AND EXISTS (SELECT 1 FROM scorecard_players WHERE id = ?1 AND scorecard_id = ?2)
    RETURNING id`, [slotId, cardId, userId]);
  if (!claimed) return "taken";

  if (name) {
    await execute(db, `UPDATE scorecard_players SET player_name = ?1 WHERE id = ?2
      AND EXISTS (SELECT 1 FROM scorecard_participants WHERE scorecard_id = ?3 AND player_slot_id = ?2 AND user_id = ?4)`,
      [name, slotId, cardId, userId]);
  }
  return "claimed";
}
