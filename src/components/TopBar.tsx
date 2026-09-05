import logo from "../assets/GitLizardLogo.png"

type TopBarProps = {
  branch: string | null;
};

export function TopBar({ branch }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="logo">
        <img src={logo} className="logo"></img>
        <span>Git Lizard</span>
      </div>
      <div className="branch-chip">
        <span className="branch-icon">⑂</span>
        {branch ?? "No branch"}
      </div>
    </header>
  );
}
