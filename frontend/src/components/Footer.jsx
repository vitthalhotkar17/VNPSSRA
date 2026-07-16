export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      className="px-6 py-3 text-center text-xs" style2={{ color: "var(--muted)" }}>
      <span style={{ color: "var(--muted)" }}>
        © {new Date().getFullYear()} Vision Tracker — Smart Attendance Management System v3.0
      </span>
    </footer>
  );
}
