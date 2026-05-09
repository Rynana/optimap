import { createContext, useContext } from "react";

type AppContextValue = {
  firstLaunch: boolean;
  markFirstLaunchDone: () => void;
  resetFirstLaunch: () => void;
};

export const AppContext = createContext<AppContextValue>({
  firstLaunch: false,
  markFirstLaunchDone: () => {},
  resetFirstLaunch: () => {},
});

export function useAppContext(): AppContextValue {
  return useContext(AppContext);
}
