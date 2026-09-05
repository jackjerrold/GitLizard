import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Branch, ConflictFile, MergeResult } from "../types";
import type { StatusMessageApi } from "./useStatusMessage";

export function useBranches(status: StatusMessageApi, refreshStatus: () => Promise<void>) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newBranchName, setNewBranchName] = useState("");

  // merge state
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [mergeStatus, setMergeStatus] = useState<MergeResult["status"] | null>(null);
  const [conflicts, setConflicts] = useState<ConflictFile[]>([]);
  const [resolvedPaths, setResolvedPaths] = useState<Set<string>>(new Set());

  async function fetchBranches() {
    await status.run("Loading branches...", () => invoke<Branch[]>("get_branches"), setBranches);
  }

  async function checkoutBranch(name: string) {
    const ok = await status.run(`Switching to ${name}...`, () => invoke("checkout_branch", { name }));
    if (ok !== undefined) {
      await fetchBranches();
      await refreshStatus();
    }
  }

  async function createBranch() {
    if (!newBranchName.trim()) return;
    const name = newBranchName;
    const ok = await status.run(`Creating ${name}...`, () => invoke("create_branch", { name }));
    if (ok !== undefined) {
      setNewBranchName("");
      await fetchBranches();
      await refreshStatus();
    }
  }

  async function startMerge(branchName: string) {

    setMergeTarget(branchName);
    setResolvedPaths(new Set());
    const result = await status.run(`Merging ${branchName}...`, () =>
      invoke<MergeResult>("start_merge", { branchName })
    );
    if (!result) return;

    if (result.status === "dirty") {
      status.setMessage("Commit or discard your changes before merging.")
        ?? console.warn("dirty working tree");
      setMergeTarget(null);
      setMergeStatus(null);
      return;
    }

    setMergeStatus(result.status);
    if (result.status === "conflicted") setConflicts(result.conflicts);
    if (result.status === "fastForwarded" || result.status === "upToDate") {
      // nothing to test/finish — already done or nothing to do
      await fetchBranches();
      await refreshStatus();
      setMergeTarget(null);
      setMergeStatus(null);
    }
  }

  async function resolveConflict(path: string, content: string) {
    const ok = await status.run(`Resolving ${path}...`, () =>
      invoke("resolve_conflict", { path, content })
    );
    if (ok !== undefined) {
      setResolvedPaths((prev) => new Set(prev).add(path));
    }
  }

  async function finishMerge(message: string) {
    const ok = await status.run("Finishing merge...", () => invoke("finish_merge", { message }));
    if (ok !== undefined) {
      setMergeTarget(null);
      setMergeStatus(null);
      setConflicts([]);
      await fetchBranches();
      await refreshStatus();
    }
  }

  async function abortMerge() {
    const ok = await status.run("Discarding merge...", () => invoke("abort_merge"));
    if (ok !== undefined) {
      setMergeTarget(null);
      setMergeStatus(null);
      setConflicts([]);
      await refreshStatus();
    }
  }

  const allResolved = conflicts.length > 0 && conflicts.every((c) => resolvedPaths.has(c.path));

  return {
    branches, newBranchName, setNewBranchName,
    fetchBranches, checkoutBranch, createBranch,
    mergeTarget, mergeStatus, conflicts, resolvedPaths, allResolved,
    startMerge, resolveConflict, finishMerge, abortMerge,
  };
}