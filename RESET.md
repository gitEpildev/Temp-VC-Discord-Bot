# Recovery and reset

Use `/repair` first when a room panel is missing or permissions need refreshing. Repair updates existing panels and retains occupied and protected rooms.

## Deploy an update

Back up PostgreSQL before changing a running installation:

```bash
docker compose exec -T postgres pg_dump -U voicebot voicebot > voicebot-backup.sql
```

Keep the backup outside the public repository. Rebuild and restart only the app:

```bash
docker compose build app
docker compose up -d --no-deps app
docker compose logs --tail=50 app
```

Restarting the app does not disconnect voice participants. Startup checks room occupancy before scheduling deletion and checks again when the timer runs. Users and bots both count as occupants.

Channel `1554548888289943663` and text channel `1554548892023005224` are protected even when empty. Database errors and Discord permission or network errors do not cause their records to be removed.

## Recreate setup

`/setup` retains an existing working setup. `/reset` creates a new category and creator channel, removes eligible empty rooms, and retains occupied rooms, protected rooms and the old category. The new deletion delay is 10 seconds.

Neither command is needed for a normal deployment. Do not delete the database volume as a troubleshooting step.

If commands are missing, check the app logs and refresh Discord. Commands are registered globally on startup. The server owner and configured bot owners can run management commands.
