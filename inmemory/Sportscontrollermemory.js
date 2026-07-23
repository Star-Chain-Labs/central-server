import Competition from "../models/Competition.model.js";
import Event from "../models/event.model.js";
import FancyMarket from "../models/fancyMarket.model.js";
import Market from "../models/Market.model.js";
import Odds from "../models/Odds.model.js";
import Sport from "../models/Sport.model.js";
import {
  getOdds,
  getFancy,
  getMarketIdByEvent,
  getMarketMeta,
  isOddsStale,
  isFancyStale,
  getStoreStats,
} from "./Oddsstore.js";

const STALE_MS = 2500;

// ============= SPORTS =============
export const getSports = async (req, res) => {
  try {
    const sports = await Sport.find({ isActive: true }).lean();
    return res.status(200).json({ status: true, data: sports });
  } catch (err) {
    return res
      .status(500)
      .json({ status: false, msg: "Failed to fetch sports" });
  }
};

// ============= COMPETITION LIST =============
export const getCompetitionList = async (req, res) => {
  try {
    const { sportId } = req.params;
    const competitions = await Competition.find({ sportId }).lean();

    if (competitions.length === 0) return res.status(200).json([]);

    return res.status(200).json(
      competitions.map((c) => ({
        competition: { id: c.competitionId, name: c.name },
        competitionRegion: c.region,
        marketCount: c.marketCount,
      })),
    );
  } catch (err) {
    return res
      .status(500)
      .json({ status: false, msg: "Failed to fetch competitions" });
  }
};

// ============= EVENT LIST =============
export const getEventList = async (req, res) => {
  try {
    const { sportId } = req.params;
    const events = await Event.find({ sportId }).sort({ openDate: 1 }).lean();

    if (events.length === 0) {
      return res.status(200).json({ status: true, data: [] });
    }

    // Market runners — DB se (slow-changing data)
    const eventIds = events.map((e) => e.eventId);
    const markets = await Market.find({
      eventId: { $in: eventIds },
      marketName: "Match Odds",
    }).lean();

    const marketByEvent = Object.fromEntries(
      markets.map((m) => [m.eventId, m]),
    );

    const merged = events.map((ev) => {
      const market = marketByEvent[ev.eventId];

      // ✅ Odds — Memory se (fast, real-time)
      const marketId = market?.marketId;
      const stale = !marketId || isOddsStale(marketId);
      const oddsData = stale ? null : getOdds(marketId);

      let odds = null;
      if (market) {
        const selections = market.runners.map((r) => {
          const live = oddsData?.runners?.find(
            (ro) => ro.selectionId === r.selectionId,
          );

          // ✅ Stale → SUSPENDED
          if (stale || !live) {
            return {
              teamName: r.runnerName,
              suspended: true,
              back: null,
              lay: null,
            };
          }

          return {
            teamName: r.runnerName,
            suspended: live.status !== "ACTIVE",
            back: live.availableToBack?.[0] || null,
            lay: live.availableToLay?.[0] || null,
          };
        });

        odds = {
          inPlay: oddsData?.inPlay ?? false,
          status: stale ? "SUSPENDED" : oddsData?.status || "OPEN",
          selections,
        };
      }

      return {
        event: {
          id: ev.eventId,
          name: ev.name,
          countryCode: ev.countryCode,
          timezone: ev.timezone,
          openDate: ev.openDate,
        },
        isPremiumActive: ev.isPremiumActive ? "1" : "0",
        marketCount: ev.marketCount,
        odds,
      };
    });

    return res.status(200).json({ status: true, data: merged });
  } catch (err) {
    console.error("getEventList error:", err.message);
    return res
      .status(500)
      .json({ status: false, msg: "Failed to fetch events" });
  }
};

// ============= EVENT LIST BY COMPETITION =============
export const getEventListByCompetition = async (req, res) => {
  try {
    const { sportId, competitionId } = req.params;
    const events = await Event.find({ sportId, competitionId })
      .sort({ openDate: 1 })
      .lean();

    if (events.length === 0) return res.status(200).json([]);

    return res.status(200).json(
      events.map((e) => ({
        event: {
          id: e.eventId,
          name: e.name,
          countryCode: e.countryCode,
          timezone: e.timezone,
          openDate: e.openDate,
        },
        marketCount: e.marketCount,
      })),
    );
  } catch (err) {
    return res
      .status(500)
      .json({ status: false, msg: "Failed to fetch events" });
  }
};

