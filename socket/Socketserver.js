// import { Server } from "socket.io";
// import {
//   getOdds,
//   getFancy,
//   getMarketIdByEvent,
//   isOddsStale,
//   isFancyStale,
// } from "../inmemory/Oddsstore.js";

// let io = null;

// // ============= INIT SOCKET SERVER =============
// export const initSocketServer = (httpServer) => {
//   io = new Server(httpServer, {
//     cors: {
//       origin: (origin, callback) => {
//         const allowed = (process.env.ALLOWED_DOMAINS || "")
//           .split(",")
//           .map((d) => d.trim())
//           .filter(Boolean);

//         if (!origin || allowed.some((a) => origin.includes(a))) {
//           callback(null, true);
//         } else {
//           callback(new Error("Not allowed by CORS"));
//         }
//       },
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//     transports: ["websocket", "polling"],
//     pingTimeout: 10000,
//     pingInterval: 5000,
//   });

//   io.on("connection", (socket) => {
//     const clientIP =
//       socket.handshake.headers["x-forwarded-for"]?.split(",")[0].trim() ||
//       socket.handshake.address;

//     console.log(`🔌 [WS] Client connected: ${socket.id} | IP: ${clientIP}`);

//     socket.on("subscribe:event", async (eventId) => {
//       socket.join(`event:${eventId}`);
//       console.log(`📡 [WS] ${socket.id} subscribed to event: ${eventId}`);
//       await sendEventData(socket, eventId);
//     });

//     socket.on("unsubscribe:event", (eventId) => {
//       socket.leave(`event:${eventId}`);
//     });

//     socket.on("subscribe:sport", (sportId) => {
//       socket.join(`sport:${sportId}`);
//     });

//     socket.on("unsubscribe:sport", (sportId) => {
//       socket.leave(`sport:${sportId}`);
//     });

//     socket.on("subscribe:all", () => {
//       socket.join("all");
//     });

//     socket.on("disconnect", (reason) => {
//       console.log(
//         `❌ [WS] Client disconnected: ${socket.id} | Reason: ${reason}`,
//       );
//     });

//     socket.on("ping", () => {
//       socket.emit("pong", { ts: Date.now() });
//     });
//   });

//   console.log("✅ [WS] WebSocket server initialized");
//   return io;
// };

// // ============= INITIAL SNAPSHOT =============
// const sendEventData = async (socket, eventId) => {
//   try {
//     const marketId = getMarketIdByEvent(eventId);
//     const oddsStale = !marketId || isOddsStale(marketId);
//     const oddsData = marketId ? getOdds(marketId) : null;
//     const fancyStale = isFancyStale(eventId);
//     const fancyData = getFancy(eventId);

//     if (oddsData) {
//       socket.emit("odds:update", {
//         marketId,
//         eventId,
//         ...oddsData,
//         stale: oddsStale,
//         ts: Date.now(),
//       });
//     }

//     if (fancyData) {
//       socket.emit("fancy:update", {
//         eventId,
//         ...fancyData,
//         stale: fancyStale,
//         ts: Date.now(),
//       });
//     }
//   } catch (err) {
//     console.error(`❌ [WS] sendEventData error:`, err.message);
//   }
// };

// // ============= BROADCAST ODDS =============
// export const broadcastOdds = (marketId, oddsData) => {
//   if (!io) return;

//   const eventId = oddsData?.eventId;
//   if (!eventId) return;

//   const payload = {
//     marketId,
//     eventId,
//     ...oddsData,
//     stale: false,
//     ts: Date.now(),
//   };

//   io.to(`event:${eventId}`).emit("odds:update", payload);
//   if (oddsData.sportId) {
//     io.to(`sport:${oddsData.sportId}`).emit("odds:update", payload);
//   }
//   io.to("all").emit("odds:update", payload);
// };

// // ============= BROADCAST FANCY =============
// export const broadcastFancy = (eventId, fancyData) => {
//   if (!io) return;

//   const payload = {
//     eventId,
//     ...fancyData,
//     stale: false,
//     ts: Date.now(),
//   };

//   io.to(`event:${eventId}`).emit("fancy:update", payload);
//   io.to("all").emit("fancy:update", payload);
// };

// // ============= BROADCAST SUSPENDED =============
// export const broadcastSuspended = (marketId, eventId, sportId) => {
//   if (!io) return;

//   const oddsPayload = {
//     marketId,
//     eventId,
//     status: "SUSPENDED",
//     stale: true,
//     ts: Date.now(),
//   };

//   io.to(`event:${eventId}`).emit("odds:suspended", oddsPayload);
//   if (sportId) {
//     io.to(`sport:${sportId}`).emit("odds:suspended", oddsPayload);
//   }
//   io.to("all").emit("odds:suspended", oddsPayload);

//   io.to(`event:${eventId}`).emit("fancy:update", {
//     eventId,
//     bookmaker: [],
//     fancy: [],
//     stale: true,
//     ts: Date.now(),
//   });
// };

