import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { makeTestDriver, type TestDriver } from "../test/sqlite-driver";

// ---------------------------------------------------------------------------
// Module mocks (same pattern as App.test.tsx)
// ---------------------------------------------------------------------------

const invoke = vi.fn(async (_cmd: string) => "/fake/data/dir");

let testDriver: TestDriver;

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string) => invoke(cmd),
}));

vi.mock("@tauri-apps/api/path", () => ({
  join: async (...parts: string[]) => parts.join("/"),
}));

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: async () => ({
      execute: async (sql: string, params?: unknown[]) => testDriver.execute(sql, params),
      select: async <T,>(sql: string, params?: unknown[]) => testDriver.select<T>(sql, params),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderApp() {
  const { default: App } = await import("../App");
  return render(<App />);
}

async function setupWithFirstLaunchDone() {
  const { runMigrations } = await import("../db/migrate");
  await runMigrations(testDriver);
  await testDriver.execute(
    "INSERT INTO meta (key, value, updated_at) VALUES ('first_launch_completed', '1', ?)",
    [new Date().toISOString()],
  );
}

async function insertSite(
  name: string,
  type = "tower",
  status = "active",
  address: string | null = null,
) {
  const id = `site-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await testDriver.execute(
    `INSERT INTO sites (id, name, type, status, latitude, longitude, address, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, type, status, -33.8688, 151.2093, address, now, now],
  );
  return id;
}

async function waitForAppReady() {
  await waitFor(() => screen.getByRole("heading", { name: /^dashboard$/i }));
}

async function goToSites() {
  await waitForAppReady();
  fireEvent.click(screen.getByRole("link", { name: /^sites$/i }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sites page", () => {
  beforeEach(() => {
    invoke.mockClear();
    testDriver = makeTestDriver();
    vi.resetModules();
    window.history.replaceState(null, "", "/");
  });

  it("renders the Sites heading", async () => {
    await setupWithFirstLaunchDone();
    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByRole("heading", { name: /^sites$/i }));

    unmount();
  });

  it("shows the empty state with action buttons when no sites exist", async () => {
    await setupWithFirstLaunchDone();
    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByTestId("empty-start-sample-btn"));

    expect(screen.getByTestId("empty-start-sample-btn")).toBeInTheDocument();
    expect(screen.getByTestId("empty-import-csv-btn")).toBeInTheDocument();
    expect(screen.getByTestId("empty-add-site-btn")).toBeInTheDocument();

    unmount();
  });

  it("loads sample data from the empty state and shows the sites table", async () => {
    await setupWithFirstLaunchDone();
    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByTestId("empty-start-sample-btn"));

    fireEvent.click(screen.getByTestId("empty-start-sample-btn"));

    // Sample data has 10 sites — table should appear with header + 10 body rows.
    await waitFor(
      () => {
        const rows = screen.queryAllByRole("row");
        expect(rows.length).toBeGreaterThan(1);
      },
      { timeout: 5000 },
    );

    unmount();
  });

  it("renders site rows when sites exist", async () => {
    await setupWithFirstLaunchDone();
    await insertSite("Alpha Tower", "tower", "active", "1 George St Sydney");
    await insertSite("Beta Rooftop", "rooftop", "maintenance");

    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByText("Alpha Tower"));

    expect(screen.getByText("Alpha Tower")).toBeInTheDocument();
    expect(screen.getByText("Beta Rooftop")).toBeInTheDocument();

    unmount();
  });

  it("shows status badges with correct labels", async () => {
    await setupWithFirstLaunchDone();
    await insertSite("Tower A", "tower", "active");
    await insertSite("Tower B", "tower", "fault");
    await insertSite("Tower C", "tower", "planned");

    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByText("Active"));

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Fault")).toBeInTheDocument();
    expect(screen.getByText("Planned")).toBeInTheDocument();

    unmount();
  });

  it("status filter updates URL and narrows results", async () => {
    await setupWithFirstLaunchDone();
    await insertSite("Active Tower", "tower", "active");
    await insertSite("Fault Tower", "tower", "fault");

    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByText("Active Tower"));

    fireEvent.change(screen.getByTestId("status-filter"), { target: { value: "fault" } });

    await waitFor(() => {
      expect(screen.queryByText("Active Tower")).not.toBeInTheDocument();
      expect(screen.getByText("Fault Tower")).toBeInTheDocument();
    });

    expect(window.location.hash).toContain("status=fault");

    unmount();
  });

  it("type filter updates URL and narrows results", async () => {
    await setupWithFirstLaunchDone();
    await insertSite("Tower Site", "tower", "active");
    await insertSite("Rooftop Site", "rooftop", "active");

    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByText("Tower Site"));

    fireEvent.change(screen.getByTestId("type-filter"), { target: { value: "rooftop" } });

    await waitFor(() => {
      expect(screen.queryByText("Tower Site")).not.toBeInTheDocument();
      expect(screen.getByText("Rooftop Site")).toBeInTheDocument();
    });

    expect(window.location.hash).toContain("type=rooftop");

    unmount();
  });

  it("shows no-results state when filters return nothing", async () => {
    await setupWithFirstLaunchDone();
    await insertSite("Active Tower", "tower", "active");

    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByText("Active Tower"));

    fireEvent.change(screen.getByTestId("status-filter"), { target: { value: "fault" } });

    await waitFor(() => {
      expect(screen.getByText(/no sites match/i)).toBeInTheDocument();
    });

    unmount();
  });

  it("clicking a row navigates to site detail", async () => {
    await setupWithFirstLaunchDone();
    const siteId = await insertSite("Nav Tower");

    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByText("Nav Tower"));

    fireEvent.click(screen.getByTestId(`site-row-${siteId}`));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /site detail/i })).toBeInTheDocument();
    });

    unmount();
  });

  it("Enter key on a row navigates to site detail", async () => {
    await setupWithFirstLaunchDone();
    const siteId = await insertSite("Keyboard Tower");

    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByText("Keyboard Tower"));

    const row = screen.getByTestId(`site-row-${siteId}`);
    fireEvent.keyDown(row, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /site detail/i })).toBeInTheDocument();
    });

    unmount();
  });

  it("New site button navigates to /sites/new", async () => {
    await setupWithFirstLaunchDone();
    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByTestId("new-site-btn"));

    fireEvent.click(screen.getByTestId("new-site-btn"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /new site/i })).toBeInTheDocument();
    });

    unmount();
  });

  it("search input has debounce: URL updates after 300ms pause", async () => {
    await setupWithFirstLaunchDone();
    await insertSite("Alpha Site");
    await insertSite("Beta Site");

    const { unmount } = await renderApp();

    await goToSites();
    await waitFor(() => screen.getByText("Alpha Site"));

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "alpha" } });

    // After the debounce fires, only Alpha Site should show.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    await waitFor(() => {
      expect(screen.queryByText("Beta Site")).not.toBeInTheDocument();
      expect(screen.getByText("Alpha Site")).toBeInTheDocument();
    });

    expect(window.location.hash).toContain("q=alpha");

    unmount();
  });

  it("renders 1,000 sites in under 1 second", async () => {
    await setupWithFirstLaunchDone();

    // Insert 1,000 sites directly via SQL — better-sqlite3 is sync so this is fast.
    const now = new Date().toISOString();
    for (let i = 0; i < 1000; i++) {
      const id = `perf-${i.toString().padStart(4, "0")}`;
      await testDriver.execute(
        `INSERT INTO sites (id, name, type, status, latitude, longitude, address, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, `Site ${id}`, "tower", "active", -33.8 + i * 0.001, 151.2, null, now, now],
      );
    }

    const { unmount } = await renderApp();

    // Navigate to the dashboard first, then start timing from the navigation click.
    await waitForAppReady();

    const start = performance.now();
    fireEvent.click(screen.getByRole("link", { name: /^sites$/i }));

    // Wait until all 1,000 rows are visible (1,001 total rows including the header).
    await waitFor(
      () => {
        const rows = screen.queryAllByRole("row");
        expect(rows.length).toBeGreaterThan(1000);
      },
      { timeout: 3000 },
    );

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);

    unmount();
  }, 15_000); // generous test timeout to allow for DB seed; the 1s assertion is what matters
});
