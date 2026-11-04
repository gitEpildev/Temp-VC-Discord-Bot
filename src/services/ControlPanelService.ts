import { ChannelType, type Guild, type TextChannel } from "discord.js";
import { query, type GuildConfig } from "../db/postgres.js";
import {
  buildControlPanelEmbed,
  buildControlPanelComponents,
} from "../ui/controlPanel.js";
import { getVoiceChannelByTextChannelId } from "./VoiceService.js";
import { upsertConfig } from "./ConfigService.js";

async function roomPanel(channel: TextChannel, config: GuildConfig) {
  const room = await getVoiceChannelByTextChannelId(
    channel.id,
    channel.guild.id,
  );
  const owner = room
    ? await channel.guild.members.fetch(room.ownerId).catch(() => null)
    : null;
  const ownerName = room ? (owner?.displayName ?? "Room owner") : undefined;
  return {
    embed: buildControlPanelEmbed(
      config,
      ownerName,
      room ? Number(room.createdAt) : undefined,
    ),
    components: buildControlPanelComponents(room ?? undefined),
  };
}

export async function postControlPanel(
  channel: TextChannel,
  config: GuildConfig,
): Promise<string> {
  const { embed, components } = await roomPanel(channel, config);
  const message = await channel.send({
    embeds: [embed],
    components,
  });
  await query(
    `UPDATE voice_channels SET "controlPanelMessageId" = $2 WHERE "textChannelId" = $1 AND "guildId" = $3`,
    [channel.id, message.id, channel.guild.id],
  );
  return message.id;
}

export async function repairControlPanel(
  channel: TextChannel,
  config: GuildConfig,
  guildId: string,
): Promise<boolean> {
  if (!config.controlPanelMessageId) {
    const messageId = await postControlPanel(channel, config);
    await upsertConfig(guildId, { controlPanelMessageId: messageId });
    return true;
  }

  try {
    const message = await channel.messages.fetch(config.controlPanelMessageId);
    if (!message) throw new Error("Message not found");
    return false;
  } catch {
    const messageId = await postControlPanel(channel, config);
    await upsertConfig(guildId, { controlPanelMessageId: messageId });
    return true;
  }
}

export async function ensureRoomControlPanel(
  channel: TextChannel,
  config: GuildConfig,
  botUserId: string,
): Promise<boolean> {
  try {
    const room = await getVoiceChannelByTextChannelId(
      channel.id,
      channel.guild.id,
    );
    let panel;
    if (room?.controlPanelMessageId) {
      try {
        panel = await channel.messages.fetch(room.controlPanelMessageId);
      } catch (error) {
        if ((error as { code?: number }).code !== 10008) throw error;
      }
    }
    let before: string | undefined;
    while (!panel) {
      const messages = await channel.messages.fetch({ limit: 100, before });
      panel = messages.find(
        (message) =>
          message.author.id === botUserId &&
          message.embeds.some(
            (embed) => embed.title === "🎛 Voice Room Controls",
          ),
      );
      if (panel || messages.size < 100) break;
      before = messages.last()!.id;
    }
    if (panel) {
      const { embed, components } = await roomPanel(channel, config);
      await panel.edit({ embeds: [embed], components });
      await query(
        `UPDATE voice_channels SET "controlPanelMessageId" = $2 WHERE "textChannelId" = $1 AND "guildId" = $3`,
        [channel.id, panel.id, channel.guild.id],
      );
      return true;
    }
    await postControlPanel(channel, config);
    return true;
  } catch (error) {
    console.error(`Room panel recovery failed for ${channel.id}:`, error);
    return false;
  }
}

export async function refreshRoomPanel(
  guild: Guild,
  textChannelId: string,
  config: GuildConfig,
): Promise<void> {
  try {
    const channel = await guild.channels.fetch(textChannelId);
    if (channel?.type === ChannelType.GuildText)
      await ensureRoomControlPanel(channel, config, guild.client.user!.id);
  } catch (error) {
    console.error(`Panel refresh failed for ${textChannelId}:`, error);
  }
}
