import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { PermissionFlagsBits } from "discord.js";

export async function handleHelp(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const member = interaction.member as GuildMember | null;
  const isAdministrator = !!member?.permissions?.has(
    PermissionFlagsBits.Administrator,
  );

  const embed = isAdministrator
    ? new EmbedBuilder()
        .setTitle("Voice Channel System Setup - Administrator Help")
        .setDescription(
          "This bot allows dynamic control of temporary voice channels with advanced administrator tools",
        )
        .addFields(
          {
            name: "How to Use",
            value:
              "- Join the creator channel to create or manage it\n" +
              "- Use the control panel buttons to manage settings",
            inline: false,
          },
          {
            name: "Permissions Required",
            value:
              "- Use the permission-specific invite in the project README\n" +
              "- Admin Lock is only available to administrators who own the voice channel",
            inline: false,
          },
          {
            name: "Admin Lock Info",
            value:
              "- Locks the channel to administrators only\n" +
              "- Automatically removes non administrator users\n" +
              "- Blocks future joins from non administrator users",
            inline: false,
          },
          {
            name: "Tips",
            value:
              "- Use Limit to control size\n" +
              "- Use Private for restricted access\n" +
              "- Transfer ownership if needed",
            inline: false,
          },
        )
        .setColor(0x5865f2)
        .setFooter({ text: "Keep channels clean and controlled" })
    : new EmbedBuilder()
        .setTitle("Voice Channel System Setup - User Help")
        .setDescription(
          "This bot allows you to create and manage a temporary voice channel",
        )
        .addFields(
          {
            name: "How to Use",
            value:
              "- Join the creator channel to create your room\n" +
              "- Use the control panel to rename, set a limit, and manage access",
            inline: false,
          },
          {
            name: "Tips",
            value:
              "- Use Limit to control size\n" +
              "- Use Private for restricted access\n" +
              "- Ask an administrator if you need help with Admin Lock",
            inline: false,
          },
        )
        .setColor(0x5865f2)
        .setFooter({ text: "Keep channels clean and controlled" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
