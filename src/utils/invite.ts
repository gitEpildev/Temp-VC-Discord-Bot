import { PermissionFlagsBits } from "discord.js";

// Discord's voice status permission is bit 48.
const setVoiceChannelStatus = 1n << 48n;

export const REQUIRED_BOT_PERMISSIONS =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.ManageChannels |
  PermissionFlagsBits.ManageRoles |
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.MoveMembers |
  PermissionFlagsBits.MuteMembers |
  setVoiceChannelStatus;

export function buildInviteUrl(clientId: string): string {
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${REQUIRED_BOT_PERMISSIONS}&scope=bot%20applications.commands&integration_type=0`;
}
