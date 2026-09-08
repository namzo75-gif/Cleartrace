import express from "express";
import cors from "cors";
import { db, initializeSchema } from "./db.js";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/scan-state", async (_req, res) => {
  try {
    const rows = await db.query(`
      SELECT sr.id AS scan_id, sr.submitted_at, u.name, u.email, u.phone, u.location, b.id AS broker_id, b.name AS broker_name,
             b.status, b.exposure, b.risk_tier, b.score, b.details, b.proof, b.before_state, b.after_state, b.verified_at,
             b.frequency, b.next_check, b.monitoring_reason
      FROM scan_runs sr
      JOIN users u ON u.id = sr.user_id
      LEFT JOIN brokers b ON b.scan_id = sr.id
      ORDER BY sr.submitted_at DESC, b.name ASC
      LIMIT 12
    `);

    const scans = [];
    const map = new Map();

    for (const row of rows) {
      if (!map.has(row.scan_id)) {
        map.set(row.scan_id, {
          id: row.scan_id,
          submittedAt: row.submitted_at,
          name: row.name,
          email: row.email,
          phone: row.phone,
          location: row.location,
          results: [],
        });
        scans.push(map.get(row.scan_id));
      }

      if (row.broker_id) {
        map.get(row.scan_id).results.push({
          id: row.broker_id,
          name: row.broker_name,
          status: row.status,
          exposure: row.exposure,
          riskTier: row.risk_tier,
          score: row.score,
          details: row.details,
          proof: row.proof,
          beforeState: JSON.parse(row.before_state),
          afterState: JSON.parse(row.after_state),
          verifiedAt: row.verified_at,
          monitoring: {
            frequency: row.frequency,
            nextCheck: row.next_check,
            reason: row.monitoring_reason,
          },
        });
      }
    }

    res.json({ scans });
  } catch (error) {
    res.status(500).json({ error: "Unable to load scan state" });
  }
});

app.get("/api/subscriptions", async (_req, res) => {
  try {
    const rows = await db.query(`
      SELECT id, plan_name, tier, billing_cycle, seats, seat_limit, status, started_at, renews_at, pending_seat_change
      FROM subscriptions
      ORDER BY started_at DESC
      LIMIT 1
    `);

    const subscription = rows[0]
      ? {
          id: rows[0].id,
          planName: rows[0].plan_name,
          tier: rows[0].tier,
          billingCycle: rows[0].billing_cycle,
          seats: rows[0].seats,
          seatLimit: rows[0].seat_limit,
          status: rows[0].status,
          startedAt: rows[0].started_at,
          renewsAt: rows[0].renews_at,
          pendingSeatChange: rows[0].pending_seat_change ?? null,
          appliedOnRenewal: rows[0].renews_at ?? null,
        }
      : null;

    if (
      subscription &&
      subscription.pendingSeatChange !== null &&
      subscription.renewsAt &&
      new Date(subscription.renewsAt) <= new Date()
    ) {
      await db.run(
        `
        UPDATE subscriptions
        SET pending_seat_change = NULL
        WHERE id = ?
      `,
        [subscription.id],
      );

      subscription.pendingSeatChange = null;
    }

    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: "Unable to load subscriptions" });
  }
});

app.put("/api/subscriptions", async (req, res) => {
  try {
    const { seats, pendingSeatChange } = req.body;
    const normalizedSeats = Number(seats);

    if (!Number.isInteger(normalizedSeats) || normalizedSeats < 1) {
      return res
        .status(400)
        .json({ error: "Seats must be a positive integer" });
    }

    const rows = await db.query(`
      SELECT id, user_id, plan_name, tier, billing_cycle, seats, seat_limit, status, started_at, renews_at, pending_seat_change
      FROM subscriptions
      ORDER BY started_at DESC
      LIMIT 1
    `);

    if (!rows[0]) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const updateSubscription =
      db.kind === "postgres"
        ? async (params) =>
            db.run(
              `
          UPDATE subscriptions
          SET seats = $1, pending_seat_change = $2
          WHERE id = $3
        `,
              params,
            )
        : async (params) =>
            db.run(
              `
          UPDATE subscriptions
          SET seats = ?, pending_seat_change = ?
          WHERE id = ?
        `,
              params,
            );

    const nextPendingSeatChange = pendingSeatChange ?? null;
    await updateSubscription([
      normalizedSeats,
      nextPendingSeatChange,
      rows[0].id,
    ]);

    const subscription = {
      id: rows[0].id,
      planName: rows[0].plan_name,
      tier: rows[0].tier,
      billingCycle: rows[0].billing_cycle,
      seats: normalizedSeats,
      seatLimit: rows[0].seat_limit,
      status: rows[0].status,
      startedAt: rows[0].started_at,
      renewsAt: rows[0].renews_at,
      pendingSeatChange: nextPendingSeatChange,
      appliedOnRenewal:
        nextPendingSeatChange !== null ? rows[0].renews_at : null,
    };

    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: "Unable to update subscription" });
  }
});

