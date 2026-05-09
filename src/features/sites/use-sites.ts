import { useQuery } from "@tanstack/react-query";
import { db } from "../../db/client";
import { listSites, type ListSitesOpts } from "./queries";

export function useSites(opts: ListSitesOpts = {}) {
  return useQuery({
    queryKey: ["sites", opts],
    queryFn: () => listSites(db, opts),
    staleTime: 30_000,
  });
}
