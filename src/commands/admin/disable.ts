import type { ChatInputCommandInteraction } from "discord.js";
import { getConfig, upsertConfig } from "../../services/ConfigService.js";

export async function handleDisable(
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

  await upsertConfig(guildId, { enabled: 0 });
  await interaction.reply({
    content: "Voice automation disabled.",
    ephemeral: true,
  });
}
