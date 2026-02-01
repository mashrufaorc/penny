import mongoose, { Schema, models, model } from "mongoose";

export type AgeGroup = "kid" | "teen";

export type UserDoc = {
  email: string;
  passwordHash: string;
  name?: string;
  ageGroup: AgeGroup;
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "" },

    // ✅ FIX: allow "kid" | "teen"
    ageGroup: { type: String, enum: ["kid", "teen"], default: "kid", required: true },
  },
  { timestamps: true }
);

export const User = models.User || model<UserDoc>("User", UserSchema);
