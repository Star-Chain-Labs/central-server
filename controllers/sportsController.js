// import Competition from "../models/Competition.model.js";
// import Event from "../models/event.model.js";
// import FancyMarket from "../models/fancyMarket.model.js";
// import Market from "../models/Market.model.js";
// import Odds from "../models/Odds.model.js";
// import Sport from "../models/Sport.model.js";

// /**
//  * GET /api/sports
//  */
// export const getSports = async (req, res) => {
//   try {
//     const sports = await Sport.find({ isActive: true }).lean();
//     res.json(sports);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * GET /api/betfair/competition-list/:sportId
//  */
// export const getCompetitionList = async (req, res) => {
//   try {
//     const { sportId } = req.params;
//     const competitions = await Competition.find({ sportId })
//       .lean()
//       .sort({ marketCount: -1 });

//     if (competitions.length === 0) {
//       return res.json([]);
//     }

//     const formatted = competitions.map((c) => ({
//       competition: {
//         id: c.competitionId,
//         name: c.name,
//       },
//       region: c.region,
//       marketCount: c.marketCount,
//     }));

//     res.json(formatted);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * GET /api/betfair/event-list/:sportId
//  */
// export const getEventList = async (req, res) => {
//   try {
//     const { sportId } = req.params;
//     const events = await Event.find({ sportId }).sort({ openDate: 1 }).lean();

//     if (events.length === 0) {
//       return res.json([]);
//     }

//     const eventIds = events.map((e) => e.eventId);
//     const matchOddsMarkets = await Market.find({
//       eventId: { $in: eventIds },
//       marketName: "Match Odds",
//     }).lean();

//     const marketIdByEvent = Object.fromEntries(
//       matchOddsMarkets.map((m) => [m.eventId, m]),
//     );

//     const marketIds = matchOddsMarkets.map((m) => m.marketId);
//     const oddsRows = await Odds.find({ marketId: { $in: marketIds } }).lean();
//     const oddsByMarketId = Object.fromEntries(
//       oddsRows.map((o) => [o.marketId, o]),
//     );

//     const merged = events.map((ev) => {
//       const market = marketIdByEvent[ev.eventId];
//       const oddsDoc = market ? oddsByMarketId[market.marketId] : null;

//       let odds = null;
//       if (market && oddsDoc) {
//         const selections = market.runners.map((r) => {
//           const live = oddsDoc.runners.find(
//             (ro) => ro.selectionId === r.selectionId,
//           );
//           const bestBack = live?.availableToBack?.[0];
//           const bestLay = live?.availableToLay?.[0];

//           return {
//             teamName: r.runnerName,
//             back: bestBack
//               ? { price: bestBack.price, size: bestBack.size }
//               : null,
//             lay: bestLay ? { price: bestLay.price, size: bestLay.size } : null,
//           };
//         });

//         odds = {
//           inPlay: oddsDoc.inPlay,
//           status: oddsDoc.status,
//           selections,
//         };
//       }

//       return {
//         event: {
//           id: ev.eventId,
//           name: ev.name,
//           openDate: ev.openDate,
//         },
//         marketCount: ev.marketCount,
//         odds,
//       };
//     });

//     res.json(merged);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * GET /api/betfair/event-list/:sportId/:competitionId
//  */
// export const getEventListByCompetition = async (req, res) => {
//   try {
//     const { sportId, competitionId } = req.params;
//     const events = await Event.find({ sportId, competitionId })
//       .sort({ openDate: 1 })
//       .lean();

//     if (events.length === 0) {
//       return res.json([]);
//     }

//     const formatted = events.map((e) => ({
//       event: {
//         id: e.eventId,
//         name: e.name,
//         openDate: e.openDate,
//       },
//       marketCount: e.marketCount,
//     }));

//     res.json(formatted);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * GET /api/betfair/market-all-list/:eventId
//  */
// export const getMarketAllList = async (req, res) => {
//   try {
//     const { eventId } = req.params;
//     const markets = await Market.find({ eventId }).lean();

//     if (markets.length === 0) {
//       return res.json([]);
//     }

//     const formatted = markets.map((m) => ({
//       marketId: m.marketId,
//       marketName: m.marketName,
//       runners: m.runners,
//       totalMatched: m.totalMatched,
//     }));

//     res.json(formatted);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * GET /api/betfair/fancy-all-bookmaker-odds-v3/:eventId
//  */
// export const getFancyOddsV3 = async (req, res) => {
//   try {
//     const { eventId } = req.params;

//     const market = await Market.findOne({
//       eventId,
//       marketName: "Match Odds",
//     }).lean();

//     if (!market) {
//       return res.json({ success: true, data: [] });
//     }

//     const oddsDoc = await Odds.findOne({ marketId: market.marketId }).lean();

//     if (!oddsDoc) {
//       return res.json({ success: true, data: [] });
//     }

