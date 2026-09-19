import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("Health Check API", () => {
  it("GET /health should return 200 OK and gateway metadata", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toContain("API Gateway");
    expect(res.body.timestamp).toBeDefined();
  });

  it("POST /api/v1/diff/parse should reject empty diff payload with 400", async () => {
    const res = await request(app)
      .post("/api/v1/diff/parse")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/ast/parse-file should reject missing filePath with 400", async () => {
    const res = await request(app)
      .post("/api/v1/ast/parse-file")
      .send({ content: "function foo() {}" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/ast/map-diff should reject missing rawDiff with 400", async () => {
    const res = await request(app)
      .post("/api/v1/ast/map-diff")
      .send({ filesContent: {} });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/graph/build should reject missing files payload with 400", async () => {
    const res = await request(app)
      .post("/api/v1/graph/build")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/graph/blast-radius should reject missing changedSymbolIds with 400", async () => {
    const res = await request(app)
      .post("/api/v1/graph/blast-radius")
      .send({ files: {} });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/risk/evaluate should accept valid payload structure", async () => {
    // Should validate payload structure correctly
    const res = await request(app)
      .post("/api/v1/risk/evaluate")
      .send({
        totalFilesChanged: 1,
        totalAdditions: 10,
        totalDeletions: 2,
        breakingCandidatesCount: 0,
        changedSymbolIds: ["src/a.ts::foo"],
        impactedEntitiesCount: 2,
        maxDependencyDepth: 1,
      });
    // If python service is down during unit test, it returns 500/503 from client, but passes Zod validation (not 400)
    expect(res.status).not.toBe(400);
  });
});
