import { useMemo } from "react";

interface PasswordStrengthMeterProps {
  password: string;
}

const rules = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const passed = useMemo(() => rules.filter(r => r.test(password)).length, [password]);
  const strength = passed <= 1 ? "Weak" : passed <= 3 ? "Fair" : passed <= 4 ? "Good" : "Strong";
  const color = passed <= 1 ? "bg-destructive" : passed <= 3 ? "bg-warning" : passed <= 4 ? "bg-primary" : "bg-success";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passed ? color : "bg-muted"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">Strength: <span className="font-medium text-foreground">{strength}</span></span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {rules.map(r => (
          <div key={r.label} className="flex items-center gap-1 text-[10px]">
            <span className={r.test(password) ? "text-success" : "text-muted-foreground"}>{r.test(password) ? "✓" : "○"}</span>
            <span className={r.test(password) ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function isPasswordStrong(password: string): boolean {
  return rules.every(r => r.test(password));
}
