import { Search } from "lucide-react";

export default function TopBar() {
  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2">
      <span className="text-base font-semibold text-slate-900">OptiMap</span>
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-xs">
          <Search
            size={16}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search sites…"
            disabled
            aria-label="Search (coming in T-010)"
            className="w-full cursor-not-allowed rounded-md border border-slate-300 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-400"
          />
        </div>
      </div>
    </header>
  );
}
