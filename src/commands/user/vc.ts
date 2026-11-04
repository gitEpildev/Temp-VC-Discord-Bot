import { refreshRoomPanel } from "../../services/ControlPanelService.js";
import type { ChatInputCommandInteraction } from "discord.js";
import type { VoiceChannel } from "discord.js";
import { getConfig } from "../../services/ConfigService.js";
import {
  getVoiceChannel,
  updateOwner,
  setLocked,
} from "../../services/VoiceService.js";
import {
  setOwnerPermissions,
  isAdmin,
  isBot,
} from "../../services/PermissionService.js";
import { log } from "../../services/LoggingService.js";
import { validateRename, validateLimit } from "../../utils/validators.js";

export async function handleVc(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const guildId = interaction.guildId;
  const member = interaction.member;

  if (!guildId || !member || !("voice" in member)) {
    await interaction.reply({
      content: "This command must be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const voiceChannel = member.voice.channel;
  if (!voiceChannel || !voiceChannel.isVoiceBased()) {
    await interaction.reply({
      content: "You must be in a voice channel to use this command.",
      ephemeral: true,
    });
    return;
  }

  const vc = await getVoiceChannel(voiceChannel.id, guildId);
  if (!vc || vc.guildId !== guildId) {
    await interaction.reply({
      content: "This voice channel is not managed by the bot.",
      ephemeral: true,
    });
    return;
  }

  const config = await getConfig(guildId);
  if (!config) {
    await interaction.reply({ content: "No config found.", ephemeral: true });
    return;
  }

  const isOwner = vc.ownerId === member.user.id;
  const isOrphaned =
    !isOwner &&
    !voiceChannel.members.has(vc.ownerId) &&
    Date.now() - vc.lastOwnerSeenAt >= config.claimTimeoutSeconds * 1000;

  switch (sub) {
    case "rename": {
      if (!isOwner) {
        await interaction.reply({
          content: "Only the channel owner can rename.",
          ephemeral: true,
        });
        return;
      }
      const name = interaction.options.getString("name", true);
      const { valid, error } = validateRename(name);
      if (!valid) {
        await interaction.reply({
          content: error ?? "Invalid name.",
          ephemeral: true,
        });
        return;
      }
      await (voiceChannel as VoiceChannel).setName(name.trim().slice(0, 100));
      await interaction.reply({
        content: "✏️ Channel renamed.",
        ephemeral: true,
      });
      return;
    }

    case "limit": {
      if (!isOwner) {
        await interaction.reply({
          content: "Only the channel owner can set the limit.",
          ephemeral: true,
        });
        return;
      }
      const num = interaction.options.getInteger("number", true);
      const { valid, error } = validateLimit(num);
      if (!valid) {
        await interaction.reply({
          content: error ?? "Invalid limit.",
          ephemeral: true,
        });
        return;
      }
      await (voiceChannel as VoiceChannel).setUserLimit(num);
      await interaction.reply({
        content: `👥 User limit set to ${num}.`,
        ephemeral: true,
      });
      return;
    }

    case "lock": {
      if (!isOwner) {
        await interaction.reply({
          content: "Only the channel owner can lock.",
          ephemeral: true,
        });
        return;
      }
      await setOwnerPermissions(voiceChannel as VoiceChannel, vc.ownerId, true);
      await setLocked(voiceChannel.id, true);
      await interaction.reply({
        content: "🔒 Channel locked.",
        ephemeral: true,
      });
      await log(interaction.client, guildId, "lock", {
        userId: member.user.id,
        userName: member.user.username,
        channelId: voiceChannel.id,
        guildName: interaction.guild?.name,
      });
      return;
    }

    case "unlock": {
      if (!isOwner) {
        await interaction.reply({
          content: "Only the channel owner can unlock.",
          ephemeral: true,
        });
        return;
      }
      await setOwnerPermissions(
        voiceChannel as VoiceChannel,
        vc.ownerId,
        false,
      );
      await setLocked(voiceChannel.id, false);
      await interaction.reply({
        content: "🔓 Channel unlocked.",
        ephemeral: true,
      });
      await log(interaction.client, guildId, "unlock", {
        userId: member.user.id,
        userName: member.user.username,
        channelId: voiceChannel.id,
        guildName: interaction.guild?.name,
      });
      return;
    }

    case "public": {
      if (!isOwner) {
        await interaction.reply({
          content: "Only the channel owner can change privacy.",
          ephemeral: true,
        });
        return;
      }
      await (voiceChannel as VoiceChannel).permissionOverwrites.edit(
        interaction.guild!.id,
        { Connect: true },
      );
      await interaction.reply({
        content: "🌐 Channel is now public.",
        ephemeral: true,
      });
      await log(interaction.client, guildId, "privacy_change", {
        userId: member.user.id,
        userName: member.user.username,
        channelId: voiceChannel.id,
        guildName: interaction.guild?.name,
        extra: "Public",
      });
      return;
    }

    case "private": {
      if (!isOwner) {
        await interaction.reply({
          content: "Only the channel owner can change privacy.",
          ephemeral: true,
        });
        return;
      }
      await (voiceChannel as VoiceChannel).permissionOverwrites.edit(
        interaction.guild!.id,
        { Connect: false },
      );
      await interaction.reply({
        content: "🔐 Channel is now private.",
        ephemeral: true,
      });
      await log(interaction.client, guildId, "privacy_change", {
        userId: member.user.id,
        userName: member.user.username,
        channelId: voiceChannel.id,
        guildName: interaction.guild?.name,
        extra: "Private",
      });
      return;
    }

    case "transfer": {
      if (!isOwner) {
        await interaction.reply({
          content: "Only the channel owner can transfer.",
          ephemeral: true,
        });
        return;
      }
      const targetUser = interaction.options.getUser("user", true);
      if (isBot(targetUser.id, interaction.client.user?.id ?? "")) {
        await interaction.reply({
          content: "Cannot transfer to the bot.",
          ephemeral: true,
        });
        return;
      }
      if (targetUser.bot) {
        await interaction.reply({
          content: "Cannot transfer to a bot.",
          ephemeral: true,
        });
        return;
      }
      const targetMember = await interaction
        .guild!.members.fetch(targetUser.id)
        .catch(() => null);
      if (targetMember && isAdmin(targetMember)) {
        await interaction.reply({
          content: "Cannot transfer to an admin (they already have access).",
          ephemeral: true,
        });
        return;
      }
      await updateOwner(voiceChannel.id, targetUser.id);
      await refreshRoomPanel(interaction.guild!, vc.textChannelId, config);
      const textCh = await interaction.client.channels.fetch(vc.textChannelId);
      if (textCh?.isTextBased()) {
        const { syncSideChatPermissions } =
          await import("../../services/VoiceService.js");
        await syncSideChatPermissions(
          voiceChannel as VoiceChannel,
          textCh as import("discord.js").TextChannel,
          targetUser.id,
        );
      }
      await setOwnerPermissions(
        voiceChannel as VoiceChannel,
        targetUser.id,
        false,
      );
      await interaction.reply({
        content: `↗️ Ownership transferred to ${targetUser}.`,
        ephemeral: true,
      });
      await log(interaction.client, guildId, "owner_transferred", {
        userId: member.user.id,
        userName: member.user.username,
        targetUserId: targetUser.id,
        targetUserName: targetUser.username,
        channelId: voiceChannel.id,
        guildName: interaction.guild?.name,
      });
      return;
    }

    case "unban": {
      if (!isOwner) {
        await interaction.reply({
          content: "Only the channel owner can unban.",
          ephemeral: true,
        });
        return;
      }
      const unbanTarget = interaction.options.getUser("user", true);
      await (voiceChannel as VoiceChannel).permissionOverwrites.delete(
        unbanTarget.id,
      );
      await interaction.reply({
        content: `✅ ${unbanTarget} has been unbanned from this channel.`,
        ephemeral: true,
      });
      await log(interaction.client, guildId, "unban", {
        userId: member.user.id,
        userName: member.user.username,
        targetUserId: unbanTarget.id,
        targetUserName: unbanTarget.username,
        channelId: voiceChannel.id,
        guildName: interaction.guild?.name,
      });
      return;
    }

    case "claim": {
      if (!isOrphaned) {
        await interaction.reply({
          content:
            "You can only claim when the owner has left for the configured timeout.",
          ephemeral: true,
        });
        return;
      }
      await updateOwner(voiceChannel.id, member.user.id);
      await refreshRoomPanel(interaction.guild!, vc.textChannelId, config);
      const textChannel = await interaction.client.channels.fetch(
        vc.textChannelId,
      );
      await setOwnerPermissions(
        voiceChannel as VoiceChannel,
        member.user.id,
        false,
      );
      if (textChannel?.isTextBased()) {
        const { syncSideChatPermissions } =
          await import("../../services/VoiceService.js");
        await syncSideChatPermissions(
          voiceChannel as VoiceChannel,
          textChannel as import("discord.js").TextChannel,
          member.user.id,
        );
      }
      await interaction.reply({
        content: "👑 You are now the owner of this channel.",
        ephemeral: true,
      });
      await log(interaction.client, guildId, "claim_executed", {
        userId: member.user.id,
        userName: member.user.username,
        channelId: voiceChannel.id,
        guildName: interaction.guild?.name,
      });
      return;
    }

    default:
      await interaction.reply({
        content: "Unknown subcommand.",
        ephemeral: true,
      });
  }
}
