"use client";

import { getSocket } from "@/lib/socket";
import React, { useEffect, useRef } from "react";

function GeoUpdater({ userId }: { userId: string | undefined }) {
  const socketRef = useRef<any>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;
    if (!navigator.geolocation) return;

    socketRef.current = getSocket();

    // ✅ Emit identity only once
    socketRef.current.emit("identity", userId);
       
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();

        // 🔥 Throttle: send only every 10 seconds
        if (now - lastSentRef.current < 10000) return;

        lastSentRef.current = now;

        socketRef.current.emit("update-location", {
          userId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => console.log(err),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watcher);
    };
  }, [userId]);

  return null;
}

export default GeoUpdater;