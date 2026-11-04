import { fetchChannel } from "../../services/ChannelSafetyService.js";

import type { ChatInputCommandInteraction } from "discord.js";
import { ChannelType } from "discord.js";
import { getConfig, upsertConfigFull } from "../../services/ConfigService.js";

export async function handleSetup(
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

  const existing = await getConfig(guild.id);
  if (existing?.categoryId && existing.creatorChannelId) {
    const category = await fetchChannel(guild, existing.categoryId);
    const creator = await fetchChannel(guild, existing.creatorChannelId);
    if (
      category?.type === ChannelType.GuildCategory &&
      creator?.type === ChannelType.GuildVoice
    ) {
      await interaction.editReply({
        content:
          "Voice automation is already set up. Use /repair to refresh room controls.",
      });
      return;
    }
  }

  try {
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
      deleteDelaySeconds: existing?.deleteDelaySeconds ?? 10,
      claimTimeoutSeconds: existing?.claimTimeoutSeconds ?? 120,
      maxChannelsPerUser: existing?.maxChannelsPerUser ?? 1,
    });

    const logNote = existing?.logChannelId
      ? ""
      : "\n\nUse `/setlogchannel` to configure logging.";
    await interaction.editReply({
      content: `✅ **Setup complete!** Existing rooms have been retained.\n\n🔊 **Category:** ${category}\n🎤 **Creator channel:** ${creatorChannel}\n\nJoin the creator channel to create your voice room. Each room gets a private chat with controls.${logNote}`,
    });
  } catch (err) {
    console.error("Setup error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    await interaction
      .editReply({
        content: `❌ **Setup failed:** ${msg}\n\nIf you see "Missing Permissions", re-invite the bot with Administrator.`,
      })
      .catch(() => {});
  }
}
