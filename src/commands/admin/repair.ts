import type { ChatInputCommandInteraction } from "discord.js";
import { getConfig } from "../../services/ConfigService.js";
import { recoverGuild } from "../../services/RecoveryService.js";

export async function handleRepair(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command must be used in a server.",
      ephemeral: true,
    });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const config = await getConfig(interaction.guild.id);
  if (!config) {
    await interaction.editReply({
      content: "No configuration found. Run /setup first.",
    });
    return;
  }
  const repaired = await recoverGuild(interaction.guild, config);
  await interaction.editReply({
    content: `Repair complete. Control panels updated: ${repaired}. Occupied and protected rooms have been retained.`,
  });
}
