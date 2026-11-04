# Configuration

Copy `.env.example` to `.env` before starting the bot. Keep tokens and database credentials out of version control.

## Environment variables

| Variable                | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `BOT_TOKEN`             | Discord bot token                                           |
| `CLIENT_ID`             | Discord application ID for manual command registration      |
| `DATABASE_URL`          | PostgreSQL connection string                                |
| `BOT_OWNER`             | Comma-separated user IDs allowed to use management commands |
| `PROTECTED_CHANNEL_IDS` | Additional channel IDs to retain, separated by commas       |

Docker Compose supplies its own database connection string to the app. The `.env` connection string is used when running the app directly.

## Server settings

Run `/setup` once in each server. The server owner and configured bot owners can change settings with `/config set option value`.

| Option               | Default             | Accepted value                                                        |
| -------------------- | ------------------- | --------------------------------------------------------------------- |
| `nametemplate`       | `{username}'s Room` | 1-100 characters, including `{username}`                              |
| `brandcolor`         | `#5865F2`           | A six-digit hexadecimal colour                                        |
| `cooldown`           | `60`                | Seconds between room creations, from 0 to 86400                       |
| `deletedelay`        | `10`                | Seconds before empty room cleanup, from 0 to 86400                    |
| `claimtimeout`       | `120`               | Seconds before an absent owner's room can be claimed, from 0 to 86400 |
| `maxchannelsperuser` | `1`                 | Fixed at one room per user per server                                 |

The `brandcolor` identifier is retained for compatibility. Bot messages and documentation use UK English.

Deletion timers have a minimum delay of one second. Existing settings remain in place when upgrading. `/reset` sets the new deletion delay to 10 seconds.

## Ownership and protection

A user can own one room in each server. Creation, transfer and claim use the same database lock to prevent concurrent actions from bypassing this limit. Existing rooms are not removed to enforce a new limit.

Voice channel `1554548888289943663` and its text channel `1554548892023005224` are always protected. Additional IDs in `PROTECTED_CHANNEL_IDS` extend this protection. Protecting a room's voice ID also retains its paired text channel and database record during cleanup.

## Panel identity

Room footers use the owner's account username with an initial capital, such as `✧ Epildev's Voice`. Server nicknames are not used. The timestamp remains the room's original creation time. Discord formats it for each viewer.
