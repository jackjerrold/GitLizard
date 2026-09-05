import type { Branch } from "../../types";

type BranchesTabProps = {
  repoPath: string | null;
  branches: Branch[];
  loading: boolean;
  newBranchName: string;
  onNewBranchNameChange: (value: string) => void;
  onMergeBranch: (value: string) => void;
  onCreateBranch: () => void;
  onCheckoutBranch: (name: string) => void;
};

export function BranchesTab({
  repoPath,
  branches,
  loading,
  newBranchName,
  onNewBranchNameChange,
  onMergeBranch,
  onCreateBranch,
  onCheckoutBranch,
}: BranchesTabProps) {
  return (
    <section className="status-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">REFS</p>
          <h2>Branches</h2>
        </div>
        <span className="file-count">{branches.length} branches</span>
      </div>

      <div className="branch-create-row">
        <input
          className="text-input"
          type="text"
          placeholder="new-branch-name"
          value={newBranchName}
          onChange={(e) => onNewBranchNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCreateBranch()}
        />
        <button
          className="secondary-button"
          onClick={onCreateBranch}
          disabled={loading || !newBranchName.trim()}
        >
          + New Branch
        </button>
      </div>

      {!repoPath ? (
        <div className="empty-state">Open a repository to see its branches.</div>
      ) : branches.length === 0 ? (
        <div className="empty-state">
          <h3>No branches loaded</h3>
        </div>
      ) : (
        <div className="branch-list">
          {branches.map((b) => (
            <div className="branch-row" key={b.name}>
              <span className="branch-dot" data-current={b.isCurrent} />
              <span className="branch-row-name">{b.name}</span>
              {!b.isCurrent && !b.isRemote && (b.ahead > 0 || b.behind > 0) && (
                <span className="ahead-behind">
                  {b.ahead > 0 && <span className="ab-ahead">↑{b.ahead}</span>}
                  {b.behind > 0 && <span className="ab-behind">↓{b.behind}</span>}
                </span>
              )}
              {!b.isCurrent && (
                <button className="ghost-button small" onClick={() => onMergeBranch(b.name)}>
                  Merge
                </button>
              )}
              {b.isRemote && <span className="badge remote">remote</span>}
              {b.isCurrent ? (
                <span className="badge current">current</span>
              ) : (
                <button
                  className="ghost-button small"
                  onClick={() => onCheckoutBranch(b.name)}
                  disabled={loading}
                >
                  Checkout
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
