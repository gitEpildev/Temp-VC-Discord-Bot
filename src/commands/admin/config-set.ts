import type { ChatInputCommandInteraction } from "discord.js";
import { getConfig, upsertConfig } from "../../services/ConfigService.js";
import { log } from "../../services/LoggingService.js";

const OPTIONS = [
  "nametemplate",
  "brandcolor",
  "cooldown",
  "deletedelay",
  "claimtimeout",
  "maxchannelsperuser",
] as const;

export async function handleConfigSet(
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

  const opt = interaction.options.getString("option", true).toLowerCase();
  const value = interaction.options.getString("value", true);

  const partial: Record<string, unknown> = {};

  switch (opt) {
    case "nametemplate":
      if (value.length < 1 || value.length > 100) {
        await interaction.reply({
          content: "Name template must be 1-100 characters.",
          ephemeral: true,
        });
        return;
      }
      if (!value.includes("{username}")) {
        await interaction.reply({
          content: "Name template must include {username}.",
          ephemeral: true,
        });
        return;
      }
      partial.nameTemplate = value;
      break;

    case "brandcolor":
      if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
        await interaction.reply({
          content: "Brand colour must be a hex colour (e.g. #5865F2).",
          ephemeral: true,
        });
        return;
      }
      partial.brandColor = value;
      break;

    case "cooldown": {
      const cooldown = parseInt(value, 10);
      if (isNaN(cooldown) || cooldown < 0 || cooldown > 86400) {
        await interaction.reply({
          content: "Cooldown must be 0-86400 seconds.",
          ephemeral: true,
        });
        return;
      }
      partial.cooldownSeconds = cooldown;
      break;
    }

    case "deletedelay": {
      const dd = parseInt(value, 10);
      if (isNaN(dd) || dd < 0 || dd > 86400) {
        await interaction.reply({
          content: "Delete delay must be 0-86400 seconds.",
          ephemeral: true,
        });
        return;
      }
      partial.deleteDelaySeconds = dd;
      break;
    }

    case "claimtimeout": {
      const ct = parseInt(value, 10);
      if (isNaN(ct) || ct < 0 || ct > 86400) {
        await interaction.reply({
          content: "Claim timeout must be 0-86400 seconds.",
          ephemeral: true,
        });
        return;
      }
      partial.claimTimeoutSeconds = ct;
      break;
    }

    case "maxchannelsperuser": {
      const mc = parseInt(value, 10);
      if (value !== "1") {
        await interaction.reply({
          content:
            "Each user can own one voice room per server. Set this value to 1.",
          ephemeral: true,
        });
        return;
      }
      partial.maxChannelsPerUser = mc;
      break;
    }

    default:
      await interaction.reply({
        content: `Unknown option. Use: ${OPTIONS.join(", ")}`,
        ephemeral: true,
      });
      return;
  }

  await upsertConfig(guildId, partial as Parameters<typeof upsertConfig>[1]);
  await interaction.reply({
    content: `Config updated: \`${opt}\` = \`${value}\``,
    ephemeral: true,
  });

  await log(interaction.client, guildId, "config_update", {
    userId: interaction.user.id,
    userName: interaction.user.username,
    guildName: interaction.guild?.name,
    extra: `${opt}=${value}`,
  });
}
