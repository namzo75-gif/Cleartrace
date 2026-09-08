import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { db, initializeSchema } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  await initializeSchema();

  const existing = await db.query("SELECT COUNT(*) AS count FROM users");
  const userCount = Number(existing[0]?.count || 0);

  if (userCount > 0) {
    console.log("Seed data already exists; nothing to insert.");
    return;
  }

  const userId = "seed-user";
  const scanId = "seed-scan";
  const submittedAt = new Date().toISOString();

  await db.run(
    "INSERT INTO users (id, name, email, phone, location, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      userId,
      "Ava Chen",
      "ava@example.com",
      "555-0100",
      "Austin, TX",
      submittedAt,
    ],
  );

  await db.run(
    "INSERT INTO scan_runs (id, user_id, submitted_at) VALUES (?, ?, ?)",
    [scanId, userId, submittedAt],
  );

  await db.run(
    "INSERT INTO subscriptions (id, user_id, plan_name, tier, billing_cycle, seats, seat_limit, status, started_at, renews_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "seed-subscription",
      userId,
      "Pro Monitor",
      "family",
      "monthly",
      3,
      5,
      "active",
      submittedAt,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ],
  );

  const brokerSeed = [
    {
      id: "seed-broker-whitepages",
      name: "Whitepages",
      status: "Found",
      exposure: "Home address, full name, and phone number",
      riskTier: "Critical",
      score: 95,
      details:
        "Home address linked with full name creates a strong impersonation risk.",
      proof: "Proof snapshot captured for initial verification.",
      beforeState: ["Full name", "Home address", "Phone number"],
      afterState: ["Full name", "Phone number"],
      verifiedAt: "09:14 UTC",
      frequency: "Every 6 hours",
      nextCheck: "14:00 UTC",
      monitoringReason: "High re-listing risk after previous removals",
    },
  ];

  for (const broker of brokerSeed) {
    await db.run(
      "INSERT INTO brokers (id, scan_id, name, status, exposure, risk_tier, score, details, proof, before_state, after_state, verified_at, frequency, next_check, monitoring_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        broker.id,
        scanId,
        broker.name,
        broker.status,
        broker.exposure,
        broker.riskTier,
        broker.score,
        broker.details,
        broker.proof,
        JSON.stringify(broker.beforeState),
        JSON.stringify(broker.afterState),
        broker.verifiedAt,
        broker.frequency,
        broker.nextCheck,
        broker.monitoringReason,
      ],
    );

    await db.run(
      "INSERT INTO monitoring_events (id, scan_id, broker_id, event_type, occurred_at, details) VALUES (?, ?, ?, ?, ?, ?)",
      [
        `${broker.id}-event`,
        scanId,
        broker.id,
        "detected",
        submittedAt,
        `${broker.name} listed for monitoring`,
      ],
    );
  }

  console.log("Seed data inserted successfully.");
}

runSeed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