//     const section = market.runners.map((r) => {
//       const live = oddsDoc.runners.find(
//         (ro) => ro.selectionId === r.selectionId,
//       );
//       const odds = [];

//       (live?.availableToBack || []).forEach((b, i) =>
//         odds.push({ odds: b.price, otype: "back", size: b.size }),
//       );
//       (live?.availableToLay || []).forEach((l, i) =>
//         odds.push({ odds: l.price, otype: "lay", size: l.size }),
//       );

//       return {
//         sid: r.selectionId,
//         nat: r.runnerName,
//         gstatus: live?.status || "ACTIVE",
//         odds,
//       };
//     });

//     const data = [
//       {
//         gtype: "match",
//         mname: "MATCH_ODDS",
//         status: oddsDoc.status,
//         section,
//       },
//     ];

//     res.json({ success: true, data });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * GET /api/betfair/fancy-bookmaker-odds/:eventId
//  */
// export const getFancyOdds = async (req, res) => {
//   try {
//     const { eventId } = req.params;

//     const fancy = await FancyMarket.find({
//       matchId: eventId,
//       status: "OPEN",
//     }).lean();

//     if (fancy.length === 0) {
//       return res.json({
//         bookmaker: [],
//         fancy: [],
//         status: true,
//         error: false,
//       });
//     }

//     const formatted = fancy.map((f) => ({
//       SelectionId: f.fancyId,
//       RunnerName: f.question,
//       gtype: f.category,
//       BackPrice: f.yesOdds,
//       LayPrice: f.noOdds,
//       min: f.minBet,
//       max: f.maxBet,
//     }));

//     res.json({
//       bookmaker: [],
//       fancy: formatted,
//       status: true,
//       error: false,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// /**
//  * GET /api/health
//  */
// export const getHealth = async (req, res) => {
//   res.json({ status: "ok", timestamp: new Date() });
// };

// /**
//  * GET /api/stats
//  */
// export const getStats = async (req, res) => {
//   try {
//     const stats = {
//       sports: await Sport.countDocuments(),
//       competitions: await Competition.countDocuments(),
//       events: await Event.countDocuments(),
//       markets: await Market.countDocuments(),
//       odds: await Odds.countDocuments(),
//       fancyMarkets: await FancyMarket.countDocuments(),
//     };
//     res.json(stats);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

import {
  Sport,
  Competition,
  Event,
  Market,
  Odds,
  FancyMarket,
} from "../models/Sports.js";

/**
 * GET /api/sports
 */
export const getSports = async (req, res) => {
  try {
    const sports = await Sport.find({ isActive: true }).lean();
    return res.status(200).json({
      status: true,
      data: sports,
    });
  } catch (err) {
    console.error("getSports error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch sports",
    });
  }
};

/**
 * GET /api/competition-list/:sportId
 */
