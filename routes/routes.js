import express from "express";
import {
  getCompetitionList,
  getEventList,
  getEventListByCompetition,
  getMarketAllList,
  getFancyOddsV3,
  getFancyOdds,
  getSports,
  getHealth,
  getStats,
} from "../controllers/sportsController.js";

const router = express.Router();

// Sports
router.get("/sports", getSports);

// Competitions
router.get("/betfair/competition-list/:sportId", getCompetitionList);

// Events
router.get("/betfair/event-list/:sportId", getEventList);
router.get(
  "/betfair/event-list/:sportId/:competitionId",
  getEventListByCompetition,
);

// Markets
router.get("/betfair/market-all-list/:eventId", getMarketAllList);

// Odds
router.get("/betfair/market-odds/:eventId/:marketId", async (req, res) => {
  const { marketId } = req.params;
  // Direct controller call
});

// Fancy Odds
router.get("/betfair/fancy-all-bookmaker-odds-v3/:eventId", getFancyOddsV3);
router.get("/betfair/fancy-bookmaker-odds/:eventId", getFancyOdds);

// Health
router.get("/health", getHealth);
router.get("/stats", getStats);

export default router;
