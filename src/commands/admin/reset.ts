import { buildInviteUrl } from "../../utils/invite.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { ChannelType } from "discord.js";
import { query, queryAll } from "../../db/postgres.js";
import { getConfig, upsertConfigFull } from "../../services/ConfigService.js";
import {
  deleteEmptyRoom,
  fetchChannel,
  isProtectedChannel,
  isOccupied,
} from "../../services/ChannelSafetyService.js";
import { cancelDelete } from "../../utils/timers.js";

export async function handleReset(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: "This command must be used in a server.",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const existing = await getConfig(guild.id);

    const rows = await queryAll<{
      voiceChannelId: string;
      textChannelId: string;
    }>(
      `SELECT "voiceChannelId", "textChannelId" FROM voice_channels WHERE "guildId" = $1`,
      [guild.id],
    );

    let deleted = 0;
    for (const row of rows) {
      cancelDelete(row.voiceChannelId);
      if (await deleteEmptyRoom(guild, row.voiceChannelId)) deleted++;
    }

    await query(`DELETE FROM cooldowns WHERE "guildId" = $1`, [guild.id]);

    for (const id of [
      existing?.controlPanelChannelId,
      existing?.creatorChannelId,
    ].filter((x): x is string => !!x)) {
      try {
        if (isProtectedChannel(id) || isOccupied(guild, id)) continue;
        const ch = await fetchChannel(guild, id);
        if (ch) await ch.delete();
      } catch {
        // Continue if this optional Discord action fails.
      }
    }

    await query(
      `UPDATE guild_config SET "categoryId" = NULL, "creatorChannelId" = NULL, "controlPanelChannelId" = NULL, "controlPanelMessageId" = NULL WHERE "guildId" = $1`,
      [guild.id],
    );

    const category = await guild.channels.create({
      name: "🔊 Join To Create",
      type: ChannelType.GuildCategory,
    });

    const creatorChannel = await guild.channels.create({
      name: "🎤 Join To Create",
      type: ChannelType.GuildVoice,
      parent: category.id,
    });

    await upsertConfigFull(guild.id, {
      enabled: 1,
      categoryId: category.id,
      creatorChannelId: creatorChannel.id,
      controlPanelChannelId: null,
      controlPanelMessageId: null,
      logChannelId: existing?.logChannelId ?? null,
      nameTemplate: existing?.nameTemplate ?? "{username}'s Room",
      brandColor: existing?.brandColor ?? "#5865F2",
      cooldownSeconds: existing?.cooldownSeconds ?? 60,
      deleteDelaySeconds: 10,
      claimTimeoutSeconds: existing?.claimTimeoutSeconds ?? 120,
      maxChannelsPerUser: existing?.maxChannelsPerUser ?? 1,
    });

    await interaction.editReply({
      content: `✅ **Full reset complete!**\n\nRemoved ${deleted} empty rooms. Occupied and protected rooms have been retained. Fresh setup created:\n\n🔊 **Category:** ${category}\n🎤 **Creator channel:** ${creatorChannel}\n\n• Delete delay: **10 seconds** (rooms auto-delete when empty)\n• Join the creator channel to create your room\n• Control panel is in each room's text channel`,
    });
  } catch (err) {
    console.error("Reset error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    await interaction
      .editReply({
        content: `❌ **Reset failed:** ${msg}\n\nIf you see "Missing Permissions", check the bot permissions: ${buildInviteUrl(interaction.client.user!.id)}`,
      })
      .catch(() => {});
  }
}
