import type { ChatInputCommandInteraction } from "discord.js";
import { canRunAdminCommand } from "../services/PermissionService.js";
import { handleSetup } from "./admin/setup.js";
import { handleConfigView } from "./admin/config-view.js";
import { handleConfigSet } from "./admin/config-set.js";
import { handleSetLogChannel } from "./admin/setlogchannel.js";
import { handleEnable } from "./admin/enable.js";
import { handleDisable } from "./admin/disable.js";
import { handleRepair } from "./admin/repair.js";
import { handleReset } from "./admin/reset.js";
import { handleVc } from "./user/vc.js";
import { handleHelp } from "./user/help.js";

const ADMIN_COMMANDS = [
  "setup",
  "config",
  "setlogchannel",
  "enable",
  "disable",
  "repair",
  "reset",
] as const;

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const name = interaction.commandName;

  if (ADMIN_COMMANDS.includes(name as (typeof ADMIN_COMMANDS)[number])) {
    const guild = interaction.guild;
    const userId = interaction.user.id;
    if (!canRunAdminCommand(guild, userId)) {
      await interaction.reply({
        content: "Only the server owner or a bot owner can use admin commands.",
        ephemeral: true,
      });
      return;
    }
  }

  switch (name) {
    case "help":
      await handleHelp(interaction);
      break;
    case "setup":
      await handleSetup(interaction);
      break;
    case "config": {
      const sub = interaction.options.getSubcommand(false);
      if (sub === "view") await handleConfigView(interaction);
      else if (sub === "set") await handleConfigSet(interaction);
      else await handleConfigView(interaction);
      break;
    }
    case "setlogchannel":
      await handleSetLogChannel(interaction);
      break;
    case "enable":
      await handleEnable(interaction);
      break;
    case "disable":
      await handleDisable(interaction);
      break;
    case "repair":
      await handleRepair(interaction);
      break;
    case "reset":
      await handleReset(interaction);
      break;
    case "vc":
      await handleVc(interaction);
      break;
    default:
      await interaction.reply({ content: "Unknown command.", ephemeral: true });
  }
}
