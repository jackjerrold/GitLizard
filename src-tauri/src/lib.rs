// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use git2::{Cred, FetchOptions, PushOptions, RemoteCallbacks, Repository, StatusOptions};
use tauri::Manager;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

struct AppState {
    repo_path: Mutex<Option<PathBuf>>,
}

#[derive(Serialize)]
struct FileStatus {
    path: String,
    status: String,
}

#[derive(Serialize)]
struct GitStatus {
    branch: String,
    files: Vec<FileStatus>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncStatus {
    ahead: u32,
    behind: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Commit {
    id: String,
    hash: String,
    author: String,
    date: String,
    message: String,
    parent_ids: Vec<String>,
    refs: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CommitFile {
    path: String,
    status: String,
}
 
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Branch {
    name: String,
    is_remote: bool,
    is_current: bool,
    ahead: u32,
    behind: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConflictFile {
    path: String,
    ours: String,
    theirs: String,
    base: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase", tag = "status")]
enum MergeResult {
    UpToDate,
    FastForwarded,
    ReadyToFinish,
    Conflicted { conflicts: Vec<ConflictFile> },
    Dirty, // <-- new: working tree has uncommitted changes, merge refused
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalResult {
    stdout: String,
    stderr: String,
    exit_code: i32,
}

 
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DiffLine {
    kind: String, // "add" | "remove" | "context" | "header"
    old_line: Option<u32>,
    new_line: Option<u32>,
    content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GitLizardFile {
    name: String,
}

#[derive(Serialize)]
struct Profile {
    name: String,
    email: String,
}

fn auth() -> RemoteCallbacks<'static> {
    let mut callbacks = RemoteCallbacks::new();

    callbacks.credentials(|url, username_from_url, allowed_types| {
        // SSH authentication through the user's SSH agent
        if allowed_types.is_ssh_key() {
            if let Some(username) = username_from_url {
                if let Ok(credentials) = Cred::ssh_key_from_agent(username) {
                    return Ok(credentials);
                }
            }
        }

        // HTTPS authentication through Git's configured credential helper
        if allowed_types.is_user_pass_plaintext() {
            let config = git2::Config::open_default()
                .map_err(|_| git2::Error::from_str(
                    "Could not open Git configuration"
                ))?;

            if let Ok(credentials) =
                Cred::credential_helper(&config, url, username_from_url)
            {
                return Ok(credentials);
            }
        }

        // Some authentication mechanisms only require a username
        if allowed_types.is_username() {
            if let Some(username) = username_from_url {
                return Cred::username(username);
            }
        }

        Err(git2::Error::from_str(
            "No suitable Git credentials available"
        ))
    });

    callbacks
}

/// Clone a remote repo to `dest` and select it as the active repo.
#[tauri::command]
fn clone_repo(url: String, dest: String, state: tauri::State<AppState>, app: tauri::AppHandle) -> Result<String, String> {
    let mut opts = FetchOptions::new();
    opts.remote_callbacks(auth());
 
    let mut builder = git2::build::RepoBuilder::new();
    builder.fetch_options(opts);
 
    builder
        .clone(&url, std::path::Path::new(&dest))
        .map_err(|e| e.message().to_string())?;
 
    let mut repo_path = state
        .repo_path
        .lock()
        .map_err(|_| "Failed to access application state")?;
    *repo_path = Some(PathBuf::from(&dest));

    persist_last_repo(&app, &PathBuf::from(&dest));

    Ok(dest)
}
 
/// Initialize a brand-new repo at `path` (creating the folder if needed)
/// and select it as the active repo.
#[tauri::command]
fn init_repo(path: String, state: tauri::State<AppState>, app: tauri::AppHandle) -> Result<String, String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
 
    Repository::init(&path).map_err(|e| e.message().to_string())?;
 
    let mut repo_path = state
        .repo_path
        .lock()
        .map_err(|_| "Failed to access application state")?;
    *repo_path = Some(PathBuf::from(&path));
 
    persist_last_repo(&app, &PathBuf::from(&path));
 
    Ok(path)
}
 


/// Return every modified/untracked/staged file.
#[tauri::command]
fn status(state: tauri::State<AppState>) -> Result<GitStatus, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| e.message().to_string())?;

    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().ok().map(|s| s.to_string()))
        .unwrap_or_default();

    let mut files = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("");

        let status_name = if status.is_wt_new() {
            "untracked"
        } else if status.is_wt_modified() {
            "modified"
        } else if status.is_wt_deleted() {
            "deleted"
        } else if status.is_wt_renamed() {
            "renamed"
        } else if status.is_wt_typechange() {
            "modified"
        } else if status.is_index_new() {
            "added"
        } else if status.is_index_modified() {
            "modified"
        } else if status.is_index_deleted() {
            "deleted"
        } else if status.is_index_renamed() {
            "renamed"
        } else if status.is_index_typechange() {
            "modified"
        } else {
            "unknown"
        };

        files.push(FileStatus {
            path: path.to_string(),
            status: status_name.to_string(),
        });
    }

    Ok(GitStatus { branch, files })
}

/// Stage everything and commit it in one step.
#[tauri::command]
fn commit_all(message: String, state: tauri::State<AppState>) -> Result<(), String> {
    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".into());
    }
 
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;
 
    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    index
        .add_all(["*"], git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| e.message().to_string())?;
    index.write().map_err(|e| e.message().to_string())?;
 
