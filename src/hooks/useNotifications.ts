/**
 * src/hooks/useNotifications.ts
 *
 * Real-time RTDB notification hook.
 * Reads notifications/{uid} ordered by createdAt desc.
 * Returns { notifications, unreadCount, markRead, markAllRead }.
 */

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update, serverTimestamp, get } from 'firebase/database';
import { getFirebaseDB } from '../services/firebase';
import { DB_PATHS } from '../constants/app';

export interface Notification {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  jobId?: string;
  createdAt: number;
}

export function useNotifications(uid: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const db = getFirebaseDB();
    const dbRef = ref(db, `${DB_PATHS.notifications}/${uid}`);

    const unsub = onValue(dbRef, (snap) => {
      if (!snap.exists()) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const val = snap.val();
      const list: Notification[] = Object.entries(val)
        .map(([k, v]: [string, any]) => ({ notificationId: k, ...v }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setNotifications(list);
      setLoading(false);
    });

    return () => unsub();
  }, [uid]);

  const markRead = useCallback(async (notificationId: string) => {
    if (!uid) return;
    const db = getFirebaseDB();
    await update(ref(db, `${DB_PATHS.notifications}/${uid}/${notificationId}`), { read: true });
  }, [uid]);

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const db = getFirebaseDB();
    const snap = await get(ref(db, `${DB_PATHS.notifications}/${uid}`));
    if (!snap.exists()) return;
    const updates: Record<string, boolean> = {};
    Object.keys(snap.val()).forEach((k) => {
      updates[`${DB_PATHS.notifications}/${uid}/${k}/read`] = true;
    });
    await update(ref(db), updates);
  }, [uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, loading, unreadCount, markRead, markAllRead };
}
