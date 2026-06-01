export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" key={toast.id}>
      <span className="toast-ico">{toast.icon || "✓"}</span>
      <span>{toast.msg}</span>
    </div>
  );
}