    let tree = repo
        .find_tree(index.write_tree().map_err(|e| e.message().to_string())?)
        .map_err(|e| e.message().to_string())?;
    let sig = repo.signature().map_err(|e| e.message().to_string())?;
    let parent = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent.iter().collect();
 
    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| e.message().to_string())?;
    println!("committed {}", &oid.to_string()[..7]);
    Ok(())
}
 
/// Push the current branch to origin.
#[tauri::command]
fn push(state: tauri::State<AppState>) -> Result<SyncStatus, String>{
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let branch = repo
        .head()
        .map_err(|e| e.message().to_string())?
        .shorthand()
        .map_err(|e| e.message().to_string())?
        .to_string();

    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| e.message().to_string())?;

    let mut opts = PushOptions::new();
    opts.remote_callbacks(auth());

    // Check whether this branch already has an upstream.
    let local_branch = repo
        .find_branch(&branch, git2::BranchType::Local)
        .map_err(|e| e.message().to_string())?;

    let has_upstream = local_branch
        .upstream()
        .is_ok();

    let refspec = format!(
        "refs/heads/{0}:refs/heads/{0}",
        branch
    );

    remote
        .push(
            &[refspec.as_str()],
            Some(&mut opts),
        )
        .map_err(|e| e.message().to_string())?;

    // If this was the first push, set origin/<branch> as upstream.
    if !has_upstream {
        let mut local_branch = repo
            .find_branch(&branch, git2::BranchType::Local)
            .map_err(|e| e.message().to_string())?;

        local_branch
            .set_upstream(Some(&format!("origin/{}", branch)))
            .map_err(|e| e.message().to_string())?;
    }

    compute_sync_status(&repo).map_err(|e| e.message().to_string())
}

/// Pull = fetch + fast-forward. (Stops with an error if a real merge is needed.)
#[tauri::command]
fn pull(state: tauri::State<AppState>) -> Result<SyncStatus, String>{
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let branch = repo
        .head()
        .map_err(|e| e.message().to_string())?
        .shorthand()
        .unwrap_or("main")
        .to_string();
    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| e.message().to_string())?;
    let mut opts = FetchOptions::new();
    opts.remote_callbacks(auth());
    let refspec = format!("refs/heads/{}:refs/remotes/origin/{}", branch, branch);
    remote
        .fetch(&[refspec.as_str()], Some(&mut opts), None)
        .map_err(|e| e.message().to_string())?;

    let fetch_head = repo
        .find_reference("FETCH_HEAD")
        .map_err(|e| e.message().to_string())?;
    let upstream = repo
        .reference_to_annotated_commit(&fetch_head)
        .map_err(|e| e.message().to_string())?;
    let (analysis, _) = repo
        .merge_analysis(&[&upstream])
        .map_err(|e| e.message().to_string())?;

    if analysis.is_up_to_date() {
        // println!("already up to date");
    } else if analysis.is_fast_forward() {
        let refname = format!("refs/heads/{}", branch);
        repo.find_reference(&refname)
            .map_err(|e| e.message().to_string())?
            .set_target(upstream.id(), "pull: fast-forward")
            .map_err(|e| e.message().to_string())?;
        repo.set_head(&refname)
            .map_err(|e| e.message().to_string())?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
            .map_err(|e| e.message().to_string())?;
        // println!("fast-forwarded {}", branch);
    } else {
        return Err("Cannot pull: branches have diverged. Fetch and merge manually.".into());
    }

    compute_sync_status(&repo).map_err(|e| e.message().to_string())
}

