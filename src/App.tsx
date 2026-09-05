import { useState, useEffect } from "react";
import "./App.css";

import type { Tab } from "./types";
import { loadStoredTheme, applyTheme, type ThemeId } from "./theme";

import { useStatusMessage } from "./hooks/useStatusMessage";
import { useRepo } from "./hooks/useRepo";
import { useHistory } from "./hooks/useHistory";
import { useBranches } from "./hooks/useBranches";
import { useNotes } from "./hooks/useNotes";
import { useProfile } from "./hooks/useProfile";
import { useTerminal } from "./hooks/useTerminal";

import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { StatusBanner } from "./components/StatusBanner";
import { SettingsPage } from "./components/SettingsPage";
import { ChangesTab } from "./components/tabs/ChangesTab";
import { HistoryTab } from "./components/tabs/HistoryTab";
import { BranchesTab } from "./components/tabs/BranchesTab";
import { NotesTab } from "./components/tabs/NotesTab";
import { TerminalTab } from "./components/tabs/TerminalTab";

import { MergeModal } from "./components/MergeModal";

function App() {
  const [theme, setTheme] = useState<ThemeId>(loadStoredTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("changes");

  useEffect(() => applyTheme(theme), [theme]);

  const status = useStatusMessage();
  const repo = useRepo(status);
  const history = useHistory(status);
  const branches = useBranches(status, repo.refreshStatus);
  const notes = useNotes(status);
  const profile = useProfile(status);
  const terminal = useTerminal();

  useEffect(() => {
    if (!repo.repoPath) return;
    if (tab === "changes") repo.refreshStatus();
    if (tab === "history") history.fetchHistory();
    if (tab === "branches") branches.fetchBranches();
    if (tab === "notes") notes.fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, repo.repoPath]);

  useEffect(() => {
    if (settingsOpen) profile.fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);

  if (settingsOpen) {
    return (
      <SettingsPage
        theme={theme}
        onThemeChange={setTheme}
        profile={profile.profile}
        onSaveProfile={profile.saveProfile}
        onClose={() => setSettingsOpen(false)}
      />
    );
  }

  return (
    <div className="app">
      <TopBar branch={repo.gitStatus?.branch ?? null} />

      <div className="shell">
        <Sidebar
          repoPath={repo.repoPath}
          fileCount={repo.gitStatus?.files.length ?? 0}
          tab={tab}
          onTabChange={setTab}
          onOpenRepository={repo.chooseRepository}
          onCloneRepository={repo.cloneRepository}
          onCreateRepository={repo.createRepository}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="main">
          <StatusBanner
            loading={status.loading}
            action={status.action}
            message={status.message}
            onDismiss={() => status.setMessage("")}
          />

          {tab === "changes" && (
            <ChangesTab
              repoPath={repo.repoPath}
              gitStatus={repo.gitStatus}
              loading={status.loading}
              selectedFile={repo.selectedFile}
              diff={repo.diff}
              diffLoading={repo.diffLoading}
              commitMessage={repo.commitMessage}
              syncStatus={repo.syncStatus}
              fetching={repo.fetching}
              onCommitMessageChange={repo.setCommitMessage}
              onCommitAll={repo.commitAll}
              onFetch={repo.fetch}
              onPull={repo.pull}
              onPush={repo.push}
              onRefresh={repo.refreshStatus}
              onSelectFile={repo.selectFile}
            />
          )}

          {tab === "history" && (
            <HistoryTab
              repoPath={repo.repoPath}
              commits={history.commits}
              selectedCommit={history.selectedCommit}
              commitFiles={history.commitFiles}
              onSelectCommit={history.selectCommit}
            />
          )}

          {tab === "branches" && (
            <BranchesTab
              repoPath={repo.repoPath}
              branches={branches.branches}
              loading={status.loading}
              newBranchName={branches.newBranchName}
              onNewBranchNameChange={branches.setNewBranchName}
              onMergeBranch={branches.startMerge}
              onCreateBranch={branches.createBranch}
              onCheckoutBranch={branches.checkoutBranch}
            />
          )}

          {tab === "notes" && (
            <NotesTab
              files={notes.files}
              selectedFile={notes.selectedFile}
              fileContents={notes.fileContents}
              onFileContentsChange={notes.setFileContents}
              onCreateFile={notes.createFile}
              onOpenFile={notes.openFile}
              onSaveFile={notes.saveFile}
            />
          )}

          {tab === "terminal" && (
            <TerminalTab
              repoPath={repo.repoPath}
              history={terminal.history}
              input={terminal.input}
              running={terminal.running}
              onInputChange={terminal.setInput}
              onRun={terminal.runCommand}
              onClear={terminal.clear}
            />
          )}

          {branches.mergeTarget && branches.mergeStatus && branches.mergeStatus !== "upToDate" && (
            <MergeModal
              currentBranch={repo.gitStatus?.branch ?? "Current Branch"}
              targetBranch={branches.mergeTarget}
              status={branches.mergeStatus as "readyToFinish" | "conflicted"}
              conflicts={branches.conflicts}
              resolvedPaths={branches.resolvedPaths}
              allResolved={branches.allResolved}
              onResolve={branches.resolveConflict}
              onFinish={branches.finishMerge}
              onAbort={branches.abortMerge}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;