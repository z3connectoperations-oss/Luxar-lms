import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "../lib/cn";

const field =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-faint outline-none transition-all duration-200 hover:border-gold-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200";

type Variant = "primary" | "outline" | "ghost" | "subtle" | "cta" | "danger";
type Size = "sm" | "md";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const variants: Record<Variant, string> = {
    primary: "bg-ink text-white hover:bg-gold-300 hover:text-ink",
    cta: "bg-gold-500 text-ink font-bold hover:bg-gold-300",
    outline: "bg-card text-ink border border-gold-300 hover:bg-gold-50 hover:border-gold-500",
    ghost: "bg-transparent text-muted hover:bg-gold-50 hover:text-ink",
    subtle: "bg-gold-50 text-gold-700 hover:bg-gold-200 ring-1 ring-gold-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<Size, string> = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-gold-300 hover:shadow-soft", className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-24", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, "appearance-none bg-no-repeat", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold text-muted">{children}</label>;
}

type Tone = "pink" | "yellow" | "blue" | "brand" | "neutral" | "success" | "warning" | "danger";
export function Chip({ children, tone = "brand" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    brand: "bg-gold-50 text-gold-700 ring-1 ring-gold-200",
    pink: "bg-gold-50 text-gold-700 ring-1 ring-gold-200",
    yellow: "bg-gold-100 text-gold-700 ring-1 ring-gold-200",
    blue: "bg-gold-50 text-gold-700 ring-1 ring-gold-200",
    neutral: "bg-white text-muted ring-1 ring-border",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}

/** Slim progress bar. */
export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-gold-100", className)}>
      <div className="h-full rounded-full bg-gold-500 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
