import type { SessionUser } from "./auth";
import { getDB, queryFirst } from "./db";
import { cleanPlayerName } from "./player-names";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  player_name: string;
  default_player_name: string;
}

export async function readUserProfile(user: SessionUser): Promise<UserProfile> {
  const row = await queryFirst<{
    avatar_url: string | null;
    google_given_name: string | null;
    player_name: string | null;
  }>(getDB(), `SELECT u.avatar_url, p.google_given_name, p.player_name
      FROM users u LEFT JOIN user_player_profiles p ON p.user_id = u.id WHERE u.id = ?1`, [user.id]);
  const defaultName = row?.google_given_name || cleanPlayerName(user.name).split(" ")[0] || "Player 1";
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: row?.avatar_url ?? user.avatar_url,
    player_name: row?.player_name || defaultName,
    default_player_name: defaultName,
  };
}
