// // import "dotenv/config";
// // import express from "express";
// // import mongoose from "mongoose";
// // import cron from "node-cron";
// // import sportsRoutes from "./routes/routes.js";
// // import { startSyncJobs } from "./jobs/cron.js";

// // const app = express();
// // const PORT = process.env.PORT || 3334;

// // const corsWithDomainAuth = (req, res, next) => {
// //   const allowedDomains = (process.env.ALLOWED_DOMAINS || "")
// //     .split(",")
// //     .map((d) => d.trim())
// //     .filter(Boolean);

// //   const origin = req.get("origin");

// //   console.log(`🔍 [CORS] Origin: ${origin}`);
// //   console.log(`🔍 [CORS] Allowed: ${allowedDomains.join(", ")}`);

// //   if (
// //     origin &&
// //     (origin.includes("localhost") || origin.includes("127.0.0.1"))
// //   ) {
// //     res.header("Access-Control-Allow-Origin", origin);
// //     res.header("Access-Control-Allow-Credentials", "true");
// //     console.log("✅ [CORS] Localhost allowed");
// //   } else if (origin && allowedDomains.includes(origin)) {
// //     res.header("Access-Control-Allow-Origin", origin);
// //     res.header("Access-Control-Allow-Credentials", "true");
// //     console.log(`✅ [CORS] ${origin} allowed`);
// //   } else {
// //     console.log(`❌ [CORS] ${origin} NOT allowed`);
// //   }

// //   res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
// //   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

// //   if (req.method === "OPTIONS") {
// //     return res.sendStatus(200);
// //   }

// //   next();
// // };
// // app.use(express.json());
// // app.use(corsWithDomainAuth);

// // const connectDB = async () => {
// //   try {
// //     await mongoose.connect(
// //       process.env.MONGO_URI || "mongodb://localhost:27017/sports-sync",
// //     );
// //     console.log("✅ MongoDB connected");
// //   } catch (error) {
// //     console.error("❌ MongoDB connection failed:", error.message);
// //     process.exit(1);
// //   }
// // };

// // // ✅ YAHA ADD KAR - ROOT ENDPOINT
// // app.get("/", (req, res) => {
// //   res.json({ message: "Sports Sync API", status: "running" });
// // });

// // // API Routes
// // app.use("/api", sportsRoutes);

// // const startServer = async () => {
// //   await connectDB();
// //   startSyncJobs();

// //   app.listen(PORT, "0.0.0.0", () => {
// //     console.log(`🚀 Sports Sync Service running on 0.0.0.0:${PORT}`);
// //     console.log(`📍 Access at: http://72.61.237.185:${PORT}`);
// //   });
// // };

// // startServer();

// import "dotenv/config";
// import express from "express";
// import mongoose from "mongoose";
// import cron from "node-cron";
// import sportsRoutes from "./routes/routes.js";
// import { startSyncJobs } from "./jobs/cron.js";

// const app = express();
// const PORT = process.env.PORT || 3334;

// // Track all requests
// const requestTracker = {
//   total: 0,
//   domains: {},
//   methods: {},
// };

// const corsWithDomainAuth = (req, res, next) => {
//   requestTracker.total++;

//   const allowedDomains = (process.env.ALLOWED_DOMAINS || "")
//     .split(",")
//     .map((d) => d.trim())
//     .filter(Boolean);

//   const origin = req.get("origin");
//   const method = req.method;
//   const path = req.path;

//   // Track domain
//   if (origin) {
//     requestTracker.domains[origin] = (requestTracker.domains[origin] || 0) + 1;
//   }

//   // Track method
//   requestTracker.methods[method] = (requestTracker.methods[method] || 0) + 1;

//   console.log(`\n📨 [Request #${requestTracker.total}]`);
//   console.log(`   Method: ${method}`);
//   console.log(`   Path: ${path}`);
//   console.log(`   Origin: ${origin || "❌ None (direct/server call)"}`);
//   console.log(`   Allowed: ${allowedDomains.join(", ")}`);

//   let allowed = false;

//   if (
//     origin &&
//     (origin.includes("localhost") || origin.includes("127.0.0.1"))
//   ) {
//     res.header("Access-Control-Allow-Origin", origin);
//     res.header("Access-Control-Allow-Credentials", "true");
//     console.log(`   ✅ Status: LOCALHOST ALLOWED`);
//     allowed = true;
//   } else if (origin && allowedDomains.includes(origin)) {
//     res.header("Access-Control-Allow-Origin", origin);
//     res.header("Access-Control-Allow-Credentials", "true");
//     console.log(`   ✅ Status: DOMAIN ALLOWED`);
//     allowed = true;
//   } else {
//     console.log(`   ❌ Status: BLOCKED`);
//     allowed = false;
//   }

//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
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

// // ROOT ENDPOINT
// app.get("/", (req, res) => {
//   res.json({ message: "Sports Sync API", status: "running" });
// });

