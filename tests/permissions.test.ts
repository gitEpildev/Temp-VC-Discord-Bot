import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PermissionFlagsBits,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import {
  buildInviteUrl,
  REQUIRED_BOT_PERMISSIONS,
} from "../src/utils/invite.js";
import {
  ensureBotChannelAccess,
  revokeSideChatAccess,
} from "../src/services/PermissionService.js";

test("invite requests the bot's permissions without Administrator", () => {
  const url = new URL(buildInviteUrl("1476740098711224352"));
  assert.equal(url.searchParams.get("client_id"), "1476740098711224352");
  assert.equal(url.searchParams.get("scope"), "bot applications.commands");
  assert.equal(url.searchParams.get("permissions"), "281475267251216");
  assert.equal(
    REQUIRED_BOT_PERMISSIONS & PermissionFlagsBits.Administrator,
    0n,
  );
  assert.notEqual(REQUIRED_BOT_PERMISSIONS & (1n << 48n), 0n);
});

for (const voice of [false, true]) {
  test(`private channel access updates only the bot overwrite, voice=${voice}`, async () => {
    const edits: { id: string; permissions: Record<string, boolean> }[] = [];
    const channel = {
      client: { user: { id: "bot" } },
      isVoiceBased: () => voice,
      permissionOverwrites: {
        edit: async (id: string, permissions: Record<string, boolean>) => {
          edits.push({ id, permissions });
        },
      },
    } as unknown as TextChannel | VoiceChannel;
    await ensureBotChannelAccess(channel);
    assert.equal(edits.length, 1);
    assert.equal(edits[0].id, "bot");
    assert.equal(edits[0].permissions.ViewChannel, true);
    assert.equal(edits[0].permissions.ManageRoles, true);
    assert.equal(
      edits[0].permissions[voice ? "Connect" : "SendMessages"],
      true,
    );
    assert.equal(edits[0].permissions.Administrator, undefined);
  });
}

test("the bot's chat access is retained when it leaves voice", async () => {
  let deleted = false;
  const channel = {
    client: { user: { id: "bot" } },
    permissionOverwrites: {
      delete: async () => {
        deleted = true;
      },
    },
  } as unknown as TextChannel;
  await revokeSideChatAccess(channel, "bot");
  assert.equal(deleted, false);
});
