"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  DISPOSITION_LABELS,
  STATUS_LABELS,
  type DispositionType,
  type TradeStatus,
} from "@/lib/types";

// ------------------------------------------------------------- badges
const STATUS_TONE: Record<TradeStatus, string> = {
  new: "border-line2 text-chalk bg-rail",
  waiting_mmr: "border-[#5A4A16] text-warn bg-[#1C1708]",
  waiting_appraisal: "border-[#5A4A16] text-warn bg-[#1C1708]",
  appraised: "border-golddim text-gold bg-goldwash",
  waiting_decision: "border-[#4A3A6A] text-[#B39CE0] bg-[#150F20]",
  completed: "border-[#1F4632] text-good bg-[#0B1A12]",
  archived: "border-line2 text-dim bg-[#0E0E0E]",
};

const DISPO_TONE: Record<DispositionType, string> = {
  pending: "border-line2 text-muted bg-rail",
  dealer_return: "border-[#4A3A6A] text-[#B39CE0] bg-[#150F20]",
  sold: "border-[#1F4632] text-good bg-[#0B1A12]",
  customer_keeping: "border-[#5A4A16] text-warn bg-[#1C1708]",
  lease_buyout: "border-golddim text-gold bg-goldwash",
  no_trade: "border-[#4A2320] text-bad bg-[#170C0B]",
  other: "border-line2 text-muted bg-rail",
};

export function StatusBadge({ status }: { status: TradeStatus }) {
  return <span className={`chip ${STATUS_TONE[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function DispositionBadge({ disposition }: { disposition: DispositionType }) {
  return (
    <span className={`chip ${DISPO_TONE[disposition]}`}>
      {DISPOSITION_LABELS[disposition]}
    </span>
  );
}

// --------------------------------------------------------- form parts
export function SubmitButton({
  children,
  className = "btn btn-gold",
  pendingLabel = "Saving",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xs border border-[#4A2320] bg-[#170C0B] px-3 py-2 text-[13px] text-bad"
    >
      {message}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint ? <p className="mt-1 text-[11.5px] text-dim">{hint}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------- copy
export function CopyButton({
  value,
  children,
  className = "btn btn-ghost btn-sm",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const el = document.createElement("textarea");
          el.value = value;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          el.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : children}
    </button>
  );
}

// ---------------------------------------------------------- slide over
export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="panel panel-ruled relative flex h-full w-full max-w-md flex-col overflow-y-auto shadow-lift sm:max-w-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-2xl tracking-wide text-chalk">{title}</h2>
            {subtitle ? <p className="text-[12.5px] text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-quiet btn-sm"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------ confirm button
export function ConfirmButton({
  onConfirm,
  prompt,
  children,
  className = "btn btn-danger btn-sm",
}: {
  onConfirm: () => void | Promise<void>;
  prompt: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        void onConfirm();
      }}
    >
      {armed ? prompt : children}
    </button>
  );
}
