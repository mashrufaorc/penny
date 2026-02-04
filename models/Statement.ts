import mongoose, { Schema, models, model, Types } from "mongoose";

export type StatementAI = {
  headline: string;
  whatWentWell: string[];
  whatToImprove: string[];
  termsLearned: { term: string; meaning: string }[];
  score: number;
};

export interface StatementDoc {
  userId: Types.ObjectId;
  monthIndex: number;
  balances: { chequingCents: number; savingsCents: number };

  // Store lightweight “snapshots” safely as Mixed arrays
  ledgerPreview: any[];
  tasksPreview: any[];

  ai: StatementAI;

  createdAt?: Date;
  updatedAt?: Date;
}

const StatementSchema = new Schema<StatementDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    monthIndex: { type: Number, required: true, index: true },

    balances: {
      chequingCents: { type: Number, required: true },
      savingsCents: { type: Number, required: true },
    },

    // Use Mixed arrays (best for “preview” snapshots)
    ledgerPreview: {
      type: [{ type: Schema.Types.Mixed }],
      default: [],
    },
    tasksPreview: {
      type: [{ type: Schema.Types.Mixed }],
      default: [],
    },

    ai: {
      headline: { type: String, default: "" },
      whatWentWell: { type: [String], default: [] },
      whatToImprove: { type: [String], default: [] },
      termsLearned: {
        type: [{ term: String, meaning: String }],
        default: [],
      },
      score: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// ensure only 1 statement per user+month (we overwrite on regenerate)
StatementSchema.index({ userId: 1, monthIndex: 1 }, { unique: true });

export const Statement =
  models.Statement || model<StatementDoc>("Statement", StatementSchema);
