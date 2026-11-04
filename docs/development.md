# Development

## Source layout

| Directory      | Responsibility                                              |
| -------------- | ----------------------------------------------------------- |
| `src/commands` | Slash commands and management permission checks             |
| `src/events`   | Voice state changes and control interactions                |
| `src/services` | Room lifecycle, ownership, recovery, panels and permissions |
| `src/db`       | PostgreSQL access and additive migrations                   |
| `src/ui`       | Embeds, buttons and modals                                  |
| `src/utils`    | Timers, validation and invite permissions                   |
| `tests`        | Room safety, panel and ownership regression tests           |

## Checks

```bash
npm ci
npm run lint
npm test
npm run build
npm run format:check
```

Use `npm run format` to apply formatting. Use short `//` comments only where an explanation is useful. Write documentation and user-facing messages in UK English without em dashes or en dashes. Preserve external API identifiers and the supplied licence wording.

## PostgreSQL integration test

Create a separate database named `voicebot_regression_` followed by digits, for example `voicebot_regression_20261104`. Set `TEST_DATABASE_URL` to its connection string and run `npm test`.

The integration test clears tables in this separate database. It checks migration repeatability, ownership across servers, concurrent claims and lock release after failure. Without `TEST_DATABASE_URL`, this test is skipped and the isolated regression tests still run.

## Safety checks

Tests cover protected channels, human and bot occupants, arrivals during cleanup, failed channel deletion, unavailable gateway state, missing channels, recovery failures and old panel updates. Test lifecycle changes against these cases before deploying.

Channel deletion belongs in `ChannelSafetyService`. Never delete unrecognised category children or discard a room record because a fetch failed.
