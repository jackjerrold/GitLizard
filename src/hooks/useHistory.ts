import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Commit, CommitFile } from "../types";
import type { StatusMessageApi } from "./useStatusMessage";

export function useHistory(status: StatusMessageApi) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [commitFiles, setCommitFiles] = useState<CommitFile[]>([]);

  async function fetchHistory() {
    await status.run("Loading history...", () => invoke<Commit[]>("get_history"), setCommits);
  }

  async function selectCommit(commit: Commit | null) {
    // Clicking the already-selected commit again closes the panel.
    if (commit && selectedCommit?.id === commit.id) {
      setSelectedCommit(null);
      setCommitFiles([]);
      return;
    }

    setSelectedCommit(commit);

    if (!commit) {
      setCommitFiles([]);
      return;
    }

    await status.run(
      "Loading commit...",
      () => invoke<CommitFile[]>("get_commit_files", { id: commit.id }),
      setCommitFiles
    );
  }

  return { commits, fetchHistory, selectedCommit, commitFiles, selectCommit };
}