import { type Client, type TextChannel, EmbedBuilder } from "discord.js";
import { getConfig } from "./ConfigService.js";

export type LogType =
  | "channel_created"
  | "channel_deleted"
  | "side_chat_created"
  | "owner_transferred"
  | "claim_executed"
  | "lock"
  | "unlock"
  | "privacy_change"
  | "kick"
  | "ban"
  | "unban"
  | "config_update";

export interface LogData {
  userId?: string;
  userName?: string;
  channelId?: string;
  channelName?: string;
  targetUserId?: string;
  targetUserName?: string;
  guildName?: string;
  extra?: string;
}

export async function log(
  client: Client,
  guildId: string,
  type: LogType,
  data: LogData,
): Promise<void> {
  const config = await getConfig(guildId);
  if (!config?.logChannelId) return;

  const channel = await client.channels.fetch(config.logChannelId);
  if (!channel || !channel.isTextBased()) return;

  const color = parseInt(config.brandColor.replace("#", ""), 16) || 0x5865f2;
  const timestamp = new Date().toISOString();

  let title = "";
  let description = "";

  switch (type) {
    case "channel_created":
      title = "Voice Channel Created";
      description = `**User:** ${data.userName ?? "Unknown"} (${data.userId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "channel_deleted":
      title = "Voice Channel Deleted";
      description = `**Channel ID:** ${data.channelId ?? "?"}\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "side_chat_created":
      title = "Side Chat Created";
      description = `**User:** ${data.userName ?? "Unknown"} (${data.userId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "owner_transferred":
      title = "Owner Transferred";
      description = `**From:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**To:** ${data.targetUserName ?? "?"} (${data.targetUserId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "claim_executed":
      title = "Claim Executed";
      description = `**New Owner:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "lock":
      title = "Channel Locked";
      description = `**User:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "unlock":
      title = "Channel Unlocked";
      description = `**User:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "privacy_change":
      title = "Privacy Changed";
      description = `**User:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Change:** ${data.extra ?? "?"}\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "kick":
      title = "User Kicked from Voice";
      description = `**By:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**Target:** ${data.targetUserName ?? "?"} (${data.targetUserId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "ban":
      title = "User Banned from Voice";
      description = `**By:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**Target:** ${data.targetUserName ?? "?"} (${data.targetUserId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "unban":
      title = "User Unbanned from Voice";
      description = `**By:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**Target:** ${data.targetUserName ?? "?"} (${data.targetUserId ?? "?"})\n**Channel:** <#${data.channelId}>\n**Guild:** ${data.guildName ?? "?"}`;
      break;
    case "config_update":
      title = "Config Updated";
      description = `**User:** ${data.userName ?? "?"} (${data.userId ?? "?"})\n**Guild:** ${data.guildName ?? "?"}\n**Details:** ${data.extra ?? "?"}`;
      break;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp(new Date(timestamp))
    .setFooter({ text: `Guild: ${data.guildName ?? "?"}` });

  await (channel as TextChannel).send({ embeds: [embed] });
}