/// Cheap, local-only ahead/behind check — call after status refresh, after
/// commit, etc. Doesn't touch the network.
#[tauri::command]
fn get_sync_status(state: tauri::State<AppState>) -> Result<SyncStatus, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;
    compute_sync_status(&repo).map_err(|e| e.message().to_string())
}

/// Update remote-tracking refs (e.g. origin/main) without merging anything
/// into the working branch. This is what makes the "behind" count trustworthy.
#[tauri::command]
fn fetch(state: tauri::State<AppState>) -> Result<SyncStatus, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let branch = repo
        .head()
        .map_err(|e| e.message().to_string())?
        .shorthand()
        .unwrap_or("main")
        .to_string();

    let mut remote = repo
        .find_remote("origin")
        .map_err(|e| e.message().to_string())?;

    let mut opts = FetchOptions::new();
    opts.remote_callbacks(auth());
    let refspec = format!("refs/heads/{}:refs/remotes/origin/{}", branch, branch);
    remote
        .fetch(&[refspec.as_str()], Some(&mut opts), None)
        .map_err(|e| e.message().to_string())?;

    compute_sync_status(&repo).map_err(|e| e.message().to_string())
}

#[tauri::command]
fn set_repo(path: String, app: tauri::AppHandle, state: tauri::State<AppState>) -> Result<(), String> {
    let path = PathBuf::from(path);

    if !path.join(".git").exists() {
        return Err("Selected folder is not a Git repository".into());
    }

    {
        let mut repo_path = state
            .repo_path
            .lock()
            .map_err(|_| "Failed to access application state")?;
        *repo_path = Some(path.clone());
    }

    persist_last_repo(&app, &path);
    Ok(())
}

/// Diff a single file against HEAD, covering both staged and unstaged changes.
#[tauri::command]
fn get_diff(file_path: String, state: tauri::State<AppState>) -> Result<Vec<DiffLine>, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;
 
    // A brand-new repo with no commits yet has no HEAD tree — that's fine,
    // git2 treats the diff as "everything is new" in that case.
    let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
 
    let mut opts = git2::DiffOptions::new();
    opts.pathspec(&file_path);
    opts.include_untracked(true);
    opts.recurse_untracked_dirs(true);
 
    let diff = repo
        .diff_tree_to_workdir_with_index(head_tree.as_ref(), Some(&mut opts))
        .map_err(|e| e.message().to_string())?;
 
    let lines: Mutex<Vec<DiffLine>> = Mutex::new(Vec::new());
 
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let kind = match line.origin() {
            '+' => "add",
            '-' => "remove",
            'H' => "header",
            'F' => "header",
            _ => "context",
        };
        // git2's line.content() includes the origin character (+/-/space)
        // for add/remove/context lines. The frontend already renders that
        // character separately via diff-marker, so strip it here to avoid
        // a doubled prefix (e.g. "+ +hello world").
        let raw = std::str::from_utf8(line.content()).unwrap_or("");
        let content = match line.origin() {
            '+' | '-' | ' ' => raw.get(1..).unwrap_or(""),
            _ => raw,
        }
            .trim_end_matches('\n')
            .to_string();
 
        lines.lock().unwrap().push(DiffLine {
            kind: kind.to_string(),
            old_line: line.old_lineno(),
            new_line: line.new_lineno(),
            content,
        });
        true
    })

    .map_err(|e| e.message().to_string())?;
 
    Ok(lines.into_inner().unwrap())
}


