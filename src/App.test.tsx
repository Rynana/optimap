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
    // Reset the cached singletons in client.ts by reloading the module graph
    vi.resetModules();
  });

  it("runs migrations on mount and surfaces a 'Database ready' status", async () => {
    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("db-status")).toHaveTextContent("Database ready");
    });

    const versionRow = await testDriver.select<Array<{ value: string }>>(
      "SELECT value FROM meta WHERE key = 'schema_version'",
    );
    expect(versionRow[0]?.value).toBe("1");
  });

  it("reveals the data folder when the Settings button is clicked", async () => {
    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("db-status")).toHaveTextContent("Database ready");
    });

    fireEvent.click(screen.getByRole("button", { name: /^Settings$/ }));
    fireEvent.click(screen.getByRole("button", { name: /Reveal data folder/i }));

    await waitFor(() => {
      expect(reveal).toHaveBeenCalledTimes(1);
    });
    expect(reveal).toHaveBeenCalledWith("/fake/data/dir/optimap.db");
  });
});
