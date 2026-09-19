import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { analysisRouter } from "./routes/analysis.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import { analyticsRouter } from "./routes/analytics.routes.js";

export const createApp = (): express.Application => {
  const app = express();

  // Core Security & Utilities Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(
    express.json({
      limit: "15mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  if (config.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // Mount Application Routes
  app.use("/", healthRouter);
  app.use("/api/v1", analysisRouter);
  app.use("/api/v1", webhookRouter);
  app.use("/api/v1", analyticsRouter);

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};
