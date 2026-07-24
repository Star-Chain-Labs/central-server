// export const oddsStore = new Map();
// export const fancyStore = new Map();
// export const marketMeta = new Map();
// export const eventToMarketId = new Map();

// export const setOdds = (marketId, data) => {
//   oddsStore.set(marketId, { ...data, ts: Date.now() });
// };

// export const getOdds = (marketId) => {
//   return oddsStore.get(marketId) || null;
// };

// export const getAllOdds = () => oddsStore;

// // ============= FANCY =============
// export const setFancy = (eventId, data) => {
//   fancyStore.set(eventId, { ...data, ts: Date.now() });
// };

// export const getFancy = (eventId) => {
//   return fancyStore.get(eventId) || null;
// };

// export const setMarketMeta = (marketId, data) => {
//   marketMeta.set(marketId, data);
// };

// export const getMarketMeta = (marketId) => {
//   return marketMeta.get(marketId) || null;
// };

// export const getAllMarketMeta = () => marketMeta;

// // ============= EVENT → MARKET MAPPING =============
// // const eventToMarketId = new Map(); // eventId → marketId

// export const setEventMarket = (eventId, marketId) => {
//   eventToMarketId.set(eventId, marketId);
// };

// export const getMarketIdByEvent = (eventId) => {
//   return eventToMarketId.get(eventId) || null;
// };

// // ============= STATS =============
// export const getStoreStats = () => ({
//   odds: oddsStore.size,
//   fancy: fancyStore.size,
//   markets: marketMeta.size,
//   events: eventToMarketId.size,
// });

// // ============= STALE CHECK =============
// export const ODDS_STALE_MS = 2500;
// export const FANCY_STALE_MS = 4000;

// export const isOddsStale = (marketId) => {
//   const data = oddsStore.get(marketId);
//   if (!data) return true;
//   return Date.now() - data.ts > ODDS_STALE_MS;
// };

// export const isFancyStale = (eventId) => {
//   const data = fancyStore.get(eventId);
//   if (!data) return true;
//   return Date.now() - data.ts > FANCY_STALE_MS;
// };

export const oddsStore = new Map();
export const fancyStore = new Map();
export const marketMeta = new Map();
export const eventToMarketId = new Map(); // eventId → marketId

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
