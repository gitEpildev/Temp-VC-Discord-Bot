# Temp VC Discord Bot

[![CI](https://github.com/gitEpildev/Temp-VC-Discord-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/gitEpildev/Temp-VC-Discord-Bot/actions/workflows/ci.yml)
[![Docker smoke](https://github.com/gitEpildev/Temp-VC-Discord-Bot/actions/workflows/smoke.yml/badge.svg)](https://github.com/gitEpildev/Temp-VC-Discord-Bot/actions/workflows/smoke.yml)

A Discord bot for personal voice rooms. Joining the creator channel makes a voice room and a private text chat with controls.

Maintained by Epildev, Epildevconnect Ltd. Source: [gitEpildev/Temp-VC-Discord-Bot](https://github.com/gitEpildev/Temp-VC-Discord-Bot).

## Room behaviour

- Each user can own one room per server. Owning a room in one server does not prevent creation in another.
- Creation, transfer and claim share a database lock to enforce the ownership limit.
- Room panels show the owner's username with an initial capital, for example `✧ Epildev's Voice`, with the original room creation timestamp. Discord displays the time in the viewer's local format.
- Empty rooms are removed after the configured delay, which defaults to 10 seconds. Occupancy is checked again immediately before deletion. Bots count as occupants.
- Joining a room cancels pending deletion. Mute and deafen changes do not trigger room cleanup.
- Recovery retains room records when Discord returns a permission or network error. Unrecognised channels are never removed automatically.
- Channel `1554548888289943663` and its paired text channel `1554548892023005224` are protected from deletion, including during startup, repair and reset.

## Requirements

- Node.js 20 or later
- PostgreSQL 14 or later
- A Discord application with a bot token
- Server Members Intent enabled in the Discord Developer Portal

## Installation

```bash
npm ci
cp .env.example .env
```

Set these environment variables:

| Variable                | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `BOT_TOKEN`             | Discord bot token                                              |
| `CLIENT_ID`             | Discord application ID for command registration                |
| `DATABASE_URL`          | PostgreSQL connection string                                   |
| `BOT_OWNER`             | Comma-separated user IDs allowed to use management commands    |
| `PROTECTED_CHANNEL_IDS` | Optional additional channel IDs to retain, separated by commas |

The two built-in protected IDs remain protected even when the environment variable is empty.

[Invite the bot](https://discord.com/oauth2/authorize?client_id=1476740098711224352&permissions=281475267251216&scope=bot%20applications.commands&integration_type=0) with the permissions required by this application. See the [permission guide](docs/permissions.md) for the complete list and instructions for another bot application.

Start the bot:

```bash
npm run build
npm start
```

Startup applies the database migrations, registers commands globally and repairs room panels. Run `/setup` once in each server, then join its creator channel.

For Docker:

```bash
docker compose up -d --build
```

For an existing installation, rebuild only the app to preserve the database:

```bash
docker compose build app
docker compose up -d --no-deps app
```

## Commands

| Command                     | Purpose                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `/help`                     | Show available commands                                                       |
| `/setup`                    | Create a setup if one is missing, retaining existing rooms                    |
| `/config view`              | View server settings                                                          |
| `/config set`               | Update naming, colour, cooldown and deletion settings                         |
| `/setlogchannel`            | Choose the event log channel                                                  |
| `/enable`, `/disable`       | Enable or disable automation                                                  |
| `/repair`                   | Refresh panels, synchronise permissions and schedule empty room cleanup       |
| `/reset`                    | Recreate setup and remove empty rooms, retaining occupied and protected rooms |
| `/vc rename`, `/vc limit`   | Change the room name or user limit                                            |
| `/vc lock`, `/vc unlock`    | Control room access                                                           |
| `/vc public`, `/vc private` | Change room privacy                                                           |
| `/vc transfer`, `/vc claim` | Change room ownership within the per-server limit                             |
| `/vc unban`                 | Remove a room ban                                                             |

Room panels also provide kick, ban, administrator lock and whitelist controls. Management commands are restricted to the server owner and configured bot owners. Existing API and configuration identifiers, such as `brandcolor`, remain unchanged for compatibility.

## Development

```bash
npm run dev
npm run lint
npm test
npm run build
npm run format:check
```

The PostgreSQL integration test runs when `TEST_DATABASE_URL` points to a separate database named `voicebot_regression_` followed by digits. It clears only this test database. Without this variable, `npm test` runs the isolated regression tests and skips the database integration test.

Use `npm run format` to apply formatting. Source comments use short `//` explanations. Documentation and user-facing text use UK English without long dashes.

| Directory      | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `src/commands` | Slash commands and permission checks                        |
| `src/events`   | Voice state and interaction handlers                        |
| `src/services` | Room lifecycle, ownership, recovery, panels and permissions |
| `src/db`       | PostgreSQL helpers and additive migrations                  |
| `src/ui`       | Discord embeds, buttons and modals                          |
| `src/utils`    | Timers and validation                                       |
| `tests`        | Regression tests for room safety and ownership              |

## Documentation

- [Documentation index](docs/README.md)
- [Configuration](docs/configuration.md)
- [Permissions and invitation](docs/permissions.md)
- [Deployment and recovery](docs/deployment.md)
- [Development](docs/development.md)
- [Changelog](CHANGELOG.md)

## Licence and attribution

Copyright (c) 2026 Epildevconnect Ltd (Epildev). Distributed under the [MIT License with Additional Terms](LICENSE). Read the full licence for attribution, branding, resale and other conditions.

Epildevconnect Ltd is registered in England and Wales, Company No. 17247566.

[GitHub](https://github.com/GitEpildev) · [Website](https://developer.epildevconnect.uk/) · Discord: Epildev
