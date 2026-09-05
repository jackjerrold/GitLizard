import { useState } from "react";
import type { ConflictFile } from "../types";

type MergeModalProps = {
  currentBranch: string;
  targetBranch: string;
  status: "readyToFinish" | "conflicted";
  conflicts: ConflictFile[];
  resolvedPaths: Set<string>;
  allResolved: boolean;
  onResolve: (path: string, content: string) => void;
  onFinish: (message: string) => void;
  onAbort: () => void;
};

export function MergeModal({
  currentBranch, targetBranch, status, conflicts, resolvedPaths, allResolved,
  onResolve, onFinish, onAbort,
}: MergeModalProps) {
  const [activePath, setActivePath] = useState<string | null>(conflicts[0]?.path ?? null);
  const active = conflicts.find((c) => c.path === activePath);
  const [draft, setDraft] = useState(active?.ours ?? "");
  const [pickedSide, setPickedSide] = useState<"mine" | "theirs" | "mixed" | null>(
    active ? "mine" : null
  );

  function selectFile(c: ConflictFile) {
    setActivePath(c.path);
    setDraft(c.ours);
    setPickedSide("mine");
  }

  function pick(side: "mine" | "theirs", content: string) {
    setDraft(content);
    setPickedSide(side);
  }

  const progress = conflicts.length > 0 ? resolvedPaths.size / conflicts.length : 0;

  return (
    <div className="modal-backdrop">
      <div className="modal-card merge-modal">
        <div className="card-header">
          <div>
            <p className="eyebrow">MERGE</p>
            <h2>Merging into {currentBranch}</h2>
          </div>
          <span className="file-count">from {targetBranch}</span>
        </div>

        {status === "readyToFinish" && (
          <div className="merge-safe-banner">
            <strong>No conflicts.</strong> The merge is staged in your working directory but
            <strong> not committed yet</strong> — build and test your app now, then finish or discard.
          </div>
        )}

        {status === "conflicted" && (
          <>
            <div className="merge-progress-row">
              <div className="merge-progress-track">
                <div className="merge-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="merge-progress-label">
                {resolvedPaths.size}/{conflicts.length} resolved
              </span>
            </div>

            <div className="conflict-layout">
              <div className="conflict-file-list">
                {conflicts.map((c) => (
                  <button
                    key={c.path}
                    className="conflict-file-item"
                    data-active={c.path === activePath}
                    data-resolved={resolvedPaths.has(c.path)}
                    onClick={() => selectFile(c)}
                  >
                    <span className="conflict-status-icon">
                      {resolvedPaths.has(c.path) ? "✓" : "•"}
                    </span>
                    <span className="conflict-file-path">{c.path}</span>
                  </button>
                ))}
              </div>

              {active && (
                <div className="conflict-editor">
                  <div className="conflict-compare">
                    <div className="conflict-pane" data-side="mine">
                      <div className="conflict-pane-header" data-side="mine">
                        <span className="conflict-side-dot" data-side="mine" />
                        <span className="conflict-side-label">{currentBranch}</span>
                        <span className="conflict-side-tag">yours</span>
                      </div>
                      <pre className="conflict-pane-content">{active.ours}</pre>
                      <button
                        className="secondary-button full small"
                        data-side="mine"
                        onClick={() => pick("mine", active.ours)}
                      >
                        Use {currentBranch}
                      </button>
                    </div>

                    <div className="conflict-pane" data-side="theirs">
                      <div className="conflict-pane-header" data-side="theirs">
                        <span className="conflict-side-dot" data-side="theirs" />
                        <span className="conflict-side-label">{targetBranch}</span>
                        <span className="conflict-side-tag">incoming</span>
                      </div>
                      <pre className="conflict-pane-content">{active.theirs}</pre>
                      <button
                        className="secondary-button full small"
                        data-side="theirs"
                        onClick={() => pick("theirs", active.theirs)}
                      >
                        Use {targetBranch}
                      </button>
                    </div>
                  </div>

                  <div className="conflict-result">
                    <div className="conflict-result-header">
                      <span>Result</span>
                      {pickedSide && (
                        <span className="conflict-result-source" data-side={pickedSide}>
                          {pickedSide === "mine" && `from ${currentBranch}`}
                          {pickedSide === "theirs" && `from ${targetBranch}`}
                          {pickedSide === "mixed" && "edited manually"}
                        </span>
                      )}
                    </div>
                    <textarea
                      className="conflict-textarea"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setPickedSide("mixed");
                      }}
                    />
                    <button
                      className="secondary-button full"
                      onClick={() => onResolve(active.path, draft)}
                    >
                      Mark resolved
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="ghost-button" onClick={onAbort}>
            Discard merge
          </button>
          <button
            className="secondary-button"
            disabled={status === "conflicted" && !allResolved}
            onClick={() => onFinish(`Merge ${targetBranch} into ${currentBranch}`)}
          >
            Finish merge
          </button>
        </div>
      </div>
    </div>
  );
}