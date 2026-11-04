# Permissions and invitation

[Invite the bot to your server](https://discord.com/oauth2/authorize?client_id=1476740098711224352&permissions=281475267251216&scope=bot%20applications.commands&integration_type=0).

This link is for application `1476740098711224352`. It requests the `bot` and `applications.commands` scopes and permission value `281475267251216`.

## Required permissions

| Permission               | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| View Channels            | Read managed channels and locate room panels                       |
| Send Messages            | Send controls, command responses and event logs                    |
| Embed Links              | Display room panels and log embeds                                 |
| Read Message History     | Find and update existing panels                                    |
| Manage Channels          | Create, rename and remove eligible temporary rooms                 |
| Manage Roles             | Edit channel permission overwrites for locks, bans and chat access |
| Connect                  | Keep access to voice rooms and move members to them                |
| Move Members             | Move room creators and disconnect users through room moderation    |
| Mute Members             | Grant the room owner's existing voice moderation permission        |
| Set Voice Channel Status | Display the administrator lock status                              |

Administrator permission is not requested. The code explicitly retains the bot's access to private text chats and locked voice rooms. Server and category overwrites still need to allow the bot to reach the creator and log channels.

The permission values and channel requirements follow Discord's [permission reference](https://docs.discord.com/developers/topics/permissions) and [channel API reference](https://docs.discord.com/developers/resources/channel). Updating voice status requires Set Voice Channel Status and Manage Channels when the bot is outside the room.

## Gateway intents

Enable Server Members Intent in the [Discord Developer Portal](https://discord.com/developers/applications). The app requests Guilds, Guild Members, Guild Voice States and Guild Messages. It does not request Message Content Intent.

## Another bot application

Replace the `client_id` value in the invite link with your application's ID. Keep the permission value and scopes. Reauthorising an already installed bot does not remove permissions previously assigned to its roles; review those roles separately if replacing an older Administrator invite.