/// Walk commit history from every branch tip (local + remote-tracking), newest
/// first, topologically ordered so a commit always comes before its parents.
/// This is what makes it possible to draw a real multi-branch graph on the
/// frontend instead of just a single line for whatever HEAD happens to be on.
#[tauri::command]
fn get_history(state: tauri::State<AppState>) -> Result<Vec<Commit>, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    // oid -> branch/tag names pointing at it, so the graph can label the
    // right dot (e.g. "main", "origin/main", "feature-x").
    let mut ref_labels: std::collections::HashMap<git2::Oid, Vec<String>> =
        std::collections::HashMap::new();

    for item in repo.branches(None).map_err(|e| e.message().to_string())? {
        let (branch, _branch_type) = item.map_err(|e| e.message().to_string())?;
        if let (Ok(Some(name)), Some(target)) = (branch.name(), branch.get().target()) {
            ref_labels.entry(target).or_default().push(name.to_string());
        }
    }

    let mut revwalk = repo.revwalk().map_err(|e| e.message().to_string())?;
    revwalk
        .set_sorting(git2::Sort::TOPOLOGICAL | git2::Sort::TIME)
        .map_err(|e| e.message().to_string())?;

    // Push every branch tip so the walk covers the whole graph, not just
    // HEAD's ancestry. Fall back to HEAD if the repo somehow has no branches.
    let mut pushed_any = false;
    for item in repo.branches(None).map_err(|e| e.message().to_string())? {
        let (branch, _branch_type) = item.map_err(|e| e.message().to_string())?;
        if let Some(target) = branch.get().target() {
            if revwalk.push(target).is_ok() {
                pushed_any = true;
            }
        }
    }
    if !pushed_any {
        revwalk.push_head().map_err(|e| e.message().to_string())?;
    }

    let mut commits = Vec::new();
    for (i, oid) in revwalk.enumerate() {
        if i >= 300 {
            break;
        }
        let oid = oid.map_err(|e| e.message().to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.message().to_string())?;
        let author = commit.author();
        let time = commit.time();

        commits.push(Commit {
            id: oid.to_string(),
            hash: oid.to_string()[..7].to_string(),
            author: author.name().unwrap_or("unknown").to_string(),
            date: format_date(time.seconds(), time.offset_minutes()),
            message: commit.summary().map_err(|e| e.message().to_string())?.unwrap_or("").to_string(),
            parent_ids: commit.parent_ids().map(|p| p.to_string()).collect(),
            refs: ref_labels.remove(&oid).unwrap_or_default(),
        });
    }

    Ok(commits)
}

/// List the files changed by a single commit, diffed against its first
/// parent (or against an empty tree for a root commit).
#[tauri::command]
fn get_commit_files(id: String, state: tauri::State<AppState>) -> Result<Vec<CommitFile>, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let oid = git2::Oid::from_str(&id).map_err(|e| e.message().to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.message().to_string())?;
    let commit_tree = commit.tree().map_err(|e| e.message().to_string())?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(
            commit
                .parent(0)
                .map_err(|e| e.message().to_string())?
                .tree()
                .map_err(|e| e.message().to_string())?,
        )
    } else {
        None
    };

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&commit_tree), None)
        .map_err(|e| e.message().to_string())?;

    let mut files = Vec::new();
    for delta in diff.deltas() {
        let status = match delta.status() {
            git2::Delta::Added => "added",
            git2::Delta::Deleted => "deleted",
            git2::Delta::Renamed => "renamed",
            _ => "modified",
        };

        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        files.push(CommitFile {
            path,
            status: status.to_string(),
        });
    }

    Ok(files)
}

/// Ahead/behind of the current branch vs its upstream. Purely local —
/// `behind` only reflects what was learned at the last fetch, so it can
/// go stale until `fetch` is called again.
fn compute_sync_status(repo: &Repository) -> Result<SyncStatus, git2::Error> {
    let head_ref = repo.head()?;

    let branch_name = match head_ref.shorthand() {
        Ok(n) => n.to_string(),
        Err(_) => return Ok(SyncStatus { ahead: 0, behind: 0 }),
    };
    let local_oid = match head_ref.target() {
        Some(oid) => oid,
        None => return Ok(SyncStatus { ahead: 0, behind: 0 }),
    };

    let local_branch = repo.find_branch(&branch_name, git2::BranchType::Local)?;

    // No upstream yet (branch never pushed) — nothing to compare against.
    let upstream = match local_branch.upstream() {
        Ok(u) => u,
        Err(_) => return Ok(SyncStatus { ahead: 0, behind: 0 }),
    };
    let upstream_oid = match upstream.get().target() {
        Some(oid) => oid,
        None => return Ok(SyncStatus { ahead: 0, behind: 0 }),
    };

    let (ahead, behind) = repo.graph_ahead_behind(local_oid, upstream_oid)?;
    Ok(SyncStatus { ahead: ahead as u32, behind: behind as u32 })
}

