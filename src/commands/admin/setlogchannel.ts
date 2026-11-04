import type { ChatInputCommandInteraction } from "discord.js";
import { ChannelType } from "discord.js";
import { getConfig, upsertConfig } from "../../services/ConfigService.js";

export async function handleSetLogChannel(
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

  const channel = interaction.options.getChannel("channel", true);
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "The log channel must be a text channel.",
      ephemeral: true,
    });
    return;
  }

  await upsertConfig(guildId, { logChannelId: channel.id });
  await interaction.reply({
    content: `Log channel set to ${channel}.`,
    ephemeral: true,
  });
}
