import { ChannelType, type Guild } from "discord.js";
import { queryAll, type GuildConfig } from "../db/postgres.js";
import {
  ensureRoomControlPanel,
  repairControlPanel,
} from "./ControlPanelService.js";
import {
  syncSideChatPermissions,
  type VoiceChannelRow,
} from "./VoiceService.js";
import {
  fetchChannel,
  scheduleEmptyRoomDeletion,
} from "./ChannelSafetyService.js";

export async function recoverGuild(
  guild: Guild,
  config: GuildConfig,
): Promise<number> {
  let repaired = 0;
  if (config.controlPanelChannelId) {
    try {
      const channel = await fetchChannel(guild, config.controlPanelChannelId);
      if (
        channel?.type === ChannelType.GuildText &&
        (await repairControlPanel(channel, config, guild.id))
      )
        repaired++;
    } catch (error) {
      console.error(`Shared panel recovery failed for ${guild.id}:`, error);
    }
  }
  const rows = await queryAll<VoiceChannelRow>(
    `SELECT * FROM voice_channels WHERE "guildId" = $1`,
    [guild.id],
  );
  for (const row of rows) {
    try {
      const voice = await fetchChannel(guild, row.voiceChannelId);
      const text = await fetchChannel(guild, row.textChannelId);
      if (
        voice?.type === ChannelType.GuildVoice &&
        text?.type === ChannelType.GuildText
      ) {
        if (await ensureRoomControlPanel(text, config, guild.client.user!.id))
          repaired++;
        await syncSideChatPermissions(voice, text, row.ownerId);
      }
      if (config.enabled)
        scheduleEmptyRoomDeletion(
          guild,
          row.voiceChannelId,
          config.deleteDelaySeconds,
        );
    } catch (error) {
      console.error(`Room recovery failed for ${row.voiceChannelId}:`, error);
    }
  }
  return repaired;
}
