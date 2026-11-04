import { query, queryAll, queryOne } from "../db/postgres.js";

export interface WhitelistRow {
  voiceChannelId: string;
  userId: string;
  addedByUserId: string;
  addedAt: number;
}

export async function isWhitelisted(
  voiceChannelId: string,
  userId: string,
): Promise<boolean> {
  const row = await queryOne<Pick<WhitelistRow, "userId">>(
    `SELECT "userId" FROM voice_channel_whitelist WHERE "voiceChannelId" = $1 AND "userId" = $2`,
    [voiceChannelId, userId],
  );
  return !!row;
}

export async function addWhitelist(
  voiceChannelId: string,
  userId: string,
  addedByUserId: string,
): Promise<void> {
  const now = Date.now();
  await query(
    `INSERT INTO voice_channel_whitelist ("voiceChannelId", "userId", "addedByUserId", "addedAt")
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ("voiceChannelId", "userId") DO NOTHING`,
    [voiceChannelId, userId, addedByUserId, now],
  );
}

export async function removeWhitelist(
  voiceChannelId: string,
  userId: string,
): Promise<void> {
  await query(
    `DELETE FROM voice_channel_whitelist WHERE "voiceChannelId" = $1 AND "userId" = $2`,
    [voiceChannelId, userId],
  );
}

export async function listWhitelist(
  voiceChannelId: string,
): Promise<WhitelistRow[]> {
  return queryAll<WhitelistRow>(
    `SELECT * FROM voice_channel_whitelist WHERE "voiceChannelId" = $1`,
    [voiceChannelId],
  );
}
