import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { getDbPath, getSqlDriver } from "../db/client";
import { deleteMetaFlag } from "../db/meta-flags";
import { useAppContext } from "../context/app-context";

export default function Settings() {
  const navigate = useNavigate();
  const { resetFirstLaunch } = useAppContext();
  const [revealError, setRevealError] = useState<string | null>(null);

  async function handleReveal() {
    setRevealError(null);
    try {
      const path = await getDbPath();
      await revealItemInDir(path);
    } catch (e) {
      setRevealError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleResetFirstLaunch() {
    const driver = await getSqlDriver();
    await deleteMetaFlag(driver, "first_launch_completed");
    resetFirstLaunch();
    navigate("/welcome");
  }

  return (
    <div className="max-w-lg p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Data folder</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your data is stored on your local machine. Click below to open the folder in Explorer /
          Finder.
        </p>
        <button
          type="button"
          onClick={handleReveal}
          data-testid="reveal-data-folder-btn"
          className="mt-3 rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          Reveal data folder
        </button>
        {revealError && <p className="mt-2 text-sm text-red-600">Error: {revealError}</p>}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Developer tools
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Reset the first-launch experience to see the welcome screen again on the next navigation
          to&nbsp;home.
        </p>
        <button
          type="button"
          onClick={handleResetFirstLaunch}
          data-testid="reset-first-launch-btn"
          className="mt-3 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          Reset first-launch experience
        </button>
      </section>
    </div>
  );
}
