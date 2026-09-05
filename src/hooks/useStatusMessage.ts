import { useState, useCallback } from "react";

export function useStatusMessage() {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");

  const run = useCallback(
    async <T,>(label: string, fn: () => Promise<T>, onSuccess?: (result: T) => void) => {
      try {
        setLoading(true);
        setAction(label);
        setMessage("");
        const result = await fn();
        onSuccess?.(result);
        return result;
      } catch (error) {
        setMessage(`${label.replace(/\.\.\.$/, "")} failed: ${error}`);
        return undefined;
      } finally {
        setLoading(false);
        setAction("");
      }
    },
    []
  );

  return { loading, action, message, setMessage, run };
}

export type StatusMessageApi = ReturnType<typeof useStatusMessage>;