// // STATS - Show all requests
// app.get("/requests-stats", (req, res) => {
//   res.json({
//     total_requests: requestTracker.total,
//     domains: requestTracker.domains,
//     methods: requestTracker.methods,
//   });
// });

// // API Routes
// app.use("/api", sportsRoutes);

// const startServer = async () => {
//   await connectDB();
//   startSyncJobs();

//   app.listen(PORT, "0.0.0.0", () => {
//     console.log(`\n🚀 Sports Sync Service running on 0.0.0.0:${PORT}`);
//     console.log(`📍 Access at: http://72.61.237.185:${PORT}`);
//     console.log(
//       `📊 View requests: http://72.61.237.185:${PORT}/requests-stats\n`,
//     );
//   });
// };

// startServer();
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import sportsRoutes from "./routes/routes.js";
import { startSyncJobs } from "./jobs/cron.js";

const app = express();
const PORT = process.env.PORT || 3334;

// ============= ACCESS CONTROL =============
const getAllowedAccess = () => {
  const allowed = (process.env.ALLOWED_DOMAINS || "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  return allowed;
};

// ✅ CORS MIDDLEWARE - Add CORS headers
const corsMiddleware = (req, res, next) => {
  const origin = req.get("origin");
  const allowedList = getAllowedAccess();

  console.log(`\n🌐 [CORS Check]`);
  console.log(`   Origin: ${origin}`);
  console.log(`   Allowed: ${allowedList.join(", ")}`);

  // Extract domain from origin
  const originDomain = origin?.replace(/https?:\/\//, "").split(":")[0] || "";

  // Check if origin is in allowed list
  const isAllowed = allowedList.some(
    (allowed) => origin?.includes(allowed) || originDomain === allowed,
  );

  // Set CORS headers
  if (isAllowed || !origin) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    console.log(`✅ CORS: Headers Set\n`);
  } else {
    console.log(`⚠️ CORS: Origin not in whitelist\n`);
  }

  // Always set these headers
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
};

const accessControl = (req, res, next) => {
  const allowedList = getAllowedAccess();

  const clientIP =
    req.get("X-Forwarded-For")?.split(",")[0].trim() ||
    req.get("X-Real-IP") ||
    req.ip?.replace("::ffff:", "");

  const origin = req.get("origin") || "direct-call";
  const originDomain = origin.replace(/https?:\/\//, "").split(":")[0];

  // console.log(`🔍 [Access Control]`);
  // console.log(`   Client IP: ${clientIP}`);
  // console.log(`   Origin: ${origin}`);
  // console.log(`   Domain: ${originDomain}`);
  // console.log(`   Allowed List: ${allowedList.join(", ")}`);

  const isAllowed = allowedList.some((allowed) => {
    const match =
      clientIP === allowed ||
      originDomain === allowed ||
      origin.includes(allowed) ||
      allowed.includes(clientIP);

    if (match) {
      console.log(`   ✅ Matched with: ${allowed}`);
    }
    return match;
  });

  if (isAllowed) {
    console.log(`✅ ACCESS GRANTED\n`);
    return next();
  }

  console.log(`❌ ACCESS DENIED\n`);
  return res.status(403).json({
    status: false,
    msg: "Access denied - Not whitelisted",
    your_ip: clientIP,
    your_origin: origin,
    your_domain: originDomain,
  });
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Sports Sync API",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", corsMiddleware, accessControl, sportsRoutes);

// ============= INFO ENDPOINT =============
app.get("/access-info", (req, res) => {
  const allowedList = getAllowedAccess();
  const clientIP =
    req.get("X-Forwarded-For")?.split(",")[0].trim() ||
    req.get("X-Real-IP") ||
    req.ip?.replace("::ffff:", "");

  res.json({
    status: true,
    data: {
      your_ip: clientIP,
      allowed_access_list: allowedList,
      total_allowed: allowedList.length,
      message:
        "Add more IPs/domains to .env file: ALLOWED_DOMAINS=ip1,domain1,ip2,domain2",
    },
  });
});

// ============= START SERVER =============
const startServer = async () => {
  await connectDB();
  startSyncJobs();

  const allowedList = getAllowedAccess();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n${"=".repeat(60)}`);
    // console.log(`🚀 Sports Sync Service running on 0.0.0.0:${PORT}`);
    // console.log(`🔐 Access Control: ENABLED`);
    // console.log(`🌐 CORS: ENABLED`);
    // console.log(`📋 Whitelisted Access (${allowedList.length}):`);
    allowedList.forEach((a) => console.log(`   ✅ ${a}`));
    // console.log(`\n📝 To add more: Edit .env ALLOWED_DOMAINS variable`);
    // console.log(
    //   `📊 Check your IP: curl http://72.61.237.185:${PORT}/access-info`,
    // );
    // console.log(`${"=".repeat(60)}\n`);
  });
};

startServer();
