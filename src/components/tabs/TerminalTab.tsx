import type { TerminalEntry } from "../../types";

type TerminalTabProps = {
  repoPath: string | null;
  history: TerminalEntry[];
  input: string;
  running: boolean;
  onInputChange: (value: string) => void;
  onRun: () => void;
  onClear: () => void;
};

export function TerminalTab({
  repoPath,
  history,
  input,
  running,
  onInputChange,
  onRun,
  onClear,
}: TerminalTabProps) {
  return (
    <section className="status-card terminal-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">SHELL</p>
          <h2>Terminal</h2>
        </div>
        <button className="ghost-button small" onClick={onClear} disabled={!history.length}>
          Clear
        </button>
      </div>

      {!repoPath ? (
        <div className="empty-state">Open a repository to run commands in it.</div>
      ) : (
        <>
          <div className="terminal-output">
            {history.length === 0 && (
              <div className="terminal-hint">
                Commands run in <span className="hash">{repoPath}</span>
              </div>
            )}
            {history.map((entry, i) => (
              <div className="terminal-entry" key={i}>
                <div className="terminal-command-line">
                  <span className="terminal-prompt">$</span> {entry.command}
                </div>
                {entry.stdout && <pre className="terminal-stdout">{entry.stdout}</pre>}
                {entry.stderr && <pre className="terminal-stderr">{entry.stderr}</pre>}
                {entry.exitCode !== 0 && (
                  <div className="terminal-exit">exited {entry.exitCode}</div>
                )}
              </div>
            ))}
          </div>

          <div className="terminal-input-row">
            <span className="terminal-prompt">$</span>
            <input
              className="terminal-input"
              type="text"
              value={input}
              placeholder="git status"
              disabled={running}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onRun()}
              autoFocus
            />
          </div>
        </>
      )}
    </section>
  );
}
