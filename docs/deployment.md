# Deployment and recovery

## Before updating

Keep a database backup outside the repository:

```bash
docker compose exec -T postgres pg_dump -U voicebot voicebot > /path/to/backups/voicebot.sql
```

Use an existing backup directory. Keep the current image available if a rollback is needed.

## Deploy the app

```bash
npm ci
npm run lint
npm test
npm run build
npm run format:check
docker compose build app
docker compose up -d --no-deps app
docker compose logs --tail=50 app
```

Only the app is recreated. The PostgreSQL container and its volume stay in place. Startup applies additive migrations and refreshes existing room panels automatically.

## Active rooms

An update edits the existing panel and refreshes the bot's channel access in place. It does not recreate occupied voice rooms or reset their creation timestamps. Panel message IDs are stored so future updates can edit the same message. Older panels are located by searching message history.

Users and bots both count as occupants. Empty rooms are checked when a timer is scheduled and immediately before deletion. Gateway unavailability, Discord permission errors and network failures retain room records for later repair.

Voice channel `1554548888289943663` and text channel `1554548892023005224` remain protected even when empty. Do not run `/reset` for a normal release or delete the database volume during troubleshooting.

## Repair

Use `/repair` to refresh controls and synchronise permissions without recreating rooms. `/setup` retains a working setup. `/reset` creates a new setup and removes eligible empty rooms, while retaining occupied rooms, protected rooms and the old category.

Check the logs if a panel cannot be updated. Restore the required permissions and run `/repair` again. A missing text channel does not cause an occupied voice channel to be deleted.

## Rollback

Restore the previous application image and recreate only the app. Retain the database and its records. Release 1.1 adds an optional panel message ID column, so older application code can still read the existing room fields. Review older versions' cleanup behaviour before returning to them.
