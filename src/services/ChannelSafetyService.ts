import { ChannelType, type Guild } from "discord.js";
import { query } from "../db/postgres.js";
import { getVoiceChannel } from "./VoiceService.js";
import { getConfig } from "./ConfigService.js";
import { cancelDelete, scheduleDelete } from "../utils/timers.js";

export const PROTECTED_CHANNEL_IDS = new Set([
  "1554548888289943663",
  "1554548892023005224",
  ...(process.env.PROTECTED_CHANNEL_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
]);

export function isProtectedChannel(id: string): boolean {
  return PROTECTED_CHANNEL_IDS.has(id);
}

export function isOccupied(guild: Guild, channelId: string): boolean {
  return guild.voiceStates.cache.some((state) => state.channelId === channelId);
}

export async function fetchChannel(guild: Guild, id: string) {
  try {
    return await guild.channels.fetch(id, { force: true });
  } catch (error) {
    if ((error as { code?: number }).code === 10003) return null;
    throw error;
  }
}

export async function deleteEmptyRoom(
  guild: Guild,
  channelId: string,
): Promise<boolean> {
  if (
    isProtectedChannel(channelId) ||
    !guild.available ||
    !guild.client.isReady()
  )
    return false;
  const row = await getVoiceChannel(channelId, guild.id);
  if (!row || isProtectedChannel(row.textChannelId)) return false;
  const config = await getConfig(guild.id);
  if (!config?.enabled) return false;
  const voice = await fetchChannel(guild, channelId);
  const text = await fetchChannel(guild, row.textChannelId);

  if (
    !guild.available ||
    !guild.client.isReady() ||
    isOccupied(guild, channelId)
  )
    return false;
  // Voice states include bots; channel member caches can be incomplete.
  if (voice && voice.type !== ChannelType.GuildVoice) return false;
  if (voice) await voice.delete("Empty temporary voice room");
  if (text) await text.delete("Temporary voice room removed");
  await query(
    `DELETE FROM voice_channel_whitelist WHERE "voiceChannelId" = $1`,
    [channelId],
  );
  await query(
    `DELETE FROM voice_channels WHERE "guildId" = $1 AND "voiceChannelId" = $2`,
    [guild.id, channelId],
  );
  return true;
}

export function scheduleEmptyRoomDeletion(
  guild: Guild,
  channelId: string,
  delaySeconds: number,
): void {
  cancelDelete(channelId);
  if (isProtectedChannel(channelId) || isOccupied(guild, channelId)) return;
  scheduleDelete(channelId, Math.max(1000, delaySeconds * 1000), async () => {
    await deleteEmptyRoom(guild, channelId);
  });
}
