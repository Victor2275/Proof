import { useEffect, useState } from 'react';
import { getActiveBake, subscribeActiveBake, type ActiveBake } from './activeBake';

/** Reactive read of the currently running bake, live across tabs and screens. */
export function useActiveBake(): ActiveBake | null {
  const [bake, setBake] = useState<ActiveBake | null>(() => getActiveBake());

  useEffect(() => {
    const refresh = () => setBake(getActiveBake());
    refresh();
    return subscribeActiveBake(refresh);
  }, []);

  return bake;
}