app.post("/api/leads", async (req, res) => {
  try {
    const { name, email, company, teamSize, source } = req.body || {};

    if (!name || !email || !company || !teamSize || !source) {
      return res.status(400).json({ error: "All lead fields are required" });
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email is required" });
    }

    const lead = {
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
      name,
      email,
      company,
      teamSize,
      source,
    };

    await db.run(
      `
      INSERT INTO leads (id, name, email, company, team_size, source, submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        lead.id,
        lead.name,
        lead.email,
        lead.company,
        lead.teamSize,
        lead.source,
        lead.submittedAt,
      ],
    );

    res.status(201).json({ ok: true, lead, leadId: lead.id });
  } catch (error) {
    res.status(500).json({ error: "Unable to save lead" });
  }
});

app.post("/api/scan-state", async (req, res) => {
  try {
    const nextScan = {
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
      ...req.body,
    };

    const userId = `${nextScan.id}-user`;
    await db.run(
      `
      INSERT INTO users (id, name, email, phone, location, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        userId,
        nextScan.name,
        nextScan.email,
        nextScan.phone,
        nextScan.location,
        nextScan.submittedAt,
      ],
    );

    await db.run(
      `
      INSERT INTO scan_runs (id, user_id, submitted_at)
      VALUES ($1, $2, $3)
    `,
      [nextScan.id, userId, nextScan.submittedAt],
    );

    const insertBroker =
      db.kind === "postgres"
        ? async (params) =>
            db.run(
              `
          INSERT INTO brokers (
            id, scan_id, name, status, exposure, risk_tier, score, details, proof,
            before_state, after_state, verified_at, frequency, next_check, monitoring_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `,
              params,
            )
        : async (params) =>
            db.run(
              `
          INSERT INTO brokers (
            id, scan_id, name, status, exposure, risk_tier, score, details, proof,
            before_state, after_state, verified_at, frequency, next_check, monitoring_reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
              params,
            );

    const insertEvent =
      db.kind === "postgres"
        ? async (params) =>
            db.run(
              `
          INSERT INTO monitoring_events (id, scan_id, broker_id, event_type, occurred_at, details)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
              params,
            )
        : async (params) =>
            db.run(
              `
          INSERT INTO monitoring_events (id, scan_id, broker_id, event_type, occurred_at, details)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
              params,
            );

    for (const broker of nextScan.results) {
      const brokerId = `${nextScan.id}-${broker.name.toLowerCase().replace(/\s+/g, "-")}`;
      await insertBroker([
        brokerId,
        nextScan.id,
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
        broker.monitoring.frequency,
        broker.monitoring.nextCheck,
        broker.monitoring.reason,
      ]);

      await insertEvent([
        `${brokerId}-event`,
        nextScan.id,
        brokerId,
        broker.status === "Found" ? "detected" : "monitoring",
        nextScan.submittedAt,
        `${broker.name} listed for monitoring`,
      ]);
    }

    res.status(201).json(nextScan);
  } catch (error) {
    res.status(500).json({ error: "Unable to save scan state" });
  }
});

async function startServer() {
  await initializeSchema();
  app.listen(port, () => {
    console.log(
      `Cleartrace persistence server running on http://localhost:${port}`,
    );
  });
}

startServer();
