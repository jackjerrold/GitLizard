import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GitLizardFile } from "../types";
import type { StatusMessageApi } from "./useStatusMessage";

export function useNotes(status: StatusMessageApi) {
  const [files, setFiles] = useState<GitLizardFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState("");

  async function fetchNotes() {
    await status.run(
      "Loading GitLizard notes...",
      () => invoke<GitLizardFile[]>("get_git_lizard_files"),
      setFiles
    );
  }

  async function createFile() {
    const filename = prompt("Enter a name for the new GitLizard file:");
    if (!filename) return;

    const ok = await status.run(`Creating ${filename}...`, () =>
      invoke("create_git_lizard_file", { filename })
    );
    if (ok !== undefined) await fetchNotes();
  }

  async function openFile(filename: string) {
    const contents = await status.run(
      "Opening GitLizard file...",
      () => invoke<string>("get_git_lizard_file", { filename })
    );
    if (contents !== undefined) {
      setSelectedFile(filename);
      setFileContents(contents);
    }
  }

  async function saveFile(filename: string, contents: string) {
    await status.run("Saving notes...", () =>
      invoke("save_git_lizard_file", { filename, contents })
    );
  }

  return {
    files,
    selectedFile,
    fileContents,
    setFileContents,
    fetchNotes,
    createFile,
    openFile,
    saveFile,
  };
}
