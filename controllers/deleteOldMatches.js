export const cleanupStaleEntries = () => {
  const now = Date.now();
  const MAX_AGE = 6 * 60 * 60 * 1000;

  let removed = { odds: 0, fancy: 0, meta: 0, evMap: 0 };

  for (const [k, v] of oddsStore.entries()) {
    if (now - v.ts > MAX_AGE) {
      oddsStore.delete(k);
      removed.odds++;
    }
  }
  for (const [k, v] of fancyStore.entries()) {
    if (now - v.ts > MAX_AGE) {
      fancyStore.delete(k);
      removed.fancy++;
    }
  }
  for (const [k] of marketMeta.entries()) {
    if (!oddsStore.has(k)) {
      marketMeta.delete(k);
      removed.meta++;
    }
  }
  for (const [eventId, marketId] of eventToMarketId.entries()) {
    if (!marketMeta.has(marketId)) {
      eventToMarketId.delete(eventId);
      removed.evMap++;
    }
  }

  if (removed.odds + removed.fancy + removed.meta + removed.evMap > 0) {
    console.log(`🧹 [Cleanup]`, removed);
  }
};
