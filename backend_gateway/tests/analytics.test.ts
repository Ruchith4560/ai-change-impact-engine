import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("Historical Trend Analytics API", () => {
  it("GET /api/v1/analytics/trends should return calculated metrics and time series", async () => {
    const res = await request(app).get("/api/v1/analytics/trends");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(data.total_analyses).toBeGreaterThanOrEqual(1);
    expect(data.average_risk_score).toBeGreaterThanOrEqual(0);
    expect(data.risk_distribution).toHaveProperty("LOW");
    expect(data.risk_distribution).toHaveProperty("MEDIUM");
    expect(data.risk_distribution).toHaveProperty("HIGH");
    expect(data.risk_distribution).toHaveProperty("CRITICAL");

    expect(typeof data.ci_minutes_saved).toBe("number");
    expect(data.ci_minutes_saved).toBeGreaterThan(0);

    expect(Array.isArray(data.top_hotspots)).toBe(true);
    expect(data.top_hotspots.length).toBeGreaterThan(0);
    expect(data.top_hotspots[0]).toHaveProperty("file");
    expect(data.top_hotspots[0]).toHaveProperty("frequency");

    expect(Array.isArray(data.time_series)).toBe(true);
    expect(data.time_series.length).toBeGreaterThan(0);
    expect(data.time_series[0]).toHaveProperty("pr_number");
    expect(data.time_series[0]).toHaveProperty("risk_score");
    expect(data.time_series[0]).toHaveProperty("risk_level");
  });

  it("GET /api/v1/analytics/trends should support repositoryId and days query params", async () => {
    const res = await request(app).get("/api/v1/analytics/trends?repositoryId=ecommerce_service&days=60");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.repository_id).toBe("ecommerce_service");
  });
});
