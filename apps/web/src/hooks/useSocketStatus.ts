import { useEffect, useState } from "react";
import { useVektorSocket } from "@/lib/socket-provider";

export type SocketStatus = "unconfigured" | "connecting" | "connected" | "disconnected";

/**
 * Surfaces the live gateway connection state for the topbar's status
 * indicator — before this hook, nothing in the UI told an operator whether
 * entity/sensor updates were actually flowing or the socket had silently
 * dropped, which matters a lot more here than in a typical app.
 */
export function useSocketStatus(): SocketStatus {
  const socket = useVektorSocket();
  const [status, setStatus] = useState<SocketStatus>(() => (socket ? (socket.connected ? "connected" : "connecting") : "unconfigured"));

  useEffect(() => {
    if (!socket) {
      setStatus("unconfigured");
      return;
    }
    setStatus(socket.connected ? "connected" : "connecting");

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("disconnected");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [socket]);

  return status;
}