/// Minimal YYYY-MM-DD formatter so we don't need to pull in the `chrono` crate.
/// Applies the commit's timezone offset so the date matches what the author
/// saw locally, not UTC.
fn format_date(unix_secs: i64, offset_minutes: i32) -> String {
    let mut days = (unix_secs + offset_minutes as i64 * 60) / 86400;
    let mut y = 1970i64;
    loop {
        let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
        let year_len = if leap { 366 } else { 365 };
        if days < year_len {
            break;
        }
        days -= year_len;
        y += 1;
    }
    let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    let month_lens = [31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut m = 0;
    while days >= month_lens[m] {
        days -= month_lens[m];
        m += 1;
    }
    format!("{:04}-{:02}-{:02}", y, m + 1, days + 1)
}
 
// ---------- branches ----------
 
#[tauri::command]
fn get_branches(state: tauri::State<AppState>) -> Result<Vec<Branch>, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let current_name: Option<String> = match repo.head() {
        Ok(head_ref) => head_ref.shorthand().ok().map(|s| s.to_string()),
        Err(_) => None,
    };

    // Resolve the "main" line branches get compared against. Try main,
    // then master, then give up (ahead/behind just come back as 0/0).
    let default_oid = repo
        .find_branch("main", git2::BranchType::Local)
        .or_else(|_| repo.find_branch("master", git2::BranchType::Local))
        .ok()
        .and_then(|b| b.get().target());

    let mut branches = Vec::new();
    let branch_iter = repo.branches(None).map_err(|e| e.message().to_string())?;

    for item in branch_iter {
        let (branch, branch_type) = item.map_err(|e| e.message().to_string())?;
        let name = match branch.name().map_err(|e| e.message().to_string())? {
            Some(n) => n.to_string(),
            None => continue,
        };
        let is_remote = branch_type == git2::BranchType::Remote;
        let is_current = !is_remote && Some(&name) == current_name.as_ref();

        let (ahead, behind) = match (default_oid, branch.get().target()) {
            (Some(main_oid), Some(tip)) if tip != main_oid => repo
                .graph_ahead_behind(tip, main_oid)
                .map(|(a, b)| (a as u32, b as u32))
                .unwrap_or((0, 0)),
            _ => (0, 0),
        };

        branches.push(Branch { name, is_remote, is_current, ahead, behind });
    }

    Ok(branches)
}
 
/// If a user picks "origin/feature" from the branch list, strip the leading
/// "origin/" so we don't double it to "origin/origin/feature".
fn strip_origin_prefix(name: &str) -> &str {
    name.strip_prefix("origin/").unwrap_or(name)
}

/// Switch to a local branch. If it doesn't exist locally but exists on origin,
/// create a local tracking branch first.
#[tauri::command]
fn checkout_branch(name: String, state: tauri::State<AppState>) -> Result<(), String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let clean_name = strip_origin_prefix(&name).to_string();

    // Already exists locally?
    let local = repo.find_branch(&clean_name, git2::BranchType::Local);

    let branch_ref_name = if local.is_ok() {
        format!("refs/heads/{}", clean_name)
    } else {
        // Try to find it as a remote branch (e.g. "origin/feature-x") and
        // create a local branch tracking it.
        let remote_name = format!("origin/{}", clean_name);
        let remote_branch = repo
            .find_branch(&remote_name, git2::BranchType::Remote)
            .map_err(|_| format!("Branch '{}' not found locally or on origin", clean_name))?;
        let commit = remote_branch
            .get()
            .peel_to_commit()
            .map_err(|e| e.message().to_string())?;
 
        repo.branch(&clean_name, &commit, false)
            .map_err(|e| e.message().to_string())?;
        format!("refs/heads/{}", clean_name)
    };
 
    repo.set_head(&branch_ref_name)
        .map_err(|e| e.message().to_string())?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
        .map_err(|e| e.message().to_string())?;
 
    Ok(())
}
 
