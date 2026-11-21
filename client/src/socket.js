import { io } from "socket.io-client";

// autoConnect: false — подключаемся только после ввода имени
export const socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,
});
