ALTER TABLE voice_channels
ADD COLUMN IF NOT EXISTS "controlPanelMessageId" VARCHAR(20);
