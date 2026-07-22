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
router.get("/competition-list/:sportId", getCompetitionList);
router.get("/event-list/:sportId", getEventList);
router.get("/event-list/:sportId/:competitionId", getEventListByCompetition);
router.get("/market-all-list/:eventId", getMarketAllList);

// Odds
router.get("/market-odds/:eventId/:marketId", async (req, res) => {
  const { marketId } = req.params;
  // Direct controller call
});

// Fancy Odds
router.get("/fancy-all-bookmaker-odds-v3/:eventId", getFancyOddsV3);
router.get("/fancy-bookmaker-odds/:eventId", getFancyOdds);

// Health
router.get("/health", getHealth);
router.get("/stats", getStats);

export default router;