/// Create a new branch from the current HEAD commit and switch to it.
#[tauri::command]
fn create_branch(
    name: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let repo = open_repo(&state)
        .map_err(|e| e.message().to_string())?;

    if repo
        .find_branch(&name, git2::BranchType::Local)
        .is_ok()
    {
        return Err(format!(
            "Branch '{}' already exists",
            name
        ));
    }

    let head_commit = repo
        .head()
        .map_err(|e| e.message().to_string())?
        .peel_to_commit()
        .map_err(|e| e.message().to_string())?;

    repo.branch(&name, &head_commit, false)
        .map_err(|e| e.message().to_string())?;

    let refname = format!("refs/heads/{}", name);

    repo.set_head(&refname)
        .map_err(|e| e.message().to_string())?;

    repo.checkout_head(
        Some(
            git2::build::CheckoutBuilder::new()
                .force()
        )
    )
    .map_err(|e| e.message().to_string())?;

    Ok(())
}

// ---------- merging ----------

/// Begin merging `branch_name` into the current branch. Never auto-commits —
/// on success (no conflicts) the merge is staged in the working directory
/// and index, waiting for `finish_merge` or `abort_merge`. On conflicts,
/// returns the list of conflicted files for the UI to resolve.
#[tauri::command]
fn start_merge(branch_name: String, state: tauri::State<AppState>) -> Result<MergeResult, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(false); // untracked files won't conflict with a merge checkout
    let dirty = repo
        .statuses(Some(&mut opts))
        .map_err(|e| e.message().to_string())?
        .iter()
        .any(|e| !e.status().is_ignored());

    if dirty {
        return Ok(MergeResult::Dirty);
    }

    let clean_name = strip_origin_prefix(&branch_name);

    let target_oid = repo
        .find_branch(clean_name, git2::BranchType::Local)
        .or_else(|_| repo.find_branch(&format!("origin/{}", clean_name), git2::BranchType::Remote))
        .map_err(|_| format!("Branch '{}' not found", clean_name))?
        .get()
        .target()
        .ok_or("Branch has no commits")?;

    let annotated = repo
        .find_annotated_commit(target_oid)
        .map_err(|e| e.message().to_string())?;

    let (analysis, _) = repo
        .merge_analysis(&[&annotated])
        .map_err(|e| e.message().to_string())?;

    if analysis.is_up_to_date() {
        return Ok(MergeResult::UpToDate);
    }

    if analysis.is_fast_forward() {
        let head_ref_name = repo
            .head()
            .map_err(|e| e.message().to_string())?
            .name()
            .map_err(|e| e.message().to_string())?
            .to_string();
        repo.find_reference(&head_ref_name)
            .map_err(|e| e.message().to_string())?
            .set_target(target_oid, "merge: fast-forward")
            .map_err(|e| e.message().to_string())?;
        repo.set_head(&head_ref_name).map_err(|e| e.message().to_string())?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::new().force()))
            .map_err(|e| e.message().to_string())?;
        return Ok(MergeResult::FastForwarded);
    }

    // Real merge: writes into index + working dir, sets MERGE_HEAD, does NOT commit.
    repo.merge(&[&annotated], None, None)
        .map_err(|e| e.message().to_string())?;

    let index = repo.index().map_err(|e| e.message().to_string())?;
    if index.has_conflicts() {
        Ok(MergeResult::Conflicted { conflicts: collect_conflicts(&repo)? })
    } else {
        Ok(MergeResult::ReadyToFinish)
    }
}

fn collect_conflicts(repo: &Repository) -> Result<Vec<ConflictFile>, String> {
    let index = repo.index().map_err(|e| e.message().to_string())?;
    let mut out = Vec::new();

    for conflict in index.conflicts().map_err(|e| e.message().to_string())? {
        let conflict = conflict.map_err(|e| e.message().to_string())?;

        let path = conflict
            .our
            .as_ref()
            .or(conflict.their.as_ref())
            .or(conflict.ancestor.as_ref())
            .and_then(|e| std::str::from_utf8(&e.path).ok())
            .unwrap_or("")
            .to_string();

        let blob_text = |entry: &Option<git2::IndexEntry>| -> String {
            entry
                .as_ref()
                .and_then(|e| repo.find_blob(e.id).ok())
                .map(|b| String::from_utf8_lossy(b.content()).to_string())
                .unwrap_or_default()
        };

        out.push(ConflictFile {
            path,
            ours: blob_text(&conflict.our),
            theirs: blob_text(&conflict.their),
            base: blob_text(&conflict.ancestor),
        });
    }

    Ok(out)
}

/// Re-fetch the current conflict list (e.g. after a page reload mid-merge).
#[tauri::command]
fn get_merge_conflicts(state: tauri::State<AppState>) -> Result<Vec<ConflictFile>, String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;
    collect_conflicts(&repo)
}

