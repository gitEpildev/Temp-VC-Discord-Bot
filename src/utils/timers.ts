const deleteTimers = new Map<string, NodeJS.Timeout>();

export function scheduleDelete(
  voiceChannelId: string,
  delayMs: number,
  callback: () => void | Promise<void>,
): void {
  cancelDelete(voiceChannelId);
  const timer = setTimeout(async () => {
    deleteTimers.delete(voiceChannelId);
    try {
      await callback();
    } catch (error) {
      console.error(`Room deletion failed for ${voiceChannelId}:`, error);
    }
  }, delayMs);
  deleteTimers.set(voiceChannelId, timer);
}

export function cancelDelete(voiceChannelId: string): void {
  const existing = deleteTimers.get(voiceChannelId);
  if (existing) {
    clearTimeout(existing);
    deleteTimers.delete(voiceChannelId);
  }
}

export function hasDeleteTimer(voiceChannelId: string): boolean {
  return deleteTimers.has(voiceChannelId);
}
