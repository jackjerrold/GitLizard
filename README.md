# 🦎 Git Lizard

> A modern Git client designed to make Git easier to understand.

Git Lizard is a lightweight, cross-platform Git client focused on giving developers a clearer view of their repositories, branches, commits, and merges.

Instead of making Git feel like a collection of commands, Git Lizard aims to provide an intuitive visual interface for understanding what is happening inside a repository.

---

## ✨ Features

* 🌳 **Visual commit graph** — See your repository history in an intuitive graphical view.
* 🌿 **Branch management** — View and switch between branches.
* 📋 **Git status** — See changes in your working tree at a glance.
* 🔀 **Merging** — Manage merges through a visual interface.
* 📝 **Repository notes** — Keep project notes and planning alongside your repository.
* ⚡ **Native performance** — Built with Tauri and Rust rather than Electron.
* 🎨 **Modern interface** — A clean UI designed around making Git easier to understand.

> 🚧 Git Lizard is currently in public beta. Some features are still under active development.

---

## 📸 Screenshots
<img width="2730" height="1960" alt="Screenshot From 2026-10-19 19-18-07" src="https://github.com/user-attachments/assets/026760e5-1017-4d2f-b4af-b69148c09b35" />
<img width="2564" height="1600" alt="Screenshot From 2026-10-19 19-19-41" src="https://github.com/user-attachments/assets/5c0dd10e-f232-4bbc-b575-2bfda5206b18" />
<img width="2730" height="1960" alt="Screenshot From 2026-10-19 19-18-28" src="https://github.com/user-attachments/assets/33d4382c-acb1-43e7-aadc-e4f685139cff" />


---

## 📦 Installation

### Linux

Git Lizard currently provides Linux builds in three formats:

* **AppImage** — Portable and distribution-independent
* **DEB** — Debian, Ubuntu and other Debian-based distributions
* **RPM** — Fedora and other RPM-based distributions

The latest builds can be found on the [Releases](../../releases) page.

### Windows

Windows support is planned.

### macOS

macOS support is planned.

---

## 🛠️ Development

Git Lizard is built using:

* **[Tauri](https://tauri.app/)** — Desktop application framework
* **[Rust](https://www.rust-lang.org/)** — Native backend
* **[React](https://react.dev/)** — Frontend UI
* **[TypeScript](https://www.typescriptlang.org/)** — Frontend language
* **[libgit2](https://libgit2.org/)** — Git repository functionality
* **Vite** — Frontend build tooling

### Prerequisites

To develop Git Lizard, you will need:

* Node.js
* npm
* Rust
* Cargo
* Tauri CLI
* The platform-specific Tauri dependencies

### Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

### Install dependencies

```bash
npm install
```

### Run in development mode

```bash
npm run tauri dev
```

### Build the application

```bash
npm run tauri build
```

The resulting installers and bundles will be generated under:

```text
src-tauri/target/release/bundle/
```

---

## 🏗️ Project Structure

```text
GitLizard/
├── src/
│   ├── components/      # React UI components
│   ├── assets/          # Frontend assets
│   ├── App.tsx          # Main application
│   └── ...
│
├── src-tauri/
│   ├── src/
│   │   └── main.rs      # Rust/Tauri backend
│   ├── icons/           # Application icons
│   ├── tauri.conf.json  # Tauri configuration
│   └── Cargo.toml       # Rust dependencies
│
├── public/               # Public frontend assets
├── package.json          # Node dependencies and scripts
├── vite.config.ts        # Vite configuration
└── README.md
```

---

## 🧠 Why Tauri + Rust?

Git Lizard uses Rust for its native backend and React for its user interface.

Git operations can involve working directly with repository data, commit objects, branches, diffs and merges. Rust provides a fast and memory-efficient native backend, while `libgit2` allows Git Lizard to interact with repositories without relying on the Git command-line interface for every operation.

React provides the flexibility needed for Git Lizard's visual interface, particularly for features such as the commit graph.

Tauri brings the two together into a lightweight desktop application.

---

## 🗺️ Roadmap

Git Lizard is still early in development. Some of the areas being worked on include:

* [x] Repository browsing
* [x] Branch management
* [x] Commit history
* [x] Visual Git graph
* [x] Git status
* [x] Repository notes
* [x] Improved commit graph visualisation
* [x] Advanced merge interface
* [ ] Intelligent AI-assisted conflict resolution
* [ ] Windows support
* [ ] macOS support
* [ ] Automatic application updates
* [ ] More advanced Git workflows

The roadmap may change as development continues and user feedback is received.

---

## 🤝 Contributing

Git Lizard is currently a small project and is still evolving.

If you find a bug, have a feature suggestion, or want to contribute, feel free to open an issue or submit a pull request.

Before making a large change, opening an issue to discuss it first is recommended.

---

## 🐛 Reporting Bugs

If you find a bug, please open a GitHub issue and include:

* Your operating system
* Git Lizard version
* Steps to reproduce the problem
* What you expected to happen
* What actually happened
* Relevant error messages or screenshots

The more information you provide, the easier it is to reproduce and fix the problem.

---


## 🦎 About

Git Lizard is an independent project built to explore how Git can be made more approachable through a visual, modern desktop interface.

Built with Rust, Tauri, React and TypeScript.

**Git Lizard is still growing — feedback is welcome.**