/// Write the user's chosen resolution for one file and mark it resolved.
#[tauri::command]
fn resolve_conflict(path: String, content: String, state: tauri::State<AppState>) -> Result<(), String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;
    let workdir = repo.workdir().ok_or("Repository has no working directory")?;

    std::fs::write(workdir.join(&path), content).map_err(|e| e.to_string())?;

    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    index.add_path(std::path::Path::new(&path)).map_err(|e| e.message().to_string())?;
    index.write().map_err(|e| e.message().to_string())?;
    Ok(())
}

/// Commit the staged merge. Fails if conflicts remain unresolved.
#[tauri::command]
fn finish_merge(message: String, state: tauri::State<AppState>) -> Result<(), String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;

    let mut index = repo.index().map_err(|e| e.message().to_string())?;
    if index.has_conflicts() {
        return Err("Resolve all conflicts before finishing the merge".into());
    }

    let tree = repo
        .find_tree(index.write_tree().map_err(|e| e.message().to_string())?)
        .map_err(|e| e.message().to_string())?;
    let sig = repo.signature().map_err(|e| e.message().to_string())?;

    let head_commit = repo.head().map_err(|e| e.message().to_string())?.peel_to_commit()
        .map_err(|e| e.message().to_string())?;
    let merge_head = repo.find_reference("MERGE_HEAD").map_err(|e| e.message().to_string())?
        .peel_to_commit().map_err(|e| e.message().to_string())?;

    repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&head_commit, &merge_head])
        .map_err(|e| e.message().to_string())?;

    repo.cleanup_state().map_err(|e| e.message().to_string())?;
    Ok(())
}

/// Throw away an in-progress merge entirely — resets working dir + index
/// back to HEAD, as if you'd never touched it.
#[tauri::command]
fn abort_merge(state: tauri::State<AppState>) -> Result<(), String> {
    let repo = open_repo(&state).map_err(|e| e.message().to_string())?;
    let head_commit = repo.head().map_err(|e| e.message().to_string())?.peel_to_commit()
        .map_err(|e| e.message().to_string())?;

    repo.reset(head_commit.as_object(), git2::ResetType::Hard, None)
        .map_err(|e| e.message().to_string())?;
    repo.cleanup_state().map_err(|e| e.message().to_string())?;
    Ok(())
}

#[tauri::command]
fn get_git_lizard_files(state: tauri::State<AppState>,) -> Result<Vec<GitLizardFile>, String> {
    let repo = open_repo(&state)
        .map_err(|e| e.message().to_string())?;

    let workdir = repo
        .workdir()
        .ok_or_else(|| "Repository has no working directory".to_string())?;

    let git_lizard_dir = workdir.join(".git_lizard");

    if !git_lizard_dir.exists() {
        return Ok(Vec::new());
    }

    let mut files = Vec::new();

    let entries = std::fs::read_dir(&git_lizard_dir)
        .map_err(|e| format!("Failed to read .git_lizard: {}", e))?;

    for entry in entries {
        let entry = entry
            .map_err(|e| format!("Failed to read entry: {}", e))?;

        let path = entry.path();

        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                files.push(GitLizardFile {
                    name: name.to_string(),
                });
            }
        }
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(files)
}

