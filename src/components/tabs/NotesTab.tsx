import type { GitLizardFile } from "../../types";

type NotesTabProps = {
  files: GitLizardFile[];
  selectedFile: string | null;
  fileContents: string;
  onFileContentsChange: (value: string) => void;
  onCreateFile: () => void;
  onOpenFile: (filename: string) => void;
  onSaveFile: (filename: string, contents: string) => void;
};

export function NotesTab({
  files,
  selectedFile,
  fileContents,
  onFileContentsChange,
  onCreateFile,
  onOpenFile,
  onSaveFile,
}: NotesTabProps) {
  return (
    <section className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">GitLizard</p>
            <h2>Workspace</h2>
          </div>
          <button className="new-file-button" onClick={onCreateFile}>
            +
          </button>
        </div>

        <div className="workspace-files">
          {files.map((file) => (
            <button
              key={file.name}
              className={selectedFile === file.name ? "workspace-file active" : "workspace-file"}
              onClick={() => onOpenFile(file.name)}
            >
              <span>📄</span>
              {file.name}
            </button>
          ))}
        </div>
      </aside>

      <div className="editor">
        {!selectedFile ? (
          <div className="editor-empty">
            <h2>Select a file</h2>
            <p>Choose a GitLizard file from the sidebar.</p>
          </div>
        ) : (
          <>
            <div className="editor-header">
              <div>
                <p className="eyebrow">EDITING</p>
                <h2>{selectedFile}</h2>
              </div>
              <button
                className="primary-button"
                onClick={() => onSaveFile(selectedFile, fileContents)}
              >
                Save
              </button>
            </div>

            <textarea
              className="notes-editor"
              value={fileContents}
              onChange={(e) => onFileContentsChange(e.target.value)}
              spellCheck={false}
            />
          </>
        )}
      </div>
    </section>
  );
}
