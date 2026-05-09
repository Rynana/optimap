import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { makeTestDriver, type TestDriver } from "./test/sqlite-driver";

const reveal = vi.fn(async (_path: string) => {});
const invoke = vi.fn(async (_cmd: string) => "/fake/data/dir");

let testDriver: TestDriver;

vi.mock("@tauri-apps/plugin-opener", () => ({
  revealItemInDir: (path: string) => reveal(path),
}));

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

describe("App", () => {
  beforeEach(() => {
    reveal.mockClear();
    invoke.mockClear();
    testDriver = makeTestDriver();
    vi.resetModules();
    // Reset hash so each test starts at the root path in HashRouter.
    window.history.replaceState(null, "", "/");
  });

  it("shows the welcome screen on first launch (empty database)", async () => {
    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome to optimap/i })).toBeInTheDocument();
    });
  });

  it("applies migrations on first launch and seeds schema_version", async () => {
    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => screen.getByRole("heading", { name: /welcome to optimap/i }));

    const rows = await testDriver.select<Array<{ value: string }>>(
      "SELECT value FROM meta WHERE key = 'schema_version'",
    );
    expect(rows[0]?.value).toBe("2"); // 2 migrations after T-004
  });

  it("skips the welcome screen on subsequent launches (flag already set)", async () => {
    // Pre-run migrations and set the first_launch_completed flag directly on testDriver.
    const { runMigrations } = await import("./db/migrate");
    await runMigrations(testDriver);
    await testDriver.execute(
      "INSERT INTO meta (key, value, updated_at) VALUES ('first_launch_completed', '1', ?)",
      [new Date().toISOString()],
    );

    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: /welcome to optimap/i })).toBeNull();
  });

  it("Start empty: sets first_launch_completed flag and navigates to Sites", async () => {
    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => screen.getByTestId("start-empty-btn"));
    fireEvent.click(screen.getByTestId("start-empty-btn"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^sites$/i })).toBeInTheDocument();
    });

    const rows = await testDriver.select<Array<{ value: string }>>(
      "SELECT value FROM meta WHERE key = 'first_launch_completed'",
    );
    expect(rows[0]?.value).toBe("1");
  });

  it("Start with sample: loads sample data and navigates to Sites", async () => {
    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => screen.getByTestId("start-sample-btn"));
    expect(screen.getByTestId("start-sample-btn")).not.toBeDisabled();

    fireEvent.click(screen.getByTestId("start-sample-btn"));

    await waitFor(
      () => {
        expect(screen.getByRole("heading", { name: /^sites$/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const rows = await testDriver.select<Array<{ value: string }>>(
      "SELECT value FROM meta WHERE key = 'first_launch_completed'",
    );
    expect(rows[0]?.value).toBe("1");
  });

  it("Import from CSV shows a coming-soon stub", async () => {
    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => screen.getByTestId("import-csv-btn"));
    fireEvent.click(screen.getByTestId("import-csv-btn"));

    expect(screen.getByRole("status")).toHaveTextContent(/csv import coming/i);
  });

  it("all placeholder routes render with a heading", async () => {
    const { runMigrations } = await import("./db/migrate");
    await runMigrations(testDriver);
    await testDriver.execute(
      "INSERT INTO meta (key, value, updated_at) VALUES ('first_launch_completed', '1', ?)",
      [new Date().toISOString()],
    );

    const { default: App } = await import("./App");
    const { unmount } = render(<App />);

    await waitFor(() => screen.getByRole("heading", { name: /^dashboard$/i }));

    fireEvent.click(screen.getByRole("link", { name: /^sites$/i }));
    await waitFor(() => screen.getByRole("heading", { name: /^sites$/i }));

    fireEvent.click(screen.getByRole("link", { name: /^map$/i }));
    await waitFor(() => screen.getByRole("heading", { name: /^map$/i }));

    fireEvent.click(screen.getByRole("link", { name: /^licences$/i }));
    await waitFor(() => screen.getByRole("heading", { name: /^licences$/i }));

    fireEvent.click(screen.getByRole("link", { name: /^settings$/i }));
    await waitFor(() => screen.getByRole("heading", { name: /^settings$/i }));

    unmount();
  });

  it("Settings: reveals the data folder", async () => {
    const { runMigrations } = await import("./db/migrate");
    await runMigrations(testDriver);
    await testDriver.execute(
      "INSERT INTO meta (key, value, updated_at) VALUES ('first_launch_completed', '1', ?)",
      [new Date().toISOString()],
    );

    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => screen.getByRole("heading", { name: /^dashboard$/i }));

    fireEvent.click(screen.getByRole("link", { name: /^settings$/i }));
    await waitFor(() => screen.getByTestId("reveal-data-folder-btn"));

    fireEvent.click(screen.getByTestId("reveal-data-folder-btn"));

    await waitFor(() => {
      expect(reveal).toHaveBeenCalledWith("/fake/data/dir/optimap.db");
    });
  });

  it("Settings: reset first-launch clears the flag and shows the welcome screen", async () => {
    const { runMigrations } = await import("./db/migrate");
    await runMigrations(testDriver);
    await testDriver.execute(
      "INSERT INTO meta (key, value, updated_at) VALUES ('first_launch_completed', '1', ?)",
      [new Date().toISOString()],
    );

    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => screen.getByRole("heading", { name: /^dashboard$/i }));

    fireEvent.click(screen.getByRole("link", { name: /^settings$/i }));
    await waitFor(() => screen.getByTestId("reset-first-launch-btn"));

    fireEvent.click(screen.getByTestId("reset-first-launch-btn"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome to optimap/i })).toBeInTheDocument();
    });

    const rows = await testDriver.select<Array<{ value: string }>>(
      "SELECT value FROM meta WHERE key = 'first_launch_completed'",
    );
    expect(rows).toHaveLength(0);
  });
});
