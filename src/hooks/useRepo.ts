import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { GitStatus, DiffLine, SyncStatus } from "../types";
import type { StatusMessageApi } from "./useStatusMessage";

export function useRepo(status: StatusMessageApi) {
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [fetching, setFetching] = useState(false);

  async function chooseRepository() {
    const selected = await open({ directory: true, multiple: false }).catch((error) => {
      status.setMessage(`Error: ${error}`);
      return null;
    });
    if (!selected || Array.isArray(selected)) return;

    await status.run("Opening repository...", () => invoke("set_repo", { path: selected }));
    setRepoPath(selected);
    setSelectedFile(null);
    setDiff([]);
    setSyncStatus(null);
  }

  async function cloneRepository() {
    const url = prompt("Repository URL to clone:");
    if (!url) return;

    const destParent = await open({ directory: true, multiple: false }).catch((error) => {
      status.setMessage(`Error: ${error}`);
      return null;
    });
    if (!destParent || Array.isArray(destParent)) return;

    const repoName = url.split("/").pop()?.replace(/\.git$/, "") || "repository";
    const dest = `${destParent}/${repoName}`;

    const result = await status.run(`Cloning ${repoName}...`, () =>
      invoke<string>("clone_repo", { url, dest })
    );
    if (result !== undefined) {
      setRepoPath(result);
      setSelectedFile(null);
      setDiff([]);
      setSyncStatus(null);
    }
  }

  async function createRepository() {
    const name = prompt("Name for the new repository:");
    if (!name) return;

    const parentDir = await open({ directory: true, multiple: false }).catch((error) => {
      status.setMessage(`Error: ${error}`);
      return null;
    });
    if (!parentDir || Array.isArray(parentDir)) return;

    const path = `${parentDir}/${name}`;

    const result = await status.run(`Creating ${name}...`, () =>
      invoke<string>("init_repo", { path })
    );
    if (result !== undefined) {
      setRepoPath(result);
      setSelectedFile(null);
      setDiff([]);
      setSyncStatus(null);
    }
  }

  async function refreshStatus() {
    await status.run("Checking status...", () => invoke<GitStatus>("status"), setGitStatus);
    // Local-only, so it's cheap to refresh alongside the working-tree status.
    await refreshSyncStatus();
  }

  async function refreshSyncStatus() {
    try {
      const result = await invoke<SyncStatus>("get_sync_status");
      setSyncStatus(result);
    } catch {
      // Non-critical — leave the last known count in place.
    }
  }

  async function commitAll() {
    if (!commitMessage.trim()) return;
    const ok = await status.run("Committing changes...", () =>
      invoke("commit_all", { message: commitMessage })
    );
    if (ok !== undefined) {
      setCommitMessage("");
      setSelectedFile(null);
      setDiff([]);
      await refreshStatus();
    }
  }

  async function fetch() {
    setFetching(true);
    try {
      const result = await status.run("Fetching...", () => invoke<SyncStatus>("fetch"));
      if (result !== undefined) setSyncStatus(result);
    } finally {
      setFetching(false);
    }
  }

  async function push() {
    const result = await status.run("Pushing...", () => invoke<SyncStatus>("push"));
    if (result !== undefined) setSyncStatus(result);
  }

  async function pull() {
    const result = await status.run("Pulling...", () => invoke<SyncStatus>("pull"));
    if (result !== undefined) {
      setSyncStatus(result);
      await refreshStatus();
    }
  }

  async function selectFile(path: string) {
    setSelectedFile(path);
    setDiffLoading(true);
    setDiff([]);
    try {
      const result = await invoke<DiffLine[]>("get_diff", { filePath: path });
      setDiff(result);
    } catch (error) {
      status.setMessage(`Error loading diff: ${error}`);
    } finally {
      setDiffLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const last = await invoke<string | null>("get_last_repo");
        if (last) {
          await invoke("set_repo", { path: last });
          setRepoPath(last);
        }
      } catch {
        // No valid last repo — just start at the welcome screen.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (repoPath) refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath]);

  return {
    repoPath,
    gitStatus,
    selectedFile,
    diff,
    diffLoading,
    commitMessage,
    syncStatus,
    fetching,
    setCommitMessage,
    chooseRepository,
    cloneRepository,
    createRepository,
    refreshStatus,
    commitAll,
    fetch,
    push,
    pull,
    selectFile,
  };
}