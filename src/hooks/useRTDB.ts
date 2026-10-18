/**
 * src/hooks/useRTDB.ts
 *
 * Generic hooks for Firebase Realtime Database.
 *
 * useRTDBValue<T>(path)     → { data, loading, error } (real-time listener)
 * useRTDBList<T>(path)      → { data: T[], loading, error } (child_added approach)
 * useRTDBOnce<T>(path)      → fetch once, no subscription
 */

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, get, off, type DataSnapshot } from 'firebase/database';
import { getFirebaseDB } from '../services/firebase';

interface RTDBState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Subscribe to a RTDB path. Re-subscribes if path changes. */
export function useRTDBValue<T>(path: string | null): RTDBState<T> {
  const [state, setState] = useState<RTDBState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    const db = getFirebaseDB();
    const dbRef = ref(db, path);

    const unsubscribe = onValue(
      dbRef,
      (snap: DataSnapshot) => {
        setState({
          data: snap.exists() ? (snap.val() as T) : null,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({ data: null, loading: false, error: err.message });
      },
    );

    return () => unsubscribe();
  }, [path]);

  return state;
}

/** Fetch a RTDB path once (no subscription). */
export async function fetchOnce<T>(path: string): Promise<T | null> {
  const db = getFirebaseDB();
  const snap = await get(ref(db, path));
  return snap.exists() ? (snap.val() as T) : null;
}

/** Subscribe to a RTDB list (object of children → array). */
export function useRTDBList<T>(path: string | null): {
  data: T[];
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const db = getFirebaseDB();
    const dbRef = ref(db, path);

    const unsubscribe = onValue(
      dbRef,
      (snap: DataSnapshot) => {
        if (!snap.exists()) {
          setData([]);
        } else {
          const val = snap.val();
          // Convert object to array, preserving key as __key if needed
          const arr: T[] = Object.entries(val).map(([k, v]) => ({
            ...(v as object),
            __key: k,
          })) as T[];
          setData(arr);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [path]);

  return { data, loading, error };
}
