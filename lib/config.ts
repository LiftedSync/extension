export const config = {
  backendUrl: import.meta.env.DEV
    ? 'ws://localhost:8080/ws'
    : 'wss://liftedgang.de/api/ws',
  DRIFT_TOLERANCE: 3,        // seconds
  HEARTBEAT_INTERVAL: 20000, // 20 seconds
};
