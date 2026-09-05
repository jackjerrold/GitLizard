import { useMemo } from "react";
import type { Commit, CommitFile } from "../../types";
import { layoutGraph, COLUMN_WIDTH, ROW_HEIGHT } from "../../hooks/graphLayout";

type HistoryTabProps = {
  repoPath: string | null;
  commits: Commit[];
  selectedCommit: Commit | null;
  commitFiles: CommitFile[];
  onSelectCommit: (commit: Commit | null) => void;
};

export function HistoryTab({
  repoPath,
  commits,
  selectedCommit,
  commitFiles,
  onSelectCommit,
}: HistoryTabProps) {
  // Recomputing the layout is cheap relative to a re-render, but there's no
  // reason to redo it unless the commit list itself changes.
  const { nodes, edges, laneCount } = useMemo(() => layoutGraph(commits), [commits]);

  const graphWidth = laneCount * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  const graphHeight = nodes.length * ROW_HEIGHT;

  return (
    <section className="status-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">COMMIT LOG</p>
          <h2>History</h2>
        </div>
        <span className="file-count">{commits.length} commits</span>
      </div>

      {!repoPath ? (
        <div className="empty-state">Open a repository to see its history.</div>
      ) : commits.length === 0 ? (
        <div className="empty-state">
          <h3>No commits yet</h3>
        </div>
      ) : (
        <div className="history-body">
          <div className="commit-graph-wrap">
            <svg
              className="commit-graph-svg"
              width={graphWidth}
              height={graphHeight}
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            >
              {edges.map((edge, i) => (
                <path
                  key={i}
                  d={edge.path}
                  stroke={edge.color}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
              {nodes.map((n) => {
                const isSelected = n.commit.id === selectedCommit?.id;
                return (
                  <circle
                    key={n.commit.id}
                    cx={n.column * COLUMN_WIDTH + COLUMN_WIDTH / 2}
                    cy={n.row * ROW_HEIGHT + ROW_HEIGHT / 2}
                    r={isSelected ? 6 : 5}
                    fill={isSelected ? "var(--paper)" : n.color}
                    stroke={n.color}
                    strokeWidth={isSelected ? 3 : 0}
                  />
                );
              })}
            </svg>

            <ul className="commit-list" style={{ marginLeft: graphWidth }}>
              {nodes.map((n) => {
                const c = n.commit;
                const isSelected = c.id === selectedCommit?.id;
                return (
                  <li
                    key={c.id}
                    className={"commit-row" + (isSelected ? " commit-row-selected" : "")}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onSelectCommit(c)}
                  >
                    <div className="commit-body">
                      <div className="commit-message">
                        {c.refs.map((r) => (
                          <span key={r} className="ref-badge" style={{ borderColor: n.color }}>
                            {r}
                          </span>
                        ))}
                        {c.message}
                      </div>
                      <div className="commit-meta">
                        <span className="hash">{c.hash}</span>
                        <span>{c.author}</span>
                        <span>{c.date}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedCommit && (
            <aside className="commit-detail-panel">
              <div className="commit-detail-header">
                <h3>Commit</h3>
                <button
                  type="button"
                  className="commit-detail-close"
                  onClick={() => onSelectCommit(null)}
                  aria-label="Close commit detail"
                >
                  ×
                </button>
              </div>

              <p className="commit-detail-message">{selectedCommit.message}</p>

              <dl className="commit-detail-meta">
                <dt>Hash</dt>
                <dd className="hash">{selectedCommit.id}</dd>

                <dt>Author</dt>
                <dd>{selectedCommit.author}</dd>

                <dt>Date</dt>
                <dd>{selectedCommit.date}</dd>

                {selectedCommit.parentIds.length > 0 && (
                  <>
                    <dt>{selectedCommit.parentIds.length > 1 ? "Parents" : "Parent"}</dt>
                    <dd>{selectedCommit.parentIds.map((p) => p.slice(0, 7)).join(", ")}</dd>
                  </>
                )}

                {selectedCommit.refs.length > 0 && (
                  <>
                    <dt>Refs</dt>
                    <dd>{selectedCommit.refs.join(", ")}</dd>
                  </>
                )}
              </dl>

              <h4>Files changed ({commitFiles.length})</h4>
              {commitFiles.length === 0 ? (
                <div className="empty-state">No file changes.</div>
              ) : (
                <ul className="commit-file-list">
                  {commitFiles.map((f) => (
                    <li key={f.path} className={`commit-file commit-file-${f.status}`}>
                      <span className="commit-file-status">{f.status[0].toUpperCase()}</span>
                      <span className="commit-file-path">{f.path}</span>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}
        </div>
      )}
    </section>
  );
}