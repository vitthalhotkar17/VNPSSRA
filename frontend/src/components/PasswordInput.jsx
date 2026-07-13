import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({
  label, value, onChange, placeholder, required, minLength,
  name, id, className = "", leftIcon, autoComplete = "current-password", ...props
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
            {leftIcon}
          </span>
        )}
        <input
          id={id} name={name} required={required} minLength={minLength}
          type={visible ? "text" : "password"}
          value={value} onChange={onChange} placeholder={placeholder}
          autoComplete={autoComplete}
          className={`input ${leftIcon ? "pl-10" : ""} pr-10 ${className}`.trim()}
          {...props}
        />
        <button type="button" onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: "var(--muted)" }}
          aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
