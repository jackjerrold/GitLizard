export type FileStatus = {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked" | "renamed";
};

export type GitStatus = {
  branch: string;
  files: FileStatus[];
};

export type SyncStatus = {
  ahead: number;
  behind: number;
};

export type Commit = {
  /** Full 40-char oid — stable identity used to link commits/parents in the graph. */
  id: string;
  /** Short 7-char oid for display. */
  hash: string;
  author: string;
  date: string;
  message: string;
  /** Full oids of this commit's parents (2+ for a merge commit). */
  parentIds: string[];
  /** Branch/tag names currently pointing at this commit, if any. */
  refs: string[];
};

export type CommitFile = {
  path: string;
  status: "added" | "deleted" | "modified" | "renamed";
};

// types.ts additions
export type Branch = {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  ahead: number;
  behind: number;
};

export type ConflictFile = {
  path: string;
  ours: string;
  theirs: string;
  base: string;
};

export type MergeResult =
  | { status: "upToDate" }
  | { status: "fastForwarded" }
  | { status: "readyToFinish" }
  | { status: "conflicted"; conflicts: ConflictFile[] }
  | { status: "dirty" };

export type DiffLine = {
  kind: "add" | "remove" | "context" | "header";
  oldLine?: number;
  newLine?: number;
  content: string;
};

export type GitLizardFile = {
  name: string;
};

export type Profile = {
  name: string;
  email: string;
};

export type Tab = "changes" | "history" | "branches" | "notes" | "terminal";

export type TerminalEntry = {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
};