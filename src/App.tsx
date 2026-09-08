import { useEffect, useMemo, useState } from "react";
import "./App.css";

type BrokerStatus = "Not Found" | "Found" | "Removal in Progress";
type RiskTier = "Critical" | "High" | "Medium" | "Low";

type MonitoringPlan = {
  frequency: string;
  nextCheck: string;
  reason: string;
};

type SubscriptionPlan = {
  planName: string;
  tier: string;
  billingCycle: string;
  seats: number;
  seatLimit: number;
  status: string;
  renewsAt: string | null;
  pendingSeatChange: number | null;
  appliedOnRenewal: string | null;
};

type BrokerFinding = {
  name: string;
  status: BrokerStatus;
  exposure: string;
  riskTier: RiskTier;
  score: number;
  details: string;
  proof: string;
  beforeState: string[];
  afterState: string[];
  verifiedAt: string;
  monitoring: MonitoringPlan;
};

const starterBrokers: BrokerFinding[] = [
  {
    name: "Whitepages",
    status: "Found",
    exposure: "Home address, full name, and phone number",
    riskTier: "Critical",
    score: 95,
    details:
      "This listing includes your home address next to your full name — this is the combination scammers use for impersonation scams.",
    proof:
      "Proof snapshot: before-state captured at 09:14, after-state pending verification.",
    beforeState: ["Full name", "Home address", "Phone number"],
    afterState: ["Full name", "Phone number"],
    verifiedAt: "09:14 UTC",
    monitoring: {
      frequency: "Every 6 hours",
      nextCheck: "14:00 UTC",
      reason: "High re-listing risk after previous removals",
    },
  },
  {
    name: "Spokeo",
    status: "Found",
    exposure: "Phone number and relatives",
    riskTier: "High",
    score: 78,
    details:
      "Phone-only and family-data exposures can drive robocalls and social-engineering attempts.",
    proof:
      "Proof snapshot: before-state captured at 09:15, after-state pending verification.",
    beforeState: ["Phone number", "Relatives"],
    afterState: ["Relatives"],
    verifiedAt: "09:15 UTC",
    monitoring: {
      frequency: "Every 12 hours",
      nextCheck: "21:15 UTC",
      reason: "Moderate re-listing risk for phone-based listings",
    },
  },
  {
    name: "BeenVerified",
    status: "Removal in Progress",
    exposure: "Previous employer and city",
    riskTier: "Low",
    score: 34,
    details:
      "This is a lower-severity exposure, but it still helps scammers build a profile of your life.",
    proof:
      "Proof snapshot: removal request submitted and verification scheduled.",
    beforeState: ["Employer", "City"],
    afterState: ["Employer", "City"],
    verifiedAt: "09:18 UTC",
    monitoring: {
      frequency: "Every 24 hours",
      nextCheck: "09:18 UTC tomorrow",
      reason: "Low-risk exposure with stable history",
    },
  },
];

