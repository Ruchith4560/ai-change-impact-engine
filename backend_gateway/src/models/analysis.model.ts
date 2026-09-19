import mongoose, { Schema, Document, Model } from "mongoose";
import { FullAnalysisReport } from "../services/intelligenceClient.js";

export interface IAnalysisRecord {
  analysisId: string;
  repositoryId: string;
  prNumber?: number;
  commitSha?: string;
  baseSha?: string;
  title?: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  totalFilesChanged: number;
  totalAdditions: number;
  totalDeletions: number;
  impactedEntitiesCount: number;
  maxDependencyDepth: number;
  testsSelectedCount: number;
  totalTestsCount: number;
  testReductionRatio: number;
  breakingChangesCount: number;
  report: FullAnalysisReport;
  createdAt: Date;
  updatedAt: Date;
}

export type AnalysisDocument = IAnalysisRecord & Document;

const AnalysisSchema = new Schema<AnalysisDocument>(
  {
    analysisId: { type: String, required: true, unique: true, index: true },
    repositoryId: { type: String, required: true, index: true },
    prNumber: { type: Number, index: true },
    commitSha: { type: String, index: true },
    baseSha: { type: String },
    title: { type: String },
    riskScore: { type: Number, required: true },
    riskLevel: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      index: true,
    },
    totalFilesChanged: { type: Number, default: 0 },
    totalAdditions: { type: Number, default: 0 },
    totalDeletions: { type: Number, default: 0 },
    impactedEntitiesCount: { type: Number, default: 0 },
    maxDependencyDepth: { type: Number, default: 0 },
    testsSelectedCount: { type: Number, default: 0 },
    totalTestsCount: { type: Number, default: 0 },
    testReductionRatio: { type: Number, default: 0.0 },
    breakingChangesCount: { type: Number, default: 0 },
    report: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast historical PR time-series querying
AnalysisSchema.index({ repositoryId: 1, createdAt: -1 });
AnalysisSchema.index({ repositoryId: 1, prNumber: 1 });

export const AnalysisModel: Model<AnalysisDocument> =
  mongoose.models.Analysis || mongoose.model<AnalysisDocument>("Analysis", AnalysisSchema);

// Memory fallback store for resilient operation without live Mongo daemon
class AnalysisStore {
  private inMemoryStore = new Map<string, IAnalysisRecord>();

  public async save(record: IAnalysisRecord): Promise<IAnalysisRecord> {
    this.inMemoryStore.set(record.analysisId, record);

    if (mongoose.connection.readyState === 1) {
      try {
        await AnalysisModel.findOneAndUpdate(
          { analysisId: record.analysisId },
          record,
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn("[AnalysisStore] MongoDB save failed, cached in memory:", err);
      }
    }
    return record;
  }

  public async getById(analysisId: string): Promise<IAnalysisRecord | null> {
    if (this.inMemoryStore.has(analysisId)) {
      return this.inMemoryStore.get(analysisId) || null;
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const doc = await AnalysisModel.findOne({ analysisId }).lean();
        if (doc) {
          return doc as unknown as IAnalysisRecord;
        }
      } catch (err) {
        console.warn("[AnalysisStore] MongoDB fetch failed:", err);
      }
    }
    return null;
  }

  public async getHistory(repositoryId?: string, limit = 50): Promise<IAnalysisRecord[]> {
    if (mongoose.connection.readyState === 1) {
      try {
        const query = repositoryId ? { repositoryId } : {};
        const docs = await AnalysisModel.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
        if (docs && docs.length > 0) {
          return docs as unknown as IAnalysisRecord[];
        }
      } catch (err) {
        console.warn("[AnalysisStore] MongoDB history fetch failed:", err);
      }
    }

    let records = Array.from(this.inMemoryStore.values());
    if (repositoryId) {
      records = records.filter((r) => r.repositoryId === repositoryId);
    }
    return records
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public clear(): void {
    this.inMemoryStore.clear();
  }
}

export const analysisStore = new AnalysisStore();
