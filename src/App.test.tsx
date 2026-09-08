import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

describe("Cleartrace scan flow", () => {
  it("renders the active subscription plan from the backend in the pricing section", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string | URL | Request) => {
        const target = typeof url === "string" ? url : url.toString();

        if (target.includes("/api/subscriptions")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              subscription: {
                planName: "Pro Monitor",
                tier: "family",
                billingCycle: "monthly",
                seats: 3,
                seatLimit: 5,
                status: "Active",
                renewsAt: "2026-09-04T00:00:00.000Z",
              },
            }),
          } as Response);
        }

        if (target.includes("/api/scan-state")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ scans: [] }),
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      }),
    );

    render(<App />);

    expect(await screen.findByText(/pro monitor/i)).toBeTruthy();
    expect(screen.getByText(/status: active/i)).toBeTruthy();
    expect(screen.getByText(/family · monthly/i)).toBeTruthy();
    expect(screen.getByText(/3\/5 seats active/i)).toBeTruthy();
  });

  it("renders the Business admin stub with seat controls and usage placeholders", () => {
    render(<App />);

    expect(screen.getByText(/business admin console/i)).toBeTruthy();
    expect(screen.getByText(/active seats/i)).toBeTruthy();
    expect(screen.getByText(/^usage$/i)).toBeTruthy();
    expect(screen.getByText(/1.2k checks this month/i)).toBeTruthy();
  });

  it("shows upgrade and downgrade seat-change warnings before applying the change", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /increase active seats/i }),
    );
    expect(screen.getByText(/upgrade warning/i)).toBeTruthy();
    expect(screen.getByText(/increasing seats to 9/i)).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: /apply seat change/i }),
    );

    await user.click(
      screen.getByRole("button", { name: /decrease active seats/i }),
    );
    expect(screen.getByText(/downgrade warning/i)).toBeTruthy();
    expect(screen.getByText(/lowering seats to 8/i)).toBeTruthy();
  });

  it("persists seat changes by calling the subscriptions API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url: string | URL | Request) => {
      const target = typeof url === "string" ? url : url.toString();

      if (target.includes("/api/subscriptions")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            subscription: {
              planName: "Business Plan",
              tier: "business",
              billingCycle: "monthly",
              seats: 8,
              seatLimit: 20,
              status: "Active",
              renewsAt: null,
            },
          }),
        } as Response);
      }

      if (target.includes("/api/scan-state")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ scans: [] }),
        } as Response);
      }

      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /increase active seats/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /apply seat change/i }),
    );

    const updateCall = fetchMock.mock.calls.find((call) => {
      const [callUrl, options] = call as [string | URL | Request, RequestInit?];
      const target = typeof callUrl === "string" ? callUrl : callUrl.toString();
      return target.includes("/api/subscriptions") && options?.method === "PUT";
    });

    expect(updateCall).toBeTruthy();
    if (!updateCall) {
      throw new Error("Expected a PUT subscription update call");
    }

    const [, requestOptions] = updateCall as unknown as [
      string | URL | Request,
      RequestInit | undefined,
    ];
    expect(requestOptions).toMatchObject({
      method: "PUT",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("submits Business lead information to the backend", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url: string | URL | Request) => {
      const target = typeof url === "string" ? url : url.toString();

      if (target.includes("/api/subscriptions")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            subscription: {
              planName: "Business Plan",
              tier: "business",
              billingCycle: "monthly",
              seats: 8,
              seatLimit: 20,
              status: "Active",
              renewsAt: null,
            },
          }),
        } as Response);
      }

      if (target.includes("/api/scan-state")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ scans: [] }),
        } as Response);
      }

      if (target.includes("/api/leads")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true }),
        } as Response);
      }

      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await user.type(screen.getByLabelText(/^name$/i), "Jordan Lee");
    await user.type(
      screen.getByLabelText(/^work email$/i),
      "jordan@company.com",
    );
    await user.type(screen.getByLabelText(/^company$/i), "Northwind Labs");
    await user.type(screen.getByLabelText(/^team size$/i), "25");
    await user.type(
      screen.getByLabelText(/^how did you hear about us\?$/i),
      "Referral",
    );
    await user.click(
      screen.getByRole("button", { name: /request a consult/i }),
    );

    const leadSubmitCall = fetchMock.mock.calls.find((call) => {
      const [callUrl, options] = call as unknown as [
        string | URL | Request,
        RequestInit | undefined,
      ];
      const target = typeof callUrl === "string" ? callUrl : callUrl.toString();
      return target.includes("/api/leads") && options?.method === "POST";
    });

    expect(leadSubmitCall).toBeTruthy();
  });

  it("shows live broker findings and a plain-language risk explanation after scanning", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.type(screen.getByLabelText(/^full name$/i), "Ava Chen");
    await user.type(screen.getByLabelText(/^email$/i), "ava@example.com");
    await user.type(screen.getByLabelText(/^phone$/i), "555-0100");
    await user.type(screen.getByLabelText(/^city and state$/i), "Austin, TX");

    await user.click(screen.getByRole("button", { name: /start free scan/i }));

    expect(await screen.findByText(/whitepages/i)).toBeTruthy();
    expect(
      await screen.findByText(/home address next to your full name/i),
    ).toBeTruthy();
    expect(screen.getAllByText(/proof snapshot/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/risk score/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/before\/after comparison/i).length,
    ).toBeGreaterThan(0);
  });
});
