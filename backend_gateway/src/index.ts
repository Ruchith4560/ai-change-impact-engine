import { createApp } from "./app.js";
import { config } from "./config/index.js";

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`[Gateway] AI Change Impact Engine Gateway running on port ${config.PORT}`);
  console.log(`[Gateway] Environment: ${config.NODE_ENV}`);
  console.log(`[Gateway] Intelligence Service URL: ${config.INTELLIGENCE_SERVICE_URL}`);
});

process.on("SIGTERM", () => {
  console.log("[Gateway] SIGTERM signal received. Closing HTTP server...");
  server.close(() => {
    console.log("[Gateway] HTTP server closed.");
  });
});