// ============= MARKET ALL LIST =============
export const getMarketAllList = async (req, res) => {
  try {
    const { eventId } = req.params;
    const markets = await Market.find({ eventId }).lean();

    if (markets.length === 0) return res.status(200).json([]);

    return res.status(200).json(
      markets.map((m) => ({
        marketId: m.marketId,
        marketName: m.marketName,
        runners: m.runners,
        totalMatched: m.totalMatched,
      })),
    );
  } catch (err) {
    return res
      .status(500)
      .json({ status: false, msg: "Failed to fetch markets" });
  }
};

// ============= MARKET ODDS =============
export const getMarketOdds = async (req, res) => {
  try {
    const { marketId } = req.params;

    // ✅ Memory se read
    const stale = isOddsStale(marketId);
    const oddsData = stale ? null : getOdds(marketId);

    if (stale || !oddsData) {
      return res.status(200).json({
        status: true,
        data: {
          marketId,
          status: "SUSPENDED",
          inPlay: false,
          runners: [],
        },
      });
    }

    return res.status(200).json({ status: true, data: oddsData });
  } catch (err) {
    return res.status(500).json({ status: false, msg: "Failed to fetch odds" });
  }
};

// ============= FANCY V3 =============
export const getFancyOddsV3 = async (req, res) => {
  try {
    const { eventId } = req.params;

    const marketId = getMarketIdByEvent(eventId);
    const stale = !marketId || isOddsStale(marketId);
    const oddsData = stale ? null : getOdds(marketId);

    if (!oddsData) {
      return res.status(200).json({ status: true, data: [] });
    }

    // Market runners DB se
    const market = await Market.findOne({
      eventId,
      marketName: "Match Odds",
    }).lean();

    if (!market) return res.status(200).json({ status: true, data: [] });

    const section = market.runners.map((r) => {
      const live = oddsData.runners?.find(
        (ro) => ro.selectionId === r.selectionId,
      );
      const odds = [];

      (live?.availableToBack || []).forEach((b, i) =>
        odds.push({ odds: b.price, otype: "back", tno: i, size: b.size }),
      );
      (live?.availableToLay || []).forEach((l, i) =>
        odds.push({ odds: l.price, otype: "lay", tno: i, size: l.size }),
      );

      return {
        sid: r.selectionId,
        nat: r.runnerName,
        gstatus: stale ? "SUSPENDED" : live?.status || "ACTIVE",
        odds: stale ? [] : odds,
      };
    });

    return res.status(200).json({
      status: true,
      data: [
        {
          gtype: "match",
          mname: "MATCH_ODDS",
          status: stale ? "SUSPENDED" : oddsData.status,
          section,
        },
      ],
    });
  } catch (err) {
    return res.status(500).json({ status: false, msg: "Failed to fetch odds" });
  }
};

// ============= FANCY BOOKMAKER =============
export const getFancyOdds = async (req, res) => {
  try {
    const { eventId } = req.params;

    // ✅ Memory se read
    const stale = isFancyStale(eventId);
    const doc = stale ? null : getFancy(eventId);

    if (stale || !doc) {
      return res.status(200).json({
        bookmaker: [],
        fancy: [],
        status: true,
        error: false,
      });
    }

    const bookmaker = doc.bookmaker.map((b) => ({
      sid: b.sid,
      nat: b.nat,
      b1: b.b1,
      bs1: b.bs1,
      l1: b.l1,
      ls1: b.ls1,
      min: b.min,
      max: b.max,
      s: b.status,
    }));

    const fancy = doc.fancy.map((f) => ({
      SelectionId: f.selectionId,
      RunnerName: f.runnerName,
      gtype: f.gtype,
      BackPrice1: f.backPrice,
      BackSize1: f.backSize,
      LayPrice1: f.layPrice,
      LaySize1: f.laySize,
      min: f.min,
      max: f.max,
      rem: f.remark,
    }));

    return res.status(200).json({
      bookmaker,
      fancy,
      status: true,
      error: false,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ status: false, msg: "Failed to fetch fancy" });
  }
};

// ============= HEALTH =============
export const getHealth = async (req, res) => {
  return res.status(200).json({
    status: true,
    data: { message: "API is running", timestamp: new Date() },
  });
};

// ============= STATS =============
export const getStats = async (req, res) => {
  try {
    const [sports, competitions, events, markets] = await Promise.all([
      Sport.countDocuments(),
      Competition.countDocuments(),
      Event.countDocuments(),
      Market.countDocuments(),
    ]);

    // ✅ Memory store stats
    const memStats = getStoreStats();

    return res.status(200).json({
      status: true,
      data: {
        sports,
        competitions,
        events,
        markets,
        // Memory store
        inMemory: {
          odds: memStats.odds,
          fancy: memStats.fancy,
          marketsMeta: memStats.markets,
        },
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ status: false, msg: "Failed to fetch stats" });
  }
};
