// import "dotenv/config";
// import express from "express";
// import mongoose from "mongoose";
// import cron from "node-cron";
// import sportsRoutes from "./routes/routes.js";
// import { startSyncJobs } from "./jobs/cron.js";

// const app = express();
// const PORT = process.env.PORT || 3334;

// const corsWithDomainAuth = (req, res, next) => {
//   const allowedDomains = (process.env.ALLOWED_DOMAINS || "")
//     .split(",")
//     .map((d) => d.trim())
//     .filter(Boolean);

//   const origin = req.get("origin");

//   console.log(`🔍 [CORS] Origin: ${origin}`);
//   console.log(`🔍 [CORS] Allowed: ${allowedDomains.join(", ")}`);

//   if (
//     origin &&
//     (origin.includes("localhost") || origin.includes("127.0.0.1"))
//   ) {
//     res.header("Access-Control-Allow-Origin", origin);
//     res.header("Access-Control-Allow-Credentials", "true");
//     console.log("✅ [CORS] Localhost allowed");
//   } else if (origin && allowedDomains.includes(origin)) {
//     res.header("Access-Control-Allow-Origin", origin);
//     res.header("Access-Control-Allow-Credentials", "true");
//     console.log(`✅ [CORS] ${origin} allowed`);
//   } else {
//     console.log(`❌ [CORS] ${origin} NOT allowed`);
//   }

//   res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

//   if (req.method === "OPTIONS") {
//     return res.sendStatus(200);
//   }

//   next();
// };
// app.use(express.json());
// app.use(corsWithDomainAuth);

// const connectDB = async () => {
//   try {
//     await mongoose.connect(
//       process.env.MONGO_URI || "mongodb://localhost:27017/sports-sync",
//     );
//     console.log("✅ MongoDB connected");
//   } catch (error) {
//     console.error("❌ MongoDB connection failed:", error.message);
//     process.exit(1);
//   }
// };

// // ✅ YAHA ADD KAR - ROOT ENDPOINT
// app.get("/", (req, res) => {
//   res.json({ message: "Sports Sync API", status: "running" });
// });

// // API Routes
// app.use("/api", sportsRoutes);

// const startServer = async () => {
//   await connectDB();
//   startSyncJobs();

//   app.listen(PORT, "0.0.0.0", () => {
//     console.log(`🚀 Sports Sync Service running on 0.0.0.0:${PORT}`);
//     console.log(`📍 Access at: http://72.61.237.185:${PORT}`);
//   });
// };

// startServer();

import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cron from "node-cron";
import sportsRoutes from "./routes/routes.js";
import { startSyncJobs } from "./jobs/cron.js";

const app = express();
const PORT = process.env.PORT || 3334;

// Track all requests
const requestTracker = {
  total: 0,
  domains: {},
  methods: {},
};

const corsWithDomainAuth = (req, res, next) => {
  requestTracker.total++;

  const allowedDomains = (process.env.ALLOWED_DOMAINS || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const origin = req.get("origin");
  const method = req.method;
  const path = req.path;

  // Track domain
  if (origin) {
    requestTracker.domains[origin] = (requestTracker.domains[origin] || 0) + 1;
  }

  // Track method
  requestTracker.methods[method] = (requestTracker.methods[method] || 0) + 1;

  console.log(`\n📨 [Request #${requestTracker.total}]`);
  console.log(`   Method: ${method}`);
  console.log(`   Path: ${path}`);
  console.log(`   Origin: ${origin || "❌ None (direct/server call)"}`);
  console.log(`   Allowed: ${allowedDomains.join(", ")}`);

  let allowed = false;

  if (
    origin &&
    (origin.includes("localhost") || origin.includes("127.0.0.1"))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    console.log(`   ✅ Status: LOCALHOST ALLOWED`);
    allowed = true;
  } else if (origin && allowedDomains.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    console.log(`   ✅ Status: DOMAIN ALLOWED`);
    allowed = true;
  } else {
    console.log(`   ❌ Status: BLOCKED`);
    allowed = false;
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
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// ROOT ENDPOINT
app.get("/", (req, res) => {
  res.json({ message: "Sports Sync API", status: "running" });
});

// STATS - Show all requests
app.get("/requests-stats", (req, res) => {
  res.json({
    total_requests: requestTracker.total,
    domains: requestTracker.domains,
    methods: requestTracker.methods,
  });
});

// API Routes
app.use("/api", sportsRoutes);

const startServer = async () => {
  await connectDB();
  startSyncJobs();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Sports Sync Service running on 0.0.0.0:${PORT}`);
    console.log(`📍 Access at: http://72.61.237.185:${PORT}`);
    console.log(
      `📊 View requests: http://72.61.237.185:${PORT}/requests-stats\n`,
    );
  });
};

startServer();
