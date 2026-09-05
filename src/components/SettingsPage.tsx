import { useState, useEffect } from "react";
import { THEMES, type ThemeId } from "../theme";
import type { Profile } from "../types";

type SettingsPageProps = {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  profile: Profile;
  onSaveProfile: (name: string, email: string) => void;
  onClose: () => void;
};

type SettingsSection = "theme" | "profile" | "general";

export function SettingsPage({
  theme,
  onThemeChange,
  profile,
  onSaveProfile,
  onClose,
}: SettingsPageProps) {
  const [section, setSection] = useState<SettingsSection>("theme");
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  // keep the form in sync if the profile finishes loading after mount
  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
  }, [profile]);

  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <button className="ghost-button" onClick={onClose}>
          ← Back
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-page-body">
        <nav className="settings-nav">
          <button
            className={`settings-nav-item ${section === "theme" ? "active" : ""}`}
            onClick={() => setSection("theme")}
          >
            Theme
          </button>
          <button
            className={`settings-nav-item ${section === "profile" ? "active" : ""}`}
            onClick={() => setSection("profile")}
          >
            Profile
          </button>
          <button
            className={`settings-nav-item ${section === "general" ? "active" : ""}`}
            onClick={() => setSection("general")}
          >
            General
          </button>
        </nav>

        <div className="settings-panel">
          {section === "theme" && (
            <div className="settings-section">
              <h2>Theme</h2>
              <p className="settings-section-desc">Pick how Branchline looks.</p>

              <div className="theme-grid">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    className={`theme-card ${theme === t.id ? "active" : ""}`}
                    onClick={() => onThemeChange(t.id)}
                  >
                    <span className="theme-card-swatch" data-theme-preview={t.id} />
                    <span className="theme-card-label">{t.label}</span>
                    <span className="theme-card-desc">{t.description}</span>
                    {theme === t.id && <span className="theme-card-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {section === "profile" && (
            <div className="settings-section">
              <h2>Profile</h2>
              <p className="settings-section-desc">
                Used as the author on commits made through Branchline (writes to your global git
                config).
              </p>

              <div className="settings-field">
                <label>Name</label>
                <input
                  className="text-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>

              <div className="settings-field">
                <label>Email</label>
                <input
                  className="text-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>

              <button
                className="primary-button"
                onClick={() => onSaveProfile(name, email)}
                disabled={!name.trim() || !email.trim()}
              >
                Save Profile
              </button>
            </div>
          )}

          {section === "general" && (
            <div className="settings-section">
              <h2>General</h2>
              <p className="settings-section-desc">
                More app-wide preferences land here as Git Lizard grows — default clone location,
                diff context lines, that kind of thing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
