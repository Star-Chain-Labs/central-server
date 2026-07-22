import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cron from "node-cron";
import sportsRoutes from "./routes/routes.js";
import { startSyncJobs } from "./jobs/cron.js";

const app = express();
const PORT = process.env.PORT || 3334;

const corsWithDomainAuth = (req, res, next) => {
  const allowedDomains = (process.env.ALLOWED_DOMAINS || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const origin = req.get("origin");

  if (
    origin &&
    (origin.includes("localhost") || origin.includes("127.0.0.1"))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else if (origin && allowedDomains.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
};

app.use(express.json());
app.use(corsWithDomainAuth);

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/sports-sync",
    );
    startSyncJobs();
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

app.use("/api", sportsRoutes);
const startServer = async () => {
  await connectDB();
  startSyncJobs();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Sports Sync Service running on 0.0.0.0:${PORT}`);
    console.log(`📍 Access at: http://72.61.237.185:${PORT}`);
  });
};

startServer();
