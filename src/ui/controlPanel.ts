import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  type MessageActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { GuildConfig } from "../db/postgres.js";

const CUSTOM_IDS = {
  rename: "vc:rename",
  limit: "vc:limit",
  lock: "vc:lock",
  unlock: "vc:unlock",
  public: "vc:public",
  private: "vc:private",
  transfer: "vc:transfer",
  claim: "vc:claim",
  kick: "vc:kick",
  ban: "vc:ban",
  banBtn: "vc:ban:btn",
  unban: "vc:unban",
  unbanBtn: "vc:unban:btn",
  adminLock: "vc:adminlock",
  whitelist: "vc:whitelist",
} as const;

export const MODAL_IDS = {
  rename: "vc:rename:modal",
  limit: "vc:limit:modal",
} as const;

export function buildControlPanelEmbed(
  config: GuildConfig,
  ownerName?: string,
  createdAt?: number,
): EmbedBuilder {
  const color = parseInt(config.brandColor.replace("#", ""), 16) || 0x5865f2;

  return new EmbedBuilder()
    .setTitle("🎛 Voice Room Controls")
    .setDescription(
      "**Manage your voice channel using the options below.**\n\n" +
        "**Core Controls** - Rename, limit, lock access\n" +
        "**Visibility** - Public or private access\n" +
        "**Ownership** - Claim and transfer room ownership\n" +
        "**Moderation** - Kick, ban, and unban members\n" +
        "**Admin Controls** - Admin only channel lock",
    )
    .setColor(color)
    .setFooter({
      text: ownerName ? `✧ ${ownerName}'s Voice` : "✧ Voice Controls",
    })
    .setTimestamp(createdAt ?? Date.now());
}

export function buildControlPanelComponents(options?: {
  locked?: boolean;
  adminLocked?: boolean;
}): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const locked = options?.locked ?? false;
  const adminLocked = options?.adminLocked ?? false;

  const row1 =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.rename)
        .setLabel("Rename")
        .setEmoji({ name: "✏️" })
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.limit)
        .setLabel("Limit")
        .setEmoji({ name: "👥" })
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(locked ? CUSTOM_IDS.unlock : CUSTOM_IDS.lock)
        .setLabel(locked ? "Unlock" : "Lock")
        .setEmoji({ name: locked ? "🔓" : "🔒" })
        .setStyle(locked ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.adminLock)
        .setLabel(adminLocked ? "Admin Unlock" : "Admin Lock")
        .setEmoji({ name: "🛡️" })
        .setStyle(adminLocked ? ButtonStyle.Secondary : ButtonStyle.Danger),
    );

  const row2 =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.public)
        .setLabel("Public")
        .setEmoji({ name: "🌐" })
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.private)
        .setLabel("Private")
        .setEmoji({ name: "🔐" })
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.claim)
        .setLabel("Claim")
        .setEmoji({ name: "👑" })
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.banBtn)
        .setLabel("Ban")
        .setEmoji({ name: "🚫" })
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.unbanBtn)
        .setLabel("Unban")
        .setEmoji({ name: "✅" })
        .setStyle(ButtonStyle.Secondary),
    );

  const row3 =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.transfer)
        .setPlaceholder("↗️ Transfer")
        .setMinValues(1)
        .setMaxValues(1),
    );

  const row4 =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.kick)
        .setPlaceholder("👢 Kick")
        .setMinValues(1)
        .setMaxValues(1),
    );
  const row5 =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(CUSTOM_IDS.whitelist)
        .setPlaceholder("🛡 Whitelist")
        .setMinValues(1)
        .setMaxValues(1),
    );
  return [row1, row2, row3, row4, row5];
}

export function buildRenameModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(MODAL_IDS.rename)
    .setTitle("✏️ Rename Channel")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("name")
          .setLabel("Channel Name")
          .setPlaceholder("Enter new name (1-100 chars)")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(100)
          .setRequired(true),
      ),
    );
}

export function buildLimitModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(MODAL_IDS.limit)
    .setTitle("👥 Set User Limit")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("limit")
          .setLabel("User Limit")
          .setPlaceholder("0-99 (0 = unlimited)")
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(2)
          .setRequired(true),
      ),
    );
}
