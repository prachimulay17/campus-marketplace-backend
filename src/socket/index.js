import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import handleConnection from "./connectionHandler.js";
import registerChatHandlers from "./chatHandler.js";

let io;

export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      // If client explicitly sent auth via socket.io's auth option, trust only that.
      // This prevents a stale cookie from re-authenticating after client-side logout.
      let token;
      if (socket.handshake.auth && "token" in socket.handshake.auth) {
        token = socket.handshake.auth.token;
      } else {
        token =
          socket.handshake.headers.authorization?.replace("Bearer ", "") ||
          socket.handshake.headers.cookie
            ?.split(";")
            .reduce((acc, c) => {
              const [name, ...rest] = c.split("=");
              if (name.trim() === "accessToken") acc = rest.join("=").trim();
              return acc;
            }, undefined);
      }

      if (!token) {
        return next(new Error("Authentication error: No access token"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    handleConnection(socket, io);
    registerChatHandlers(socket, io);
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