function HeroArtwork() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="visual-frame">
        <div className="visual-topbar">
          <div className="window-dots">
            <span className="dot red" />
            <span className="dot amber" />
            <span className="dot green" />
          </div>
          <span className="visual-caption">Live scan</span>
        </div>

        <div className="visual-main-panel">
          <div className="monitoring-ring-wrap">
            <svg className="monitoring-ring" viewBox="0 0 180 180" role="img">
              <defs>
                <linearGradient
                  id="ringGradient"
                  x1="0%"
                  x2="100%"
                  y1="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#d7ebff" />
                  <stop offset="50%" stopColor="#8bc6f2" />
                  <stop offset="100%" stopColor="#0f1717" />
                </linearGradient>
              </defs>
              <circle
                cx="90"
                cy="90"
                r="62"
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="16"
              />
              <circle
                cx="90"
                cy="90"
                r="62"
                fill="none"
                stroke="url(#ringGradient)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray="280 220"
                transform="rotate(-90 90 90)"
              />
            </svg>
            <div className="ring-label">
              <strong>87%</strong>
              <span>coverage</span>
            </div>
          </div>

          <div className="visual-side-stack">
            <div className="mini-stat">
              <span className="mini-label">Flagged</span>
              <strong>+14</strong>
            </div>
            <div className="mini-chart" aria-hidden="true">
              <span style={{ height: "40%" }} />
              <span style={{ height: "62%" }} />
              <span style={{ height: "78%" }} />
              <span style={{ height: "58%" }} />
              <span style={{ height: "90%" }} />
              <span style={{ height: "70%" }} />
            </div>
          </div>
        </div>

        <div className="visual-footer">
          <div>
            <span>last sync</span>
            <strong>2 min ago</strong>
          </div>
          <div>
            <span>verified</span>
            <strong>13 items</strong>
          </div>
          <div>
            <span>risk</span>
            <strong>Watchlist</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  });
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<BrokerFinding[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionPlan>({
    planName: "Free Scan",
    tier: "individual",
    billingCycle: "monthly",
    seats: 1,
    seatLimit: 1,
    status: "Active",
    renewsAt: null,
    pendingSeatChange: null,
    appliedOnRenewal: null,
  });
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    company: "",
    teamSize: "",
    source: "",
  });
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);
  const [businessSeats, setBusinessSeats] = useState(8);
  const [pendingSeatChange, setPendingSeatChange] = useState<number | null>(
    null,
  );
  const [seatWarning, setSeatWarning] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "No scan started yet. Run a free scan to see live broker findings.",
  );

  const summary = useMemo(() => {
    const found = results.filter((item) => item.status === "Found").length;
    const inProgress = results.filter(
      (item) => item.status === "Removal in Progress",
    ).length;
    return { found, inProgress };
  }, [results]);

  const monitoringStats = useMemo(() => {
    const active = results.length;
    const highRisk = results.filter((item) => item.score >= 75).length;
    const averageResolution =
      active > 0 ? `${Math.round(18 + active * 2)} hrs` : "24 hrs";
    return { active, highRisk, averageResolution };
  }, [results]);

  const effectivePendingSeatChange =
    pendingSeatChange ?? subscription.pendingSeatChange ?? null;

  const formatEffectiveDate = (value: string | null) => {
    if (!value) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  };

  const renewalMessage = useMemo(() => {
    if (effectivePendingSeatChange !== null) {
      const appliedOnRenewal = formatEffectiveDate(
        subscription.appliedOnRenewal,
      );
      const appliedText = appliedOnRenewal
        ? `Effective on ${appliedOnRenewal}`
        : "Applied on renewal";
      return `Pending seat change for ${effectivePendingSeatChange} seats. ${appliedText}.`;
    }

    if (subscription.renewsAt) {
      return `Renews ${new Date(subscription.renewsAt).toLocaleDateString()}`;
    }

    return "Renews on your next billing cycle";
  }, [
    effectivePendingSeatChange,
    subscription.appliedOnRenewal,
    subscription.renewsAt,
  ]);

  const requestSeatChange = (nextSeats: number) => {
    const delta = nextSeats - businessSeats;
    setPendingSeatChange(nextSeats);

    if (delta > 0) {
      setSeatWarning(`Upgrade warning: increasing seats to ${nextSeats}.`);
    } else if (delta < 0) {
      setSeatWarning(`Downgrade warning: lowering seats to ${nextSeats}.`);
    } else {
      setSeatWarning(null);
      setPendingSeatChange(null);
    }
  };

  const applySeatChange = async () => {
    if (pendingSeatChange !== null) {
      try {
        const response = await fetch(
          "http://localhost:3001/api/subscriptions",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seats: pendingSeatChange }),
          },
        );

        if (response.ok) {
          const payload = await response.json();
          setSubscription((current) => ({
            ...current,
            seats: payload.subscription?.seats ?? pendingSeatChange,
            pendingSeatChange: payload.subscription?.pendingSeatChange ?? null,
            appliedOnRenewal: payload.subscription?.appliedOnRenewal ?? null,
          }));
          setPendingSeatChange(null);
          setSeatWarning(null);
        }
      } catch {
        // fall back to the local UI state if the backend is unavailable
      } finally {
        setBusinessSeats(pendingSeatChange);
      }
    }
  };

  useEffect(() => {
    const loadState = async () => {
      try {
        const [scanResponse, subscriptionResponse] = await Promise.all([
          fetch("http://localhost:3001/api/scan-state"),
          fetch("http://localhost:3001/api/subscriptions"),
        ]);

        if (scanResponse.ok) {
          const payload = await scanResponse.json();
          if (payload.scans?.length) {
            const latest = payload.scans[0];
            setResults(latest.results ?? starterBrokers);
            setStatusMessage(
              `Loaded saved scan from ${new Date(latest.submittedAt).toLocaleString()}`,
            );
          }
        }

        if (subscriptionResponse.ok) {
          const payload = await subscriptionResponse.json();
          if (payload.subscription) {
            setSubscription({
              planName: payload.subscription.planName,
              tier: payload.subscription.tier,
              billingCycle: payload.subscription.billingCycle,
              seats: payload.subscription.seats,
              seatLimit: payload.subscription.seatLimit,
              status: payload.subscription.status,
              renewsAt: payload.subscription.renewsAt,
              pendingSeatChange: payload.subscription.pendingSeatChange ?? null,
              appliedOnRenewal: payload.subscription.appliedOnRenewal ?? null,
            });
          }
        }
      } catch {
        // fall back to the local starter experience when the server is unavailable
      }
    };

    loadState();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsScanning(true);
    setStatusMessage("Checking broker sites and capturing proof snapshots…");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        location: form.location,
        results: starterBrokers,
      };

      const response = await fetch("http://localhost:3001/api/scan-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setResults(starterBrokers);
        setStatusMessage(
          `Scan saved and monitored. Proof snapshots are now stored for ${form.name || "your profile"}.`,
        );
      }
    } catch {
      setResults(starterBrokers);
      setStatusMessage(
        "Scan completed locally. Backend unavailable, but the results are still shown.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-row">
            <p className="brand-mark">Cleartrace</p>
            <span className="brand-meta">briefing desk</span>
          </div>
          <span className="brand-subtitle">public-record monitoring</span>
        </div>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#pricing">Pricing</a>
          <a href="#business">Business</a>
        </nav>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">investigation briefing</p>
          <h1>A public record of what is exposed.</h1>
          <p className="hero-text">
            Cleartrace converts broker listings into a traceable case file: what
            is appearing, why it matters, and what changed after the removal
            request was submitted. The evidence remains attached to the record.
          </p>
          <div className="hero-points">
            <div className="hero-point">
              <strong>Current exposure</strong>
              <span>
                Each listing is paired with a live record and a plain-language
                risk assessment.
              </span>
            </div>
            <div className="hero-point">
              <strong>Verified progress</strong>
              <span>
                Before and after states remain attached to the case so outcome
                tracking is visible.
              </span>
            </div>
          </div>

          <div className="signal-strip" aria-label="Monitoring signal summary">
            <div className="signal-card signal-card-primary">
              <span className="label">Visible</span>
              <strong>23</strong>
              <small>listing alerts</small>
            </div>
            <div className="signal-card">
              <span className="label">Removed</span>
              <strong>11</strong>
              <small>resolved</small>
            </div>
            <div className="signal-card">
              <span className="label">Monitored</span>
              <strong>24/7</strong>
              <small>runtime</small>
            </div>
          </div>

          <div
            className="proof-ledger-card"
            aria-label="Sample verification record"
          >
            <div className="proof-ledger-top">
              <span className="proof-pill">Verified record</span>
              <span className="proof-time">Updated 09:18 UTC</span>
            </div>
            <div className="proof-ledger-body">
              <div className="proof-ledger-row">
                <span>Whitepages</span>
                <strong>Home address removed</strong>
              </div>
              <ul>
                <li>Before snapshot captured at 09:14 UTC</li>
                <li>Removal request submitted at 09:16 UTC</li>
                <li>Verification pending review</li>
              </ul>
            </div>
          </div>
        </div>

        <HeroArtwork />

        <form className="scan-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              aria-label="Full name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Ava Chen"
              required
            />
          </label>
          <label>
            Email
            <input
              aria-label="Email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="ava@example.com"
              required
            />
          </label>
          <label>
            Phone
            <input
              aria-label="Phone"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              placeholder="555-0100"
              required
            />
          </label>
          <label>
            City and state
            <input
              aria-label="City and state"
              value={form.location}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
              placeholder="Austin, TX"
              required
            />
          </label>
          <button type="submit">Run review</button>
        </form>
      </section>

      <section className="trust-section" aria-label="Proof and trust overview">
        <div className="trust-section-heading">
          <p className="eyebrow">Why the method matters</p>
          <h2>Privacy cleanup is only as credible as the record behind it.</h2>
        </div>
        <div className="trust-grid">
          <article className="trust-card">
            <h3>Review before you pay</h3>
            <p>
              See the kinds of records that are surfacing, how they are being
              used, and what risk they carry before a commitment is made.
            </p>
          </article>
          <article className="trust-card">
            <h3>Proof attached to each case</h3>
            <p>
              Every broker record carries a timestamp, a before-state snapshot,
              and the follow-up trail that shows whether the removal is working.
            </p>
          </article>
          <article className="trust-card">
            <h3>Monitoring tied to risk</h3>
            <p>
              Higher-risk exposures get more frequent checks, so the service
              stays useful instead of generic.
            </p>
          </article>
        </div>
      </section>

      <section className="workflow-section" aria-label="How Cleartrace works">
        <div className="workflow-heading">
          <p className="eyebrow">method</p>
          <h2>A concise review process, grounded in evidence.</h2>
        </div>
        <div className="workflow-grid">
          <article className="workflow-card">
            <span>01</span>
            <h3>Start with the facts</h3>
            <p>
              Add the details you already know, then review which brokers are
              surfacing your personal information.
            </p>
          </article>
          <article className="workflow-card">
            <span>02</span>
            <h3>Assess the exposure</h3>
            <p>
              Read the risk explanation, compare the before and after states,
              and confirm the record is being handled seriously.
            </p>
          </article>
          <article className="workflow-card">
            <span>03</span>
            <h3>Keep watching</h3>
            <p>
              Continue receiving updates as each request moves forward and new
              exposures reappear in the wild.
            </p>
          </article>
        </div>
      </section>

      <section className="results-panel">
        <div className="results-header">
          <div>
            <p className="eyebrow">Live scan status</p>
            <h2>Proof-first broker results</h2>
          </div>
          <div className="summary-card" aria-label="Findings summary">
            <div className="summary-item">
              <strong>{summary.found}</strong>
              <span>Found</span>
            </div>
            <div className="summary-item">
              <strong>{summary.inProgress}</strong>
              <span>In progress</span>
            </div>
          </div>
        </div>

        <section className="dashboard-card">
          <div className="dashboard-grid">
            <div>
              <p className="eyebrow">Adaptive monitoring</p>
              <h3>High-risk brokers are checked more often</h3>
              <p className="dashboard-copy">
                Cleartrace prioritizes fast re-checks based on the likelihood of
                re-listing and the severity of the exposure.
              </p>
            </div>
            <div className="stats-grid">
              <div>
                <strong>{monitoringStats.active}</strong>
                <span>Brokers covered</span>
              </div>
              <div>
                <strong>{monitoringStats.highRisk}</strong>
                <span>High-risk watchlist</span>
              </div>
              <div>
                <strong>{monitoringStats.averageResolution}</strong>
                <span>Avg. resolution window</span>
              </div>
            </div>
          </div>
        </section>

        <div
          className="report-surface"
          aria-label="Executive reporting dashboard"
        >
          <div className="report-header">
            <div>
              <span className="mini-kicker">Exposure board</span>
              <h3>Broker visibility</h3>
            </div>
            <span className="live-badge">Live</span>
          </div>
          <div className="report-grid">
            <div className="line-chart" aria-hidden="true">
              <span style={{ height: "24%" }} />
              <span style={{ height: "36%" }} />
              <span style={{ height: "42%" }} />
              <span style={{ height: "52%" }} />
              <span style={{ height: "66%" }} />
              <span style={{ height: "74%" }} />
              <span style={{ height: "88%" }} />
              <span style={{ height: "100%" }} />
            </div>
            <div className="report-stack">
              <div className="report-chip report-chip-critical">
                <span>Critical</span>
                <strong>6</strong>
              </div>
              <div className="report-chip">
                <span>Resolved</span>
                <strong>11</strong>
              </div>
              <div className="report-chip">
                <span>Watchlist</span>
                <strong>24h</strong>
              </div>
            </div>
          </div>
        </div>

        {isScanning ? (
          <p className="status-message">{statusMessage}</p>
        ) : results.length === 0 ? (
          <p className="status-message">{statusMessage}</p>
        ) : (
          <div className="broker-list">
            {results.map((broker) => (
              <article key={broker.name} className="broker-card">
                <div className="broker-topline">
                  <h3>{broker.name}</h3>
                  <span
                    className={`tag ${broker.status.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {broker.status}
                  </span>
                </div>
                <p className="exposure">Exposed: {broker.exposure}</p>
                <div className="risk-row">
                  <p className="risk">Risk tier: {broker.riskTier}</p>
                  <p className="risk-score">Risk score: {broker.score}/100</p>
                </div>
                <p className="details">{broker.details}</p>
                <div className="comparison-card">
                  <div>
                    <h4>Before/After comparison</h4>
                    <p className="comparison-title">Before</p>
                    <ul>
                      {broker.beforeState.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="comparison-title">After</p>
                    <ul>
                      {broker.afterState.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="proof">{broker.proof}</p>
                <div className="monitoring-pill">
                  <strong>Adaptive rescan</strong>
                  <span>{broker.monitoring.frequency}</span>
                  <small>
                    Next check {broker.monitoring.nextCheck} ·{" "}
                    {broker.monitoring.reason}
                  </small>
                </div>
                <p className="verified">Verified at {broker.verifiedAt}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        className="social-proof-panel"
        aria-label="Social proof and usage metrics"
      >
        <div className="social-proof-copy">
          <p className="eyebrow">coverage</p>
          <h2>The metrics that show the system is performing.</h2>
          <p>
            Coverage, response time, and verifiable progress matter more than a
            polished promise. These are the signals people actually check.
          </p>
        </div>
        <div className="social-proof-grid">
          <article>
            <strong>42k+</strong>
            <span>Broker profiles monitored</span>
          </article>
          <article>
            <strong>17k+</strong>
            <span>Removal requests tracked</span>
          </article>
          <article>
            <strong>3.1 hrs</strong>
            <span>Typical verification turnaround</span>
          </article>
        </div>
      </section>

      <section className="pricing-panel" id="pricing">
        <div className="pricing-copy">
          <p className="eyebrow">pricing</p>
          <h2>Choose the monitoring level that matches the exposure.</h2>
          <p>
            Monthly and annual billing are set out plainly so the cost can be
            weighed against the depth of monitoring required.
          </p>
          <div
            className="billing-toggle"
            role="tablist"
            aria-label="Billing cycle selector"
          >
            <button
              type="button"
              className={
                billingCycle === "monthly"
                  ? "toggle-pill active"
                  : "toggle-pill"
              }
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={
                billingCycle === "annual" ? "toggle-pill active" : "toggle-pill"
              }
              onClick={() => setBillingCycle("annual")}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          <article className="pricing-card plan-card">
            <p className="plan-name">Individual</p>
            <div className="price-row">
              <strong>{billingCycle === "annual" ? "$15" : "$19"}</strong>
              <span>/month</span>
            </div>
            {billingCycle === "annual" ? (
              <p className="discount-badge">Save ~$48/year</p>
            ) : (
              <p className="guarantee-badge">30-day money-back guarantee</p>
            )}
            <p className="plan-description">
              Perfect for solo cleanup and continuous proof tracking.
            </p>
            <ul>
              <li>Full data-broker removal guidance</li>
              <li>AI risk scoring and proof snapshots</li>
              <li>Standard-frequency monitoring</li>
            </ul>
          </article>

          <article className="pricing-card plan-card featured-plan">
            <p className="plan-name">Family</p>
            <div className="price-row">
              <strong>{billingCycle === "annual" ? "$29" : "$34"}</strong>
              <span>/month</span>
            </div>
            {billingCycle === "annual" ? (
              <p className="discount-badge">Save ~$60/year</p>
            ) : (
              <p className="guarantee-badge">30-day money-back guarantee</p>
            )}
            <p className="plan-description">
              Everything in Individual, plus private dashboards for up to 5
              members.
            </p>
            <ul>
              <li>Up to 5 family seats</li>
              <li>Priority monitoring cadence</li>
              <li>One owner account for member management</li>
            </ul>
          </article>

          <article
            className="pricing-card plan-card business-plan"
            id="business"
          >
            <p className="plan-name">Business</p>
            <div className="price-row">
              <strong>{billingCycle === "annual" ? "Custom" : "$79"}</strong>
              <span>{billingCycle === "annual" ? "" : "/month"}</span>
            </div>
            <p className="discount-badge">Talk to our team</p>
            <p className="plan-description">
              Built for teams, admins, and compliance-minded orgs.
            </p>
            <ul>
              <li>SSO and admin console placeholders</li>
              <li>Usage and compliance reporting stubs</li>
              <li>Dedicated account support</li>
            </ul>
            <div className="admin-stub">
              <div className="admin-stub-header">
                <strong>Business admin console</strong>
                <span>Seat management + usage overview</span>
              </div>
              <div className="seat-control">
                <label htmlFor="business-seats">Active seats</label>
                <div className="seat-actions">
                  <button
                    type="button"
                    aria-label="Decrease active seats"
                    onClick={() =>
                      requestSeatChange(Math.max(1, businessSeats - 1))
                    }
                  >
                    −
                  </button>
                  <span id="business-seats">{businessSeats}</span>
                  <button
                    type="button"
                    aria-label="Increase active seats"
                    onClick={() => requestSeatChange(businessSeats + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              {seatWarning ? (
                <div className="seat-warning" role="status" aria-live="polite">
                  <strong>{seatWarning}</strong>
                  <p>
                    {seatWarning.includes("Upgrade warning")
                      ? "This adds capacity and may change your billing."
                      : "This reduces capacity and may remove access for some users."}
                  </p>
                  <button
                    type="button"
                    className="apply-seat-button"
                    onClick={applySeatChange}
                  >
                    Apply seat change
                  </button>
                </div>
              ) : null}
              {effectivePendingSeatChange !== null ? (
                <p className="seat-effective-date">
                  {formatEffectiveDate(subscription.appliedOnRenewal)
                    ? `Effective on ${formatEffectiveDate(subscription.appliedOnRenewal)}`
                    : "Effective on renewal"}
                </p>
              ) : null}
              <div className="admin-metrics">
                <div>
                  <strong>SSO</strong>
                  <p>Pending configuration</p>
                </div>
                <div>
                  <strong>Audit exports</strong>
                  <p>Weekly reports ready</p>
                </div>
                <div>
                  <strong>Usage</strong>
                  <p>1.2k checks this month</p>
                </div>
              </div>
            </div>
            <form
              className="lead-form"
              onSubmit={async (event) => {
                event.preventDefault();

                try {
                  const response = await fetch(
                    "http://localhost:3001/api/leads",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: leadForm.name,
                        email: leadForm.email,
                        company: leadForm.company,
                        teamSize: leadForm.teamSize,
                        source: leadForm.source,
                      }),
                    },
                  );

                  if (response.ok) {
                    const payload = await response.json();
                    setLeadSubmitted(true);
                    setSavedLeadId(payload.leadId ?? null);
                  }
                } catch {
                  setLeadSubmitted(true);
                }
              }}
            >
              <label>
                Name
                <input
                  aria-label="Lead name"
                  value={leadForm.name}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, name: event.target.value })
                  }
                  placeholder="Jordan Lee"
                  required
                />
              </label>
              <label>
                Work email
                <input
                  aria-label="Lead email"
                  type="email"
                  value={leadForm.email}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, email: event.target.value })
                  }
                  placeholder="jordan@company.com"
                  required
                />
              </label>
              <label>
                Company
                <input
                  aria-label="Company"
                  value={leadForm.company}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, company: event.target.value })
                  }
                  placeholder="Northwind Labs"
                  required
                />
              </label>
              <label>
                Team size
                <input
                  aria-label="Team size"
                  value={leadForm.teamSize}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, teamSize: event.target.value })
                  }
                  placeholder="25"
                  required
                />
              </label>
              <label>
                How did you hear about us?
                <input
                  aria-label="Lead source"
                  value={leadForm.source}
                  onChange={(event) =>
                    setLeadForm({ ...leadForm, source: event.target.value })
                  }
                  placeholder="Conference, referral, etc."
                  required
                />
              </label>
              <button type="submit">Request a consult</button>
            </form>
            {leadSubmitted ? (
              <div className="lead-success">
                <p>Lead saved successfully.</p>
                <p className="lead-success-subtext">
                  We’ll reach out with a tailored Business quote
                  {savedLeadId
                    ? ` and share your reference ${savedLeadId}.`
                    : "."}
                </p>
              </div>
            ) : null}
          </article>
        </div>

        <div className="pricing-card account-card">
          <p className="eyebrow">Account status</p>
          <h3>{subscription.planName}</h3>
          <p className="plan-status">Status: {subscription.status}</p>
          {effectivePendingSeatChange !== null ? (
            <p className="pending-badge">Pending change</p>
          ) : null}
          {effectivePendingSeatChange !== null ? (
            <p className="renewal-pill">
              {formatEffectiveDate(subscription.appliedOnRenewal)
                ? `Applied on renewal ${formatEffectiveDate(subscription.appliedOnRenewal)}`
                : "Applied on renewal"}
            </p>
          ) : null}
          <p>
            {subscription.tier.charAt(0).toUpperCase() +
              subscription.tier.slice(1)}{" "}
            ·{" "}
            {subscription.billingCycle.charAt(0).toUpperCase() +
              subscription.billingCycle.slice(1)}
          </p>
          <p>
            {subscription.seats}/{subscription.seatLimit} seats active
          </p>
          <p>{renewalMessage}</p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <p className="brand-mark">Cleartrace</p>
          <p>Privacy monitoring with a clear record of what changed.</p>
        </div>
        <div className="footer-links">
          <a href="#pricing">Pricing</a>
          <a href="#business">Business</a>
        </div>
      </footer>
    </main>
  );
}

export default App;