// // ============= SOCKET STATS =============
// export const getSocketStats = () => {
//   if (!io) return { connected: 0, rooms: 0 };
//   return {
//     connected: io.engine.clientsCount,
//     rooms: io.sockets.adapter.rooms.size,
//   };
// };

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import {
  getOdds,
  getFancy,
  getMarketIdByEvent,
  isOddsStale,
  isFancyStale,
} from "../inmemory/Oddsstore.js";

let io = null;

// ============= INIT SOCKET SERVER =============
export const initSocketServer = async (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const allowed = (process.env.ALLOWED_DOMAINS || "")
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);

        if (!origin || allowed.some((a) => origin.includes(a))) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  // ✅ REDIS ADAPTER FOR CLUSTER MODE
  try {
    const pubClient = createClient({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));

    console.log("✅ [Redis] Connected - Socket.IO cluster mode active");
  } catch (err) {
    console.warn(
      "⚠️ [Redis] Connection failed, using default adapter:",
      err.message,
    );
    // Fallback to default adapter
  }

  io.on("connection", (socket) => {
    const clientIP =
      socket.handshake.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      socket.handshake.address;

    console.log(`🔌 [WS] Client connected: ${socket.id} | IP: ${clientIP}`);

    socket.on("subscribe:event", async (eventId) => {
      socket.join(`event:${eventId}`);
      console.log(`📡 [WS] ${socket.id} subscribed to event: ${eventId}`);
      await sendEventData(socket, eventId);
    });

    socket.on("unsubscribe:event", (eventId) => {
      socket.leave(`event:${eventId}`);
    });

    socket.on("subscribe:sport", (sportId) => {
      socket.join(`sport:${sportId}`);
    });

    socket.on("unsubscribe:sport", (sportId) => {
      socket.leave(`sport:${sportId}`);
    });

    socket.on("subscribe:all", () => {
      socket.join("all");
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `❌ [WS] Client disconnected: ${socket.id} | Reason: ${reason}`,
      );
    });

    socket.on("ping", () => {
      socket.emit("pong", { ts: Date.now() });
    });
  });

  console.log("✅ [WS] WebSocket server initialized");
  return io;
};

// ============= INITIAL SNAPSHOT =============
const sendEventData = async (socket, eventId) => {
  try {
    const marketId = getMarketIdByEvent(eventId);
    const oddsStale = !marketId || isOddsStale(marketId);
    const oddsData = marketId ? getOdds(marketId) : null;
    const fancyStale = isFancyStale(eventId);
    const fancyData = getFancy(eventId);

    if (oddsData) {
      socket.emit("odds:update", {
        marketId,
        eventId,
        ...oddsData,
        stale: oddsStale,
        ts: Date.now(),
      });
    }

    if (fancyData) {
      socket.emit("fancy:update", {
        eventId,
        ...fancyData,
        stale: fancyStale,
        ts: Date.now(),
      });
    }
  } catch (err) {
    console.error(`❌ [WS] sendEventData error:`, err.message);
  }
};

// ============= BROADCAST ODDS =============
export const broadcastOdds = (marketId, oddsData) => {
  if (!io) return;

  const eventId = oddsData?.eventId;
  if (!eventId) return;

  const payload = {
    marketId,
    eventId,
    ...oddsData,
    stale: false,
    ts: Date.now(),
  };

  io.to(`event:${eventId}`).emit("odds:update", payload);
  if (oddsData.sportId) {
    io.to(`sport:${oddsData.sportId}`).emit("odds:update", payload);
  }
  io.to("all").emit("odds:update", payload);
};

// ============= BROADCAST FANCY =============
export const broadcastFancy = (eventId, fancyData) => {
  if (!io) return;

  const payload = {
    eventId,
    ...fancyData,
    stale: false,
    ts: Date.now(),
  };

  io.to(`event:${eventId}`).emit("fancy:update", payload);
  io.to("all").emit("fancy:update", payload);
};

// ============= BROADCAST SUSPENDED =============
export const broadcastSuspended = (marketId, eventId, sportId) => {
  if (!io) return;

  const oddsPayload = {
    marketId,
    eventId,
    status: "SUSPENDED",
    stale: true,
    ts: Date.now(),
  };

  io.to(`event:${eventId}`).emit("odds:suspended", oddsPayload);
  if (sportId) {
    io.to(`sport:${sportId}`).emit("odds:suspended", oddsPayload);
  }
  io.to("all").emit("odds:suspended", oddsPayload);

  io.to(`event:${eventId}`).emit("fancy:update", {
    eventId,
    bookmaker: [],
    fancy: [],
    stale: true,
    ts: Date.now(),
  });
};

// ============= SOCKET STATS =============
export const getSocketStats = () => {
  if (!io) return { connected: 0, rooms: 0 };
  return {
    connected: io.engine.clientsCount,
    rooms: io.sockets.adapter.rooms.size,
  };
};
