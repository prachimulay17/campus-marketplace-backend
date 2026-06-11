/**
 * Migration: Drop stale compound indexes on Conversation that combine
 * multiple array fields (participants + pinnedBy, participants + hiddenFor).
 *
 * MongoDB rejects compound indexes on multiple array fields.
 * Run this once after deploying the schema change.
 *
 * Usage: node src/db/migrate-drop-stale-indexes.js
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/campus-marketplace";

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI, { autoIndex: false });
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("conversations");

    // List current indexes
    const indexes = await collection.indexes();
    console.log(
      "Current indexes:",
      indexes.map((i) => i.name)
    );

    // Drop stale compound indexes if they exist
    const staleIndexes = [
      "participants_1_pinnedBy_1_updatedAt_-1",
      "participants_1_pinnedBy_1",
      "participants_1_hiddenFor_1",
    ];

    for (const indexName of staleIndexes) {
      const exists = indexes.some((i) => i.name === indexName);
      if (exists) {
        await collection.dropIndex(indexName);
        console.log(`Dropped index: ${indexName}`);
      } else {
        console.log(`Index not found (already dropped): ${indexName}`);
      }
    }

    // Verify final indexes
    const finalIndexes = await collection.indexes();
    console.log(
      "Final indexes:",
      finalIndexes.map((i) => ({ name: i.name, key: i.key }))
    );

    console.log("Migration complete");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
