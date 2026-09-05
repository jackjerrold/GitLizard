import { useState, useRef, useEffect } from "react";
import type { Tab } from "../types";

type SidebarProps = {
  repoPath: string | null;
  fileCount: number;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenRepository: () => void;
  onCloneRepository: () => void;
  onCreateRepository: () => void;
  onOpenSettings: () => void;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "changes", label: "Changes" },
  { id: "history", label: "History" },
  { id: "branches", label: "Branches" },
  { id: "notes", label: "Notes" },
  { id: "terminal", label: "Terminal" },
];

export function Sidebar({
  repoPath,
  fileCount,
  tab,
  onTabChange,
  onOpenRepository,
  onCloneRepository,
  onCreateRepository,
  onOpenSettings,
}: SidebarProps) {
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRepoMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pick(action: () => void) {
    setRepoMenuOpen(false);
    action();
  }

  return (
    <nav className="sidebar">
      <div className="repo-block">
        <p className="eyebrow">REPOSITORY</p>
        <h1 className="repo-name">{repoPath ? repoPath.split("/").pop() : "None selected"}</h1>
        {repoPath && <p className="repo-path">{repoPath}</p>}

        <div className="sidebar-buttons repo-menu-wrap" ref={menuRef}>
          <button
            className="secondary-button full repo-menu-trigger"
            onClick={() => setRepoMenuOpen((open) => !open)}
          >
            Repository
            <span className="repo-menu-caret">{repoMenuOpen ? "▲" : "▼"}</span>
          </button>

          {repoMenuOpen && (
            <div className="repo-menu">
              <button className="repo-menu-item" onClick={() => pick(onOpenRepository)}>
                <span className="repo-menu-icon">📂</span>
                <span>
                  <span className="repo-menu-item-label">Open</span>
                  <span className="repo-menu-item-desc">Open an existing local repository</span>
                </span>
              </button>
              <button className="repo-menu-item" onClick={() => pick(onCloneRepository)}>
                <span className="repo-menu-icon">⇩</span>
                <span>
                  <span className="repo-menu-item-label">Clone</span>
                  <span className="repo-menu-item-desc">Clone a repository from a URL</span>
                </span>
              </button>
              <button className="repo-menu-item" onClick={() => pick(onCreateRepository)}>
                <span className="repo-menu-icon">+</span>
                <span>
                  <span className="repo-menu-item-label">Create</span>
                  <span className="repo-menu-item-desc">Initialize a brand-new repository</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="tab-list">
        <p className="eyebrow tab-list-label">WORKSPACE</p>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
            {t.id === "changes" && fileCount > 0 && (
              <span className="tab-count">{fileCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="settings-trigger" onClick={onOpenSettings}>
          <span className="settings-trigger-icon">⚙</span>
          Settings
        </button>
      </div>
    </nav>
  );
}