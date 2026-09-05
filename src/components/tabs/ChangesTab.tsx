import { useEffect, useState } from "react";
import type { GitStatus, DiffLine, FileStatus } from "../../types";

type SyncStatus = {
  ahead: number;
  behind: number;
};

type ChangesTabProps = {
  repoPath: string | null;
  gitStatus: GitStatus | null;
  loading: boolean;
  selectedFile: string | null;
  diff: DiffLine[];
  diffLoading: boolean;
  commitMessage: string;
  syncStatus: SyncStatus | null;
  fetching: boolean;
  onCommitMessageChange: (value: string) => void;
  onCommitAll: () => void;
  onFetch: () => Promise<void>;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
  onSelectFile: (path: string) => void;
};

function getStatusSymbol(status: FileStatus["status"]) {
  switch (status) {
    case "modified":
      return "M";
    case "added":
      return "A";
    case "deleted":
      return "D";
    case "untracked":
      return "?";
    case "renamed":
      return "R";
  }
}

export function ChangesTab({
  repoPath,
  gitStatus,
  loading,
  selectedFile,
  diff,
  diffLoading,
  commitMessage,
  syncStatus,
  fetching,
  onCommitMessageChange,
  onCommitAll,
  onFetch,
  onPull,
  onPush,
  onRefresh,
  onSelectFile,
}: ChangesTabProps) {
  // Whether we've fetched *this session* — controls when the Fetch button
  // arms into a Pull button. Resets whenever the repo changes.
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    setHasFetched(false);
  }, [repoPath]);

  const isPullReady = hasFetched && !!syncStatus && syncStatus.behind > 0;

  async function handleFetchOrPull() {
    if (isPullReady) {
      onPull();
      return;
    }
    await onFetch();
    setHasFetched(true);
  }

  return (
    <>
      <section className="actions commit-actions">
        <input
          className="text-input commit-message-input"
          type="text"
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => onCommitMessageChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && commitMessage.trim() && gitStatus?.files.length) {
              onCommitAll();
            }
          }}
        />
        <button
          className="primary-button"
          onClick={onCommitAll}
          disabled={loading || !gitStatus?.files.length || !commitMessage.trim()}
        >
          ✓ Commit All
        </button>
        <button
          className="secondary-button"
          onClick={handleFetchOrPull}
          disabled={loading || fetching}
        >
          {fetching
            ? "↓ Fetching…"
            : isPullReady
            ? `↓ Pull (${syncStatus!.behind})`
            : "⤓ Fetch"}
        </button>
        <button className="secondary-button" onClick={onPush} disabled={loading}>
          ↑ Push {syncStatus && syncStatus.ahead > 0 ? <span className="change-count-number">{syncStatus.ahead} </span>: ""}
        </button>
        <button className="ghost-button" onClick={onRefresh} disabled={loading || !repoPath}>
          ↻ Refresh
        </button>
      </section>

      <div className="changes-split">
        <section className="status-card file-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">WORKING TREE</p>
              <h2>Changes</h2>
            </div>
            <span className="file-count">{gitStatus?.files.length ?? 0} files</span>
          </div>

          {!gitStatus ? (
            <div className="empty-state">
              {repoPath ? "Loading repository status..." : "Open a repository to begin."}
            </div>
          ) : gitStatus.files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h3>Working tree clean</h3>
              <p>There are no changes to commit.</p>
            </div>
          ) : (
            <div className="file-list">
              {gitStatus.files.map((file) => (
                <button
                  className={`file ${selectedFile === file.path ? "selected" : ""}`}
                  key={file.path}
                  onClick={() => onSelectFile(file.path)}
                >
                  <div className={`status-indicator ${file.status}`}>
                    {getStatusSymbol(file.status)}
                  </div>
                  <span className="file-path">{file.path}</span>
                  <span className={`status-label ${file.status}`}>{file.status}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="status-card diff-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">DIFF</p>
              <h2>{selectedFile ? selectedFile.split("/").pop() : "No file selected"}</h2>
            </div>
          </div>

          {!selectedFile ? (
            <div className="empty-state">
              <p>Select a file on the left to view its diff.</p>
            </div>
          ) : diffLoading ? (
            <div className="empty-state">Loading diff...</div>
          ) : diff.length === 0 ? (
            <div className="empty-state">
              <p>No line-level changes to show for this file.</p>
            </div>
          ) : (
            <div className="diff-view">
              {diff.map((line, i) => (
                <div className={`diff-line ${line.kind}`} key={i}>
                  <span className="diff-lineno old">{line.oldLine ?? ""}</span>
                  <span className="diff-lineno new">{line.newLine ?? ""}</span>
                  <span className="diff-marker">
                    {line.kind === "add" ? "+" : line.kind === "remove" ? "−" : ""}
                  </span>
                  <span className="diff-content">{line.content}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}