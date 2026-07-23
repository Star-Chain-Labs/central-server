// ws/socketServer.js
import { Server } from "socket.io";
import {
  getOdds,
  getFancy,
  getMarketIdByEvent,
  isOddsStale,
  isFancyStale,
  getAllMarketMeta,
} from "../inmemory/Oddsstore.js";
import Market from "../models/Market.model.js";

let io = null;

// ============= INIT SOCKET SERVER =============
export const initSocketServer = (httpServer) => {
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

  io.on("connection", (socket) => {
    const clientIP =
      socket.handshake.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      socket.handshake.address;

    console.log(`🔌 [WS] Client connected: ${socket.id} | IP: ${clientIP}`);

    // ============= SUBSCRIBE TO EVENTS =============
    // Client kis event ko subscribe karna chahta hai
    socket.on("subscribe:event", async (eventId) => {
      socket.join(`event:${eventId}`);
      console.log(`📡 [WS] ${socket.id} subscribed to event: ${eventId}`);

      // Immediately send current data
      await sendEventData(socket, eventId);
    });

    socket.on("unsubscribe:event", (eventId) => {
      socket.leave(`event:${eventId}`);
      console.log(`📡 [WS] ${socket.id} unsubscribed from event: ${eventId}`);
    });

    // ============= SUBSCRIBE TO SPORT =============
    socket.on("subscribe:sport", (sportId) => {
      socket.join(`sport:${sportId}`);
      console.log(`📡 [WS] ${socket.id} subscribed to sport: ${sportId}`);
    });

    socket.on("unsubscribe:sport", (sportId) => {
      socket.leave(`sport:${sportId}`);
    });

    // ============= SUBSCRIBE TO ALL =============
    socket.on("subscribe:all", () => {
      socket.join("all");
      console.log(`📡 [WS] ${socket.id} subscribed to all`);
    });

    // ============= DISCONNECT =============
    socket.on("disconnect", (reason) => {
      console.log(
        `❌ [WS] Client disconnected: ${socket.id} | Reason: ${reason}`,
      );
    });

    // ============= PING/PONG =============
    socket.on("ping", () => {
      socket.emit("pong", { ts: Date.now() });
    });
  });

  console.log("✅ [WS] WebSocket server initialized");
  return io;
};

// ============= SEND EVENT DATA =============
const sendEventData = async (socket, eventId) => {
  try {
    const marketId = getMarketIdByEvent(eventId);
    const oddsStale = !marketId || isOddsStale(marketId);
    const oddsData = oddsStale ? null : getOdds(marketId);
    const fancyStale = isFancyStale(eventId);
    const fancyData = fancyStale ? null : getFancy(eventId);

    socket.emit(`event:${eventId}`, {
      eventId,
      odds: oddsData
        ? { ...oddsData, stale: false }
        : { status: "SUSPENDED", stale: true },
      fancy: fancyData
        ? { ...fancyData, stale: false }
        : { bookmaker: [], fancy: [], stale: true },
      ts: Date.now(),
    });
  } catch (err) {
    console.error(`❌ [WS] sendEventData error:`, err.message);
  }
};

// ============= BROADCAST ODDS =============
// Sync jobs ye call karenge jab bhi data update ho
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

  // Event room ko bhejo
  io.to(`event:${eventId}`).emit("odds:update", payload);

  // Sport room ko bhejo
  io.to(`sport:${oddsData.sportId}`).emit("odds:update", payload);

  // All room ko bhejo
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
// Jab timeout ho to SUSPENDED broadcast karo
export const broadcastSuspended = (marketId, eventId, sportId) => {
  if (!io) return;

  const payload = {
    marketId,
    eventId,
    status: "SUSPENDED",
    stale: true,
    ts: Date.now(),
  };

  io.to(`event:${eventId}`).emit("odds:suspended", payload);
  io.to(`sport:${sportId}`).emit("odds:suspended", payload);
  io.to("all").emit("odds:suspended", payload);
};

// ============= GET SOCKET STATS =============
export const getSocketStats = () => {
  if (!io) return { connected: 0, rooms: 0 };

  return {
    connected: io.engine.clientsCount,
    rooms: io.sockets.adapter.rooms.size,
  };
};