#[tauri::command]
fn get_git_lizard_file(
    filename: String,
    state: tauri::State<AppState>,
) -> Result<String, String> {

    if filename.contains('/') || filename.contains('\\') {
        return Err("Invalid filename".into());
    }

    let repo = open_repo(&state)
        .map_err(|e| e.message().to_string())?;

    let workdir = repo
        .workdir()
        .ok_or_else(|| "Repository has no working directory".to_string())?;

    let git_lizard_dir = workdir.join(".git_lizard");

    let file_path = git_lizard_dir.join(&filename);

    if !file_path.exists() {
        return Ok(String::new());
    }

    std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn save_git_lizard_file(
    filename: String,
    contents: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {

    if filename.contains('/') || filename.contains('\\') {
        return Err("Invalid filename".into());
    }

    let repo = open_repo(&state)
        .map_err(|e| e.message().to_string())?;

    let workdir = repo
        .workdir()
        .ok_or_else(|| "Repository has no working directory".to_string())?;

    let git_lizard_dir = workdir.join(".git_lizard");

    std::fs::create_dir_all(&git_lizard_dir)
        .map_err(|e| format!("Failed to create .git_lizard: {}", e))?;

    let file_path = git_lizard_dir.join(&filename);

    std::fs::write(&file_path, contents)
        .map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn create_git_lizard_file(
    filename: String,
    state: tauri::State<AppState>,
) -> Result<(), String> {

    if filename.contains('/') || filename.contains('\\') {
        return Err("Invalid filename".into());
    }

    let repo = open_repo(&state)
        .map_err(|e| e.message().to_string())?;

    let workdir = repo
        .workdir()
        .ok_or_else(|| "Repository has no working directory".to_string())?;

    let git_lizard_dir = workdir.join(".git_lizard");

    std::fs::create_dir_all(&git_lizard_dir)
        .map_err(|e| format!("Failed to create .git_lizard: {}", e))?;

    let file_path = git_lizard_dir.join(&filename);

    std::fs::write(&file_path, "...")
        .map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(())
}

/// Read user.name / user.email from git's global config (falls back to
/// the current repo's config if no global value is set).
#[tauri::command]
fn get_profile(state: tauri::State<AppState>) -> Result<Profile, String> {
    let cfg = match open_repo(&state) {
        Ok(repo) => repo.config().map_err(|e| e.message().to_string())?,
        Err(_) => git2::Config::open_default().map_err(|e| e.message().to_string())?,
    };

    let name = cfg.get_string("user.name").unwrap_or_default();
    let email = cfg.get_string("user.email").unwrap_or_default();

    Ok(Profile { name, email })
}

/// Write user.name / user.email to git's global config, so it applies
/// across every repo, not just the one currently open.
#[tauri::command]
fn set_profile(name: String, email: String) -> Result<(), String> {
    let mut cfg = git2::Config::open_default().map_err(|e| e.message().to_string())?;
    cfg.set_str("user.name", &name)
        .map_err(|e| e.message().to_string())?;
    cfg.set_str("user.email", &email)
        .map_err(|e| e.message().to_string())?;
    Ok(())
}

/// Run a shell command inside the currently open repo's directory.
/// Uses `sh -c` so pipes, &&, and glob patterns work like a real shell.
#[tauri::command]
fn run_terminal_command(
    command: String,
    state: tauri::State<AppState>,
) -> Result<TerminalResult, String> {
    let path = state
        .repo_path
        .lock()
        .map_err(|_| "Failed to access application state")?
        .clone()
        .ok_or("No repository selected")?;
 
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(&command)
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run command: {e}"))?;
 
    Ok(TerminalResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
    })
}

fn last_repo_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to resolve config directory: {e}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create config directory: {e}"))?;
    Ok(dir.join("last_repo.txt"))
}

fn persist_last_repo(app: &tauri::AppHandle, path: &Path) {
    if let Ok(file) = last_repo_file(app) {
        let _ = std::fs::write(file, path.to_string_lossy().as_bytes());
    }
}

/// Return the last-opened repo path, but only if it still looks like a
/// valid Git repo — no point auto-opening something that's been deleted
/// or moved.
#[tauri::command]
fn get_last_repo(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file = last_repo_file(&app)?;
    let Ok(contents) = std::fs::read_to_string(&file) else {
        return Ok(None);
    };
    let path = contents.trim();
    if path.is_empty() || !PathBuf::from(path).join(".git").exists() {
        return Ok(None);
    }
    Ok(Some(path.to_string()))
}

fn open_repo(state: &AppState) -> Result<Repository, git2::Error> {
    let path = state
        .repo_path
        .lock()
        .map_err(|_| git2::Error::from_str("Failed to access application state"))?
        .clone()
        .ok_or_else(|| git2::Error::from_str("No repository selected"))?;

    Repository::open(path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            repo_path: Mutex::new(None),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            status, 
            commit_all, 
            push, 
            pull,
            fetch,
            get_sync_status,
            set_repo,
            get_history,
            get_commit_files,
            get_branches,
            checkout_branch,
            create_branch,
            start_merge,
            get_merge_conflicts,
            resolve_conflict,
            finish_merge,
            abort_merge,
            get_diff,
            get_git_lizard_file,
            save_git_lizard_file,
            get_git_lizard_files,
            create_git_lizard_file,
            get_profile,
            set_profile,
            clone_repo,
            init_repo,
            get_last_repo,
            run_terminal_command
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}