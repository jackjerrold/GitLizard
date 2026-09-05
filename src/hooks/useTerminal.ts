import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TerminalEntry } from "../types";

export function useTerminal() {
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);

  async function runCommand() {
    const command = input.trim();
    if (!command || running) return;

    setInput("");
    setRunning(true);
    try {
      const result = await invoke<{ stdout: string; stderr: string; exitCode: number }>(
        "run_terminal_command",
        { command }
      );
      setHistory((h) => [...h, { command, ...result }]);
    } catch (error) {
      setHistory((h) => [
        ...h,
        { command, stdout: "", stderr: String(error), exitCode: -1 },
      ]);
    } finally {
      setRunning(false);
    }
  }

  function clear() {
    setHistory([]);
  }

  return { history, input, setInput, running, runCommand, clear };
}
