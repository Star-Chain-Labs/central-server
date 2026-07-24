// import "dotenv/config";
// import express from "express";
// import mongoose from "mongoose";
// import sportsRoutes from "./routes/routes.js";
// import { startSyncJobs } from "./inmemory/Cron.memory.js";

// const app = express();
// const PORT = process.env.PORT || 3334;

// // ============= ACCESS CONTROL =============
// const getAllowedAccess = () => {
//   const allowed = (process.env.ALLOWED_DOMAINS || "")
//     .split(",")
//     .map((a) => a.trim())
//     .filter(Boolean);

//   return allowed;
// };

// const corsMiddleware = (req, res, next) => {
//   const origin = req.get("origin");
//   const allowedList = getAllowedAccess();

//   // Extract domain from origin
//   const originDomain = origin?.replace(/https?:\/\//, "").split(":")[0] || "";

//   // Check if origin is in allowed list
//   const isAllowed = allowedList.some(
//     (allowed) => origin?.includes(allowed) || originDomain === allowed,
//   );

//   // Set CORS headers
//   if (isAllowed || !origin) {
//     res.header("Access-Control-Allow-Origin", origin || "*");
//     res.header("Access-Control-Allow-Credentials", "true");
//   } else {
//     console.log(`⚠️ CORS: Origin not in whitelist\n`);
//   } // Always set these headers
//   res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Content-Type, Authorization, X-Requested-With",
//   );

//   if (req.method === "OPTIONS") {
//     return res.sendStatus(200);
//   }

//   next();
// };

// const accessControl = (req, res, next) => {
//   const allowedList = getAllowedAccess();

//   const clientIP =
//     req.get("X-Forwarded-For")?.split(",")[0].trim() ||
//     req.get("X-Real-IP") ||
//     req.ip?.replace("::ffff:", "");

//   const origin = req.get("origin") || "direct-call";
//   const originDomain = origin.replace(/https?:\/\//, "").split(":")[0];

//   // console.log(`🔍 [Access Control]`);
//   // console.log(`   Client IP: ${clientIP}`);
//   // console.log(`   Origin: ${origin}`);
//   // console.log(`   Domain: ${originDomain}`);
//   // console.log(`   Allowed List: ${allowedList.join(", ")}`);

//   const isAllowed = allowedList.some((allowed) => {
//     const match =
//       clientIP === allowed ||
//       originDomain === allowed ||
//       origin.includes(allowed) ||
//       allowed.includes(clientIP);

//     if (match) {
//       console.log(`   ✅ Matched with: ${allowed}`);
//     }
//     return match;
//   });

//   if (isAllowed) {
//     console.log(`✅ ACCESS GRANTED\n`);
//     return next();
//   }

//   return res.status(403).json({
//     status: false,
//     msg: "Access denied - Not whitelisted",
//   });
// };

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("✅ MongoDB connected");
//   } catch (error) {
//     console.error("❌ MongoDB connection failed:", error.message);
//     process.exit(1);
//   }
// };

// app.use(express.json());

// app.get("/", (req, res) => {
//   res.json({
//     message: "Sports Sync API",
//     status: "running",
//     timestamp: new Date().toISOString(),
//   });
// });

// app.get("/health", (req, res) => {
//   res.json({
//     status: "ok",
//     timestamp: new Date().toISOString(),
//   });
// });

// app.use("/api", corsMiddleware, accessControl, sportsRoutes);

// // ============= INFO ENDPOINT =============
// app.get("/access-info", (req, res) => {
//   const allowedList = getAllowedAccess();
//   const clientIP =
//     req.get("X-Forwarded-For")?.split(",")[0].trim() ||
//     req.get("X-Real-IP") ||
//     req.ip?.replace("::ffff:", "");

//   res.json({
//     status: true,
//     data: {
//       your_ip: clientIP,
//       allowed_access_list: allowedList,
//       total_allowed: allowedList.length,
//       message:
//         "Add more IPs/domains to .env file: ALLOWED_DOMAINS=ip1,domain1,ip2,domain2",
//     },
//   });
// });

// // ============= START SERVER =============
// const startServer = async () => {
//   await connectDB();
//   startSyncJobs();

//   const allowedList = getAllowedAccess();

//   app.listen(PORT, "0.0.0.0", () => {
//     console.log(`\n${"=".repeat(60)}`);
//     // console.log(`🚀 Sports Sync Service running on 0.0.0.0:${PORT}`);
//     // console.log(`🔐 Access Control: ENABLED`);
//     // console.log(`🌐 CORS: ENABLED`);
//     // console.log(`📋 Whitelisted Access (${allowedList.length}):`);
//     allowedList.forEach((a) => console.log(`   ✅ ${a}`));
//     // console.log(`\n📝 To add more: Edit .env ALLOWED_DOMAINS variable`);
//     // console.log(
//     //   `📊 Check your IP: curl http://72.61.237.185:${PORT}/access-info`,
//     // );
//     // console.log(`${"=".repeat(60)}\n`);
//   });
// };

// startServer();

// index.js
import "dotenv/config";
import express from "express";
import { createServer } from "http"; // ✅ ADD
import mongoose from "mongoose";
import sportsRoutes from "./routes/routes.js";
import { startSyncJobs } from "./inmemory/Cron.memory.js";
import { initSocketServer, getSocketStats } from "./socket/Socketserver.js";

const app = express();
const httpServer = createServer(app); // ✅ ADD
const PORT = process.env.PORT || 3334;

// ============= ACCESS CONTROL =============
const getAllowedAccess = () => {
  const allowed = (process.env.ALLOWED_DOMAINS || "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  return allowed;
};

const corsMiddleware = (req, res, next) => {
  const origin = req.get("origin");
  const allowedList = getAllowedAccess();

  const originDomain = origin?.replace(/https?:\/\//, "").split(":")[0] || "";

  const isAllowed = allowedList.some(
    (allowed) => origin?.includes(allowed) || originDomain === allowed,
  );

  if (isAllowed || !origin) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    console.log(`⚠️ CORS: Origin not in whitelist\n`);
  }
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

  return res.status(403).json({
    status: false,
    msg: "Access denied - Not whitelisted",
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

// ✅ ADD - WebSocket stats endpoint
app.get("/ws-stats", (req, res) => {
  res.json({
    status: true,
    data: getSocketStats(),
  });
});

app.use("/api", corsMiddleware, accessControl, sportsRoutes);

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

  // ✅ ADD - Init WebSocket BEFORE listen
  initSocketServer(httpServer);

  // startSyncJobs();
  await startSyncJobs();

  const allowedList = getAllowedAccess();

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🚀 Sports Sync Service running on 0.0.0.0:${PORT}`);
    console.log(`🔌 WebSocket: ws://72.61.237.185:${PORT}`);
    allowedList.forEach((a) => console.log(`   ✅ ${a}`));
    console.log(`${"=".repeat(60)}\n`);
  });
};

startServer();
