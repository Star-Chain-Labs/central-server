export const oddsStore = new Map();
export const fancyStore = new Map();
export const marketMeta = new Map();
export const eventToMarketId = new Map();

export const setOdds = (marketId, data) => {
  oddsStore.set(marketId, { ...data, ts: Date.now() });
};

export const getOdds = (marketId) => {
  return oddsStore.get(marketId) || null;
};

export const getAllOdds = () => oddsStore;

// ============= FANCY =============
export const setFancy = (eventId, data) => {
  fancyStore.set(eventId, { ...data, ts: Date.now() });
};

export const getFancy = (eventId) => {
  return fancyStore.get(eventId) || null;
};

export const setMarketMeta = (marketId, data) => {
  marketMeta.set(marketId, data);
};

export const getMarketMeta = (marketId) => {
  return marketMeta.get(marketId) || null;
};

export const getAllMarketMeta = () => marketMeta;

// ============= EVENT → MARKET MAPPING =============
export const setEventMarket = (eventId, marketId) => {
  eventToMarketId.set(eventId, marketId);
};

export const getMarketIdByEvent = (eventId) => {
  return eventToMarketId.get(eventId) || null;
};

// ============= STATS =============
export const getStoreStats = () => ({
  odds: oddsStore.size,
  fancy: fancyStore.size,
  markets: marketMeta.size,
  events: eventToMarketId.size,
});

// ============= STALE CHECK =============
export const ODDS_STALE_MS = 2500;
export const FANCY_STALE_MS = 4000;

export const isOddsStale = (marketId) => {
  const data = oddsStore.get(marketId);
  if (!data) return true;
  return Date.now() - data.ts > ODDS_STALE_MS;
};

export const isFancyStale = (eventId) => {
  const data = fancyStore.get(eventId);
  if (!data) return true;
  return Date.now() - data.ts > FANCY_STALE_MS;
};

// ============= MEMORY CLEANUP =============
export const cleanupStaleEntries = () => {
  const now = Date.now();
  const MAX_AGE = 6 * 60 * 60 * 1000; // 6 hours

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
