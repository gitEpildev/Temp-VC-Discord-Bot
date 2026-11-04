import {
  type Guild,
  type GuildMember,
  type VoiceChannel,
  type TextChannel,
  PermissionFlagsBits,
} from "discord.js";

export function getBotOwnerIds(): string[] {
  const raw = process.env.BOT_OWNER ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isBotOwner(userId: string): boolean {
  return getBotOwnerIds().includes(userId);
}

export function isGuildOwner(guild: Guild, userId: string): boolean {
  return guild.ownerId === userId;
}

export function canRunAdminCommand(
  guild: Guild | null,
  userId: string,
): boolean {
  if (!guild) return false;
  return isBotOwner(userId) || isGuildOwner(guild, userId);
}

export function isAdmin(member: GuildMember): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

export const ADMIN_LOCK_VOICE_STATUS_TEXT = "Admin Lock On";

async function syncVoiceChannelStatusForAdminLock(
  voiceChannel: VoiceChannel,
  adminLockEnabled: boolean,
): Promise<void> {
  try {
    await voiceChannel.client.rest.put(
      `/channels/${voiceChannel.id}/voice-status`,
      {
        body: { status: adminLockEnabled ? ADMIN_LOCK_VOICE_STATUS_TEXT : "" },
      },
    );
  } catch (err) {
    console.error(
      `Voice channel status could not be updated for ${voiceChannel.id} (Admin Lock). Guild may lack the feature or the bot may need Manage Channels:`,
      err,
    );
  }
}

export async function setAdminLockVoicePermissions(
  voiceChannel: VoiceChannel,
  ownerId: string,
  adminLockEnabled: boolean,
  ownerLockActive: boolean,
  whitelistUserIds: string[],
): Promise<void> {
  const guild = voiceChannel.guild;

  if (adminLockEnabled) {
    await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: false });
    await voiceChannel.permissionOverwrites.edit(ownerId, {
      ManageChannels: true,
      MuteMembers: true,
      MoveMembers: true,
      Connect: true,
    });

    for (const [, role] of guild.roles.cache) {
      if (role.id === guild.id) continue;
      if (
        role.permissions.has(PermissionFlagsBits.Administrator) ||
        role.permissions.has(PermissionFlagsBits.ManageGuild)
      ) {
        await voiceChannel.permissionOverwrites.edit(role.id, {
          Connect: true,
        });
      }
    }

    for (const uid of whitelistUserIds) {
      await voiceChannel.permissionOverwrites.edit(uid, { Connect: true });
    }
  } else {
    await setOwnerPermissions(voiceChannel, ownerId, ownerLockActive);
  }

  await syncVoiceChannelStatusForAdminLock(voiceChannel, adminLockEnabled);
}

export function isBot(userId: string, clientUserId: string): boolean {
  return userId === clientUserId;
}

export async function setOwnerPermissions(
  channel: VoiceChannel,
  ownerId: string,
  lock: boolean,
): Promise<void> {
  await channel.permissionOverwrites.edit(ownerId, {
    ManageChannels: true,
    MuteMembers: true,
    MoveMembers: true,
    Connect: true,
  });

  await channel.permissionOverwrites.edit(channel.guild.id, {
    Connect: !lock,
  });
}

export async function setSideChatPermissions(
  textChannel: TextChannel,
  voiceChannel: VoiceChannel,
  ownerId: string,
  memberIds: string[],
  adminIds: string[],
): Promise<void> {
  const allIds = new Set([ownerId, ...memberIds, ...adminIds]);

  for (const id of allIds) {
    await textChannel.permissionOverwrites.edit(id, {
      ViewChannel: true,
      SendMessages: true,
    });
  }
}

export async function addSideChatAccess(
  textChannel: TextChannel,
  memberId: string,
): Promise<void> {
  await textChannel.permissionOverwrites.edit(memberId, {
    ViewChannel: true,
    SendMessages: true,
  });
}

export async function revokeSideChatAccess(
  textChannel: TextChannel,
  memberId: string,
): Promise<void> {
  try {
    await textChannel.permissionOverwrites.delete(memberId);
  } catch {
    // Continue if this optional Discord action fails.
  }
}
