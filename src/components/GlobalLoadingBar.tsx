import { useEffect, useRef, useState } from "react";
import { subscribe } from "../api/loadingStore";

const SHOW_DELAY_MS = 300;

export function GlobalLoadingBar() {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribe((count) => {
      if (count > 0) {
        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
        }
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setVisible(false);
      }
    });
  }, []);

  if (!visible) return null;

  return (
    <div className="global-loading-bar" role="status" aria-label="Loading">
      <div className="global-loading-bar-fill" />
    </div>
  );
}
