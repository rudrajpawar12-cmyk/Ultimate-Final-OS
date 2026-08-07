/**
 * Hybrid Notification Repository
 *
 * The notification center is Supabase-backed whenever the backend is
 * configured. The local (fixture) implementation is only used so the app still
 * boots in a bare development environment without backend credentials.
 */

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  localNotificationRepository,
  type NotificationRepository,
} from "@/repositories/notification.repository";
import { SupabaseNotificationRepository } from "@/repositories/supabase/supabase-notification.repository";

function createHybridNotificationRepository(): NotificationRepository {
  if (!isSupabaseConfigured) return localNotificationRepository;
  return new SupabaseNotificationRepository(getSupabaseClient());
}

export const hybridNotificationRepository = createHybridNotificationRepository();
