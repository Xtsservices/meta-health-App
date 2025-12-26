import { io, Socket } from "socket.io-client";
import { BASE_URL_SOCKET } from "../auth/auth";

let socket: Socket | null = null;

const DEFAULT_URL = BASE_URL_SOCKET; // your Mac's LAN IP

export const initSocket = (serverUrl = DEFAULT_URL) => {
  if (socket) return socket;

  socket = io(serverUrl, {
    transports: ["polling", "websocket"], // polling first, then websocket
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("✅ [socket] connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ [socket] disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("⚠️ [socket] connect_error:", err?.message || err);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