export const getCompetitionList = async (req, res) => {
  try {
    const { sportId } = req.params;
    const competitions = await Competition.find({ sportId }).lean();

    if (competitions.length === 0) {
      return res.status(200).json([]);
    }

    const formatted = competitions.map((c) => ({
      competition: {
        id: c.competitionId,
        name: c.name,
      },
      competitionRegion: c.region,
      marketCount: c.marketCount,
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("getCompetitionList error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch competitions",
    });
  }
};

/**
 * GET /api/event-list/:sportId
 */
export const getEventList = async (req, res) => {
  try {
    const { sportId } = req.params;
    const events = await Event.find({ sportId }).sort({ openDate: 1 }).lean();

    if (events.length === 0) {
      return res.status(200).json({
        status: true,
        data: [],
      });
    }

    const eventIds = events.map((e) => e.eventId);
    const matchOddsMarkets = await Market.find({
      eventId: { $in: eventIds },
      marketName: "Match Odds",
    }).lean();

    const marketIdByEvent = Object.fromEntries(
      matchOddsMarkets.map((m) => [m.eventId, m]),
    );

    const marketIds = matchOddsMarkets.map((m) => m.marketId);
    const oddsRows = await Odds.find({ marketId: { $in: marketIds } }).lean();
    const oddsByMarketId = Object.fromEntries(
      oddsRows.map((o) => [o.marketId, o]),
    );

    const merged = events.map((ev) => {
      const market = marketIdByEvent[ev.eventId];
      const oddsDoc = market ? oddsByMarketId[market.marketId] : null;

      let odds = null;
      if (market && oddsDoc) {
        const selections = market.runners.map((r) => {
          const live = oddsDoc.runners.find(
            (ro) => ro.selectionId === r.selectionId,
          );
          const bestBack = live?.availableToBack?.[0];
          const bestLay = live?.availableToLay?.[0];

          return {
            teamName: r.runnerName,
            suspended: live?.status !== "ACTIVE",
            back: bestBack
              ? { price: bestBack.price, size: bestBack.size }
              : null,
            lay: bestLay ? { price: bestLay.price, size: bestLay.size } : null,
          };
        });

        odds = {
          inPlay: oddsDoc.inPlay,
          status: oddsDoc.status,
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

    return res.status(200).json({
      status: true,
      data: merged,
    });
  } catch (err) {
    console.error("getEventList error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch events",
    });
  }
};

/**
 * GET /api/event-list/:sportId/:competitionId
 */
export const getEventListByCompetition = async (req, res) => {
  try {
    const { sportId, competitionId } = req.params;
    const events = await Event.find({ sportId, competitionId })
      .sort({ openDate: 1 })
      .lean();

    if (events.length === 0) {
      return res.status(200).json([]);
    }

    const formatted = events.map((e) => ({
      event: {
        id: e.eventId,
        name: e.name,
        countryCode: e.countryCode,
        timezone: e.timezone,
        openDate: e.openDate,
      },
      marketCount: e.marketCount,
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("getEventListByCompetition error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch events",
    });
  }
};

/**
 * GET /api/market-all-list/:eventId
 */
export const getMarketAllList = async (req, res) => {
  try {
    const { eventId } = req.params;
    const markets = await Market.find({ eventId }).lean();

    if (markets.length === 0) {
      return res.status(200).json([]);
    }

    const formatted = markets.map((m) => ({
      marketId: m.marketId,
      marketName: m.marketName,
      runners: m.runners,
      totalMatched: m.totalMatched,
    }));

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("getMarketAllList error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch markets",
    });
  }
};

/**
 * GET /api/market-odds/:eventId/:marketId
 */
export const getMarketOdds = async (req, res) => {
  try {
    const { marketId } = req.params;
    const odds = await Odds.findOne({ marketId }).lean();

    if (!odds) {
      return res.status(404).json({
        status: false,
        msg: "Odds not found",
      });
    }

    return res.status(200).json({
      status: true,
      data: odds,
    });
  } catch (err) {
    console.error("getMarketOdds error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch odds",
    });
  }
};

/**
 * GET /api/fancy-all-bookmaker-odds-v3/:eventId
 */
export const getFancyOddsV3 = async (req, res) => {
  try {
    const { eventId } = req.params;

    const market = await Market.findOne({
      eventId,
      marketName: "Match Odds",
    }).lean();

    if (!market) {
      return res.status(200).json({
        status: true,
        data: [],
      });
    }

    const oddsDoc = await Odds.findOne({ marketId: market.marketId }).lean();

    if (!oddsDoc) {
      return res.status(200).json({
        status: true,
        data: [],
      });
    }

    const section = market.runners.map((r) => {
      const live = oddsDoc.runners.find(
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
        gstatus: live?.status || "ACTIVE",
        odds,
      };
    });

    const data = [
      {
        gtype: "match",
        mname: "MATCH_ODDS",
        status: oddsDoc.status,
        section,
      },
    ];

    return res.status(200).json({
      status: true,
      data: data,
    });
  } catch (err) {
    console.error("getFancyOddsV3 error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch odds",
    });
  }
};

/**
 * GET /api/fancy-bookmaker-odds/:eventId
 */
export const getFancyOdds = async (req, res) => {
  try {
    const { eventId } = req.params;

    const fancy = await FancyMarket.find({
      matchId: eventId,
      status: "OPEN",
    }).lean();

    if (fancy.length === 0) {
      return res.status(200).json({
        bookmaker: [],
        fancy: [],
        status: true,
        error: false,
      });
    }

    const fancyFormatted = fancy.map((f) => ({
      SelectionId: f.fancyId,
      RunnerName: f.question,
      gtype: f.category,
      BackPrice1: f.yesOdds,
      BackSize1: 0,
      LayPrice1: f.noOdds,
      LaySize1: 0,
      min: f.minBet,
      max: f.maxBet,
      rem: "",
    }));

    return res.status(200).json({
      bookmaker: [],
      fancy: fancyFormatted,
      status: true,
      error: false,
    });
  } catch (err) {
    console.error("getFancyOdds error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch bookmaker/fancy",
    });
  }
};

/**
 * GET /api/health
 */
export const getHealth = async (req, res) => {
  return res.status(200).json({
    status: true,
    data: {
      message: "API is running",
      timestamp: new Date(),
    },
  });
};

/**
 * GET /api/stats
 */
export const getStats = async (req, res) => {
  try {
    const stats = {
      sports: await Sport.countDocuments(),
      competitions: await Competition.countDocuments(),
      events: await Event.countDocuments(),
      markets: await Market.countDocuments(),
      odds: await Odds.countDocuments(),
      fancyMarkets: await FancyMarket.countDocuments(),
    };

    return res.status(200).json({
      status: true,
      data: stats,
    });
  } catch (err) {
    console.error("getStats error:", err.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to fetch stats",
    });
  }
};
