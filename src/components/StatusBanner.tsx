type StatusBannerProps = {
  loading: boolean;
  action: string;
  message: string;
  onDismiss: () => void;
};

export function StatusBanner({ loading, action, message, onDismiss }: StatusBannerProps) {
  return (
    <>
      {loading && action && (
        <div className="loading">
          <div className="spinner" />
          {action}
        </div>
      )}

      {message && (
        <div
          className={`message ${
            message.startsWith("Error") || message.includes("failed") ? "error" : "success"
          }`}
        >
          {message}
          <button className="close-button" onClick={onDismiss}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
