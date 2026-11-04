import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getConfig } from "../../services/ConfigService.js";

export async function handleConfigView(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "This command must be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const config = await getConfig(guildId);
  if (!config) {
    await interaction.reply({
      content: "No config found. Run /setup first.",
      ephemeral: true,
    });
    return;
  }

  const color = parseInt(config.brandColor.replace("#", ""), 16) || 0x5865f2;
  const embed = new EmbedBuilder()
    .setTitle("Guild Config")
    .setColor(color)
    .addFields(
      { name: "Enabled", value: config.enabled ? "Yes" : "No", inline: true },
      { name: "Name Template", value: config.nameTemplate, inline: true },
      { name: "Brand Colour", value: config.brandColor, inline: true },
      {
        name: "Cooldown (s)",
        value: String(config.cooldownSeconds),
        inline: true,
      },
      {
        name: "Delete Delay (s)",
        value: String(config.deleteDelaySeconds),
        inline: true,
      },
      {
        name: "Claim Timeout (s)",
        value: String(config.claimTimeoutSeconds),
        inline: true,
      },
      {
        name: "Max Channels/User",
        value: String(config.maxChannelsPerUser),
        inline: true,
      },
      { name: "Category ID", value: config.categoryId ?? "-", inline: false },
      {
        name: "Log Channel",
        value: config.logChannelId ? `<#${config.logChannelId}>` : "Not set",
        inline: true,
      },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
