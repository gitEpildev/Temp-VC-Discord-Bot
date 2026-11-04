import { query, queryOne, queryAll, type GuildConfig } from "../db/postgres.js";

const DEFAULTS = {
  nameTemplate: "{username}'s Room",
  brandColor: "#5865F2",
  cooldownSeconds: 60,
  deleteDelaySeconds: 10,
  claimTimeoutSeconds: 120,
  maxChannelsPerUser: 1,
} as const;

export type GuildConfigInput = Partial<
  Omit<GuildConfig, "guildId"> & { guildId: string }
>;

export type ResolvedGuildConfig = GuildConfig & {
  nameTemplate: string;
  brandColor: string;
  cooldownSeconds: number;
  deleteDelaySeconds: number;
  claimTimeoutSeconds: number;
  maxChannelsPerUser: number;
};

export async function getConfig(
  guildId: string,
): Promise<ResolvedGuildConfig | null> {
  const row = await queryOne<GuildConfig>(
    `SELECT * FROM guild_config WHERE "guildId" = $1`,
    [guildId],
  );
  if (!row) return null;
  return { ...DEFAULTS, ...row, maxChannelsPerUser: 1 } as ResolvedGuildConfig;
}

export async function upsertConfig(
  guildId: string,
  partial: Partial<Omit<GuildConfig, "guildId">>,
): Promise<void> {
  const keys = Object.keys(partial).filter(
    (k) => partial[k as keyof typeof partial] !== undefined,
  ) as (keyof Omit<GuildConfig, "guildId">)[];
  if (keys.length === 0) return;

  const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
  const values = [
    guildId,
    ...keys.map((k) => (partial as Record<string, unknown>)[k]),
  ];

  await query(
    `UPDATE guild_config SET ${setClause} WHERE "guildId" = $1`,
    values,
  );
}

export async function upsertConfigFull(
  guildId: string,
  data: Partial<GuildConfig>,
): Promise<void> {
  const full = {
    enabled: data.enabled ?? 1,
    categoryId: data.categoryId ?? null,
    creatorChannelId: data.creatorChannelId ?? null,
    controlPanelChannelId: data.controlPanelChannelId ?? null,
    controlPanelMessageId: data.controlPanelMessageId ?? null,
    logChannelId: data.logChannelId ?? null,
    nameTemplate: data.nameTemplate ?? DEFAULTS.nameTemplate,
    brandColor: data.brandColor ?? DEFAULTS.brandColor,
    cooldownSeconds: data.cooldownSeconds ?? DEFAULTS.cooldownSeconds,
    deleteDelaySeconds: data.deleteDelaySeconds ?? DEFAULTS.deleteDelaySeconds,
    claimTimeoutSeconds:
      data.claimTimeoutSeconds ?? DEFAULTS.claimTimeoutSeconds,
    maxChannelsPerUser: 1,
  };

  await query(
    `INSERT INTO guild_config (
      "guildId", enabled, "categoryId", "creatorChannelId", "controlPanelChannelId",
      "controlPanelMessageId", "logChannelId", "nameTemplate", "brandColor",
      "cooldownSeconds", "deleteDelaySeconds", "claimTimeoutSeconds", "maxChannelsPerUser"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT ("guildId") DO UPDATE SET
      enabled = EXCLUDED.enabled,
      "categoryId" = COALESCE(EXCLUDED."categoryId", guild_config."categoryId"),
      "creatorChannelId" = COALESCE(EXCLUDED."creatorChannelId", guild_config."creatorChannelId"),
      "controlPanelChannelId" = COALESCE(EXCLUDED."controlPanelChannelId", guild_config."controlPanelChannelId"),
      "controlPanelMessageId" = COALESCE(EXCLUDED."controlPanelMessageId", guild_config."controlPanelMessageId"),
      "logChannelId" = COALESCE(EXCLUDED."logChannelId", guild_config."logChannelId"),
      "nameTemplate" = EXCLUDED."nameTemplate",
      "brandColor" = EXCLUDED."brandColor",
      "cooldownSeconds" = EXCLUDED."cooldownSeconds",
      "deleteDelaySeconds" = EXCLUDED."deleteDelaySeconds",
      "claimTimeoutSeconds" = EXCLUDED."claimTimeoutSeconds",
      "maxChannelsPerUser" = EXCLUDED."maxChannelsPerUser"
    `,
    [
      guildId,
      full.enabled,
      full.categoryId,
      full.creatorChannelId,
      full.controlPanelChannelId,
      full.controlPanelMessageId,
      full.logChannelId,
      full.nameTemplate,
      full.brandColor,
      full.cooldownSeconds,
      full.deleteDelaySeconds,
      full.claimTimeoutSeconds,
      full.maxChannelsPerUser,
    ],
  );
}

export async function getGuildIds(): Promise<string[]> {
  const rows = await queryAll<{ guildId: string }>(
    `SELECT "guildId" FROM guild_config`,
  );
  return rows.map((r) => r.guildId);
}
