import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 구급대원 앱 한 화면: 남색 머리 + 내용 + 아래 고정 버튼 */
export function PhoneScreen({
  title,
  subtitle,
  children,
  footer,
  dim,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  dim?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background shadow-xl">
      <header className={cn("bg-primary px-5 pb-5 pt-4 text-primary-foreground", dim && "opacity-60")}>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm opacity-75">{subtitle}</p>}
      </header>
      <main className="flex-1 px-5 py-5">{children}</main>
      {footer && (
        <footer className="sticky bottom-0 border-t bg-card px-5 pb-6 pt-4">{footer}</footer>
      )}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 first:mt-0">
      <h2 className="text-base font-bold">{children}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs text-muted-foreground">{children}</span>;
}

type Tone = "wait" | "call" | "ok" | "neutral" | "danger";
const toneCls: Record<Tone, string> = {
  wait: "bg-warning-soft text-warning",
  call: "bg-accent-soft text-accent",
  ok: "bg-success-soft text-success",
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-destructive/10 text-destructive",
};
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-semibold", toneCls[tone])}>
      {children}
    </span>
  );
}

export function Notice({ tone, children }: { tone: "warn" | "ok" | "info"; children: ReactNode }) {
  const cls = {
    warn: "bg-warning-soft text-warning",
    ok: "bg-success-soft text-success",
    info: "bg-info-soft text-secondary-foreground",
  }[tone];
  return <div className={cn("rounded-lg px-4 py-3 text-sm font-semibold", cls)}>{children}</div>;
}

export function BigButton({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "success" | "danger" | "accent";
}) {
  const v = {
    primary: "bg-primary text-primary-foreground disabled:bg-muted-foreground/40",
    outline: "border bg-card text-foreground",
    success: "bg-success text-success-foreground",
    danger: "bg-destructive text-destructive-foreground",
    accent: "bg-accent text-accent-foreground",
  }[variant];
  return (
    <button
      className={cn(
        "flex h-13 w-full items-center justify-center gap-1.5 rounded-lg px-4 text-base font-bold transition active:scale-[0.98] disabled:cursor-not-allowed",
        v,
        className,
      )}
      {...props}
    />
  );
}
