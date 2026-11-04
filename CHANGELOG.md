# Changelog

## Unreleased

### Added

- GitHub Actions checks on Node.js 20, 22 and 24 for lint, formatting, source style, builds and regression tests.
- PostgreSQL integration tests in a disposable CI database.
- A production Docker image smoke check without Discord or production credentials.
- Workflow badges and local smoke instructions.

## 1.1.1 - 4 November 2026

### Added

- Documentation for configuration, deployment, development and Discord permissions.
- A ready-made bot invite requesting the permissions used by the code.
- Explicit bot access to private text chats and locked voice rooms.
- The supplied MIT License with Additional Terms, company details and governing law wording.

### Changed

- Room footers use the account username with an initial capital, giving `✧ Epildev's Voice` for `epildev`.
- Existing panels and channel permissions update in place during startup and repair.
- Startup uses the current `clientReady` event.
- README, documentation and source comments use consistent formatting and UK English.

## 1.1.0 - 4 November 2026

### Fixed

- Empty room deletion rechecks occupancy immediately before removing channels, including bot occupants.
- Joining a room cancels pending deletion. Mute and deafen changes do not trigger cleanup.
- Recovery retains database records after Discord permission or network failures.
- Unrecognised channels are no longer deleted from the configured category.
- Channel `1554548888289943663` and its text channel are protected during startup, repair, setup and reset.
- Creation, transfer and claim enforce one room per user per server through shared database locks.
- Room panels retain their original timestamps and update existing messages.

### Changed

- Setup preserves an existing working configuration.
- Reset retains occupied and protected rooms.
- Large source comment blocks and long dashes have been removed.

### Added

- Regression tests for deletion safety, panel recovery and per-server ownership.
- A PostgreSQL integration test for migrations and concurrent ownership changes.
- An additive migration to store room panel message IDs.
