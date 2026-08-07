/**
 * React binding for the notification sound preference.
 *
 * The preference itself lives in `@/lib/notification-sound` (single source of
 * truth, persisted per user). This hook only mirrors it into React state so a
 * settings toggle and the realtime chime always agree — flipping the switch
 * affects the very next notification, with no reload.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useAuth } from "@/hooks/use-auth";
import {
  configureNotificationSound,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  subscribeToNotificationSound,
} from "@/lib/notification-sound";

export function useNotificationSound() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  /* Make sure the preference is bound to this account before it is read. */
  useEffect(() => {
    configureNotificationSound(userId);
  }, [userId]);

  const enabled = useSyncExternalStore(
    subscribeToNotificationSound,
    isNotificationSoundEnabled,
    () => true,
  );

  const setEnabled = useCallback((next: boolean) => {
    setNotificationSoundEnabled(next);
  }, []);

  return { enabled, setEnabled };
}
