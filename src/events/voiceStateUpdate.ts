import type { VoiceState } from "discord.js";
import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getConfig } from "../services/ConfigService.js";

import {
  getVoiceChannel,
  createVoiceChannel,
  canCreateChannel,
  updateLastOwnerSeen,
  addMemberToSideChat,
  removeMemberFromSideChat,
} from "../services/VoiceService.js";
import { isAdmin } from "../services/PermissionService.js";
import { isWhitelisted } from "../services/WhitelistService.js";
import { cancelDelete } from "../utils/timers.js";
import { scheduleEmptyRoomDeletion } from "../services/ChannelSafetyService.js";
import { log } from "../services/LoggingService.js";

const creationLocks = new Set<string>();

function creationLockKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}
export function registerVoiceStateUpdate(client: Client): void {
  client.on(
    "voiceStateUpdate",
    async (oldState: VoiceState, newState: VoiceState) => {
      try {
        if (oldState.channelId === newState.channelId) return;
        if (newState.channelId) cancelDelete(newState.channelId);
        const guildId = newState.guild.id;

        if (newState.channelId && newState.member) {
          const vc = await getVoiceChannel(newState.channelId!, guildId);
          if (vc && vc.ownerId === newState.member.id) {
            await updateLastOwnerSeen(newState.channelId!, Date.now());
          }
        }

        const config = await getConfig(guildId);
        if (!config || !config.enabled) return;

        const leftChannelId = oldState.channelId;
        if (leftChannelId) {
          const vcLeft = await getVoiceChannel(leftChannelId, guildId);
          if (vcLeft) {
            const textChannel = await client.channels
              .fetch(vcLeft.textChannelId)
              .catch(() => null);

            if (oldState.member && textChannel?.isTextBased()) {
              await removeMemberFromSideChat(
                textChannel as import("discord.js").TextChannel,
                oldState.member.id,
              );
            }

            scheduleEmptyRoomDeletion(
              newState.guild,
              leftChannelId,
              config.deleteDelaySeconds,
            );

            if (oldState.member?.id === vcLeft.ownerId) {
              await updateLastOwnerSeen(leftChannelId, Date.now());
            }
          }
        }

        if (
          config.creatorChannelId &&
          newState.channelId === config.creatorChannelId
        ) {
          const member = newState.member;
          if (member && !member.user.bot) {
            const lockKey = creationLockKey(guildId, member.id);
            if (creationLocks.has(lockKey)) {
              return;
            }
            creationLocks.add(lockKey);

            try {
              const check = await canCreateChannel(guildId, member.id, config);
              if (!check.allowed) {
                await member.voice.disconnect();
                try {
                  const dm = await member.createDM();
                  const embed = new EmbedBuilder()
                    .setTitle("Voice Channel Limit Reached")
                    .setDescription(check.reason ?? "Cannot create channel.")
                    .setColor(0x5865f2);
                  await dm.send({ embeds: [embed] });
                } catch {
                  if (config.controlPanelChannelId) {
                    const ch = await client.channels
                      .fetch(config.controlPanelChannelId)
                      .catch(() => null);
                    if (ch?.isTextBased() && "send" in ch) {
                      await (ch as import("discord.js").TextChannel).send({
                        content: `${member} ${check.reason ?? "Cannot create channel."}`,
                      });
                    }
                  }
                }
                return;
              }

              const guild = newState.guild;
              const { voiceChannel, textChannel } = await createVoiceChannel(
                guild,
                member,
                config,
              );

              await log(client, guildId, "channel_created", {
                userId: member.id,
                userName: member.user.username,
                channelId: voiceChannel.id,
                channelName: voiceChannel.name,
                guildName: guild.name,
              });
              await log(client, guildId, "side_chat_created", {
                userId: member.id,
                userName: member.user.username,
                channelId: textChannel.id,
                channelName: textChannel.name,
                guildName: guild.name,
              });
            } finally {
              creationLocks.delete(lockKey);
            }
          }
          return;
        }

        const joinedChannelId = newState.channelId;
        if (joinedChannelId) {
          const vc = await getVoiceChannel(joinedChannelId, guildId);
          if (vc && newState.member) {
            const joinMember =
              (await newState.guild.members
                .fetch(newState.member.id)
                .catch(() => null)) ?? newState.member;
            if (vc.adminLocked && !isAdmin(joinMember)) {
              if (await isWhitelisted(joinedChannelId, joinMember.id)) {
                cancelDelete(joinedChannelId);
                const textChannel = await client.channels.fetch(
                  vc.textChannelId,
                );
                if (textChannel?.isTextBased()) {
                  await addMemberToSideChat(
                    textChannel as import("discord.js").TextChannel,
                    joinMember.id,
                  );
                }
                if (joinMember.id === vc.ownerId) {
                  await updateLastOwnerSeen(joinedChannelId, Date.now());
                }
                return;
              }
              try {
                await newState.disconnect();
              } catch {
                try {
                  await joinMember.voice.disconnect();
                } catch {
                  // Continue if this optional Discord action fails.
                }
              }
              try {
                const dm = await joinMember.createDM();
                const embed = new EmbedBuilder()
                  .setTitle("Voice Channel Restricted")
                  .setDescription(
                    "This voice channel is restricted to administrators.",
                  )
                  .setColor(0x5865f2);
                await dm.send({ embeds: [embed] });
              } catch {
                const textChannel = await client.channels
                  .fetch(vc.textChannelId)
                  .catch(() => null);
                if (textChannel?.isTextBased() && "send" in textChannel) {
                  const embed = new EmbedBuilder()
                    .setTitle("Voice Channel Restricted")
                    .setDescription(
                      "This voice channel is restricted to administrators.",
                    )
                    .setColor(0x5865f2);
                  await (textChannel as import("discord.js").TextChannel).send({
                    content: `${joinMember}`,
                    embeds: [embed],
                  });
                }
              }
              return;
            }
            cancelDelete(joinedChannelId);
            const textChannel = await client.channels.fetch(vc.textChannelId);
            if (textChannel?.isTextBased()) {
              await addMemberToSideChat(
                textChannel as import("discord.js").TextChannel,
                joinMember.id,
              );
            }
            if (joinMember.id === vc.ownerId) {
              await updateLastOwnerSeen(joinedChannelId, Date.now());
            }
          }
        }
      } catch (err) {
        console.error("voiceStateUpdate error:", err);
      }
    },
  );
}
