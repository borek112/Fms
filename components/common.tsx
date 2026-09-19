import React, { useEffect, useRef, useState } from 'react';

export const fmtPLN = (v: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(v);
export const fmtNum = (v: number, d = 1) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
export const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function Card({ children, className = '', ...rest }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement> & { 'data-testid'?: string }) {
  return <div className={`rounded-xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm p-4 ${className}`} {...rest}>{children}</div>;
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        {sub && <p className="text-sm text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Kpi({ label, value, icon, tone = 'default', sub }: { label: string; value: string; icon?: string; tone?: 'default' | 'ok' | 'warn' | 'bad' | 'info'; sub?: string }) {
  const tones: Record<string, string> = { default: 'text-slate-100', ok: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400', info: 'text-sky-400' };
  return (
    <Card className="!p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1.5">{icon && <span>{icon}</span>}{label}</div>
      <div className={`text-xl md:text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </Card>
  );
}

export function Badge({ tone = 'info', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'muted'; children: React.ReactNode }) {
  const t: Record<string, string> = {
    ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    bad: 'bg-red-500/15 text-red-300 border-red-500/30',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    muted: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${t[tone]}`}>{children}</span>;
}

export function Btn({ children, onClick, variant = 'primary', className = '', type = 'button', disabled, ...rest }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'outline'; className?: string; type?: 'button' | 'submit'; disabled?: boolean } & { 'data-testid'?: string }) {
  const v: Record<string, string> = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    ghost: 'bg-slate-700/60 hover:bg-slate-600/60 text-slate-200',
    danger: 'bg-red-600/80 hover:bg-red-500 text-white',
    outline: 'border border-slate-600 hover:border-emerald-500 text-slate-200',
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} {...rest}
      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${v[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className={`bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60 sticky top-0 bg-slate-900 z-10">
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none px-1">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field_(label: string, node: React.ReactNode) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400 mb-1 block">{label}</span>
      {node}
    </label>
  );
}

export const inputCls = 'w-full bg-slate-800/70 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 placeholder:text-slate-500';

export function Input({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement> & { 'data-testid'?: string }) {
  return Field_(label, <input {...p} className={inputCls} />);
}

export function Select({ label, children, ...p }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement> & { 'data-testid'?: string }) {
  return Field_(label, <select {...p} className={inputCls}>{children}</select>);
}

export function Textarea({ label, ...p }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement> & { 'data-testid'?: string }) {
  return Field_(label, <textarea {...p} className={inputCls + ' min-h-[70px]'} />);
}

export function EmptyState({ icon = '📭', text, action }: { icon?: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-10 text-slate-400">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, text }: { open: boolean; onClose: () => void; onConfirm: () => void; text: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Potwierdzenie usunięcia">
      <p className="text-sm text-slate-300 mb-5">{text}</p>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Anuluj</Btn>
        <Btn variant="danger" onClick={() => { onConfirm(); onClose(); }}>Usuń</Btn>
      </div>
    </Modal>
  );
}

export function ProgressBar({ value, max, tone = 'ok' }: { value: number; max: number; tone?: 'ok' | 'warn' | 'bad' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const c = { ok: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500' }[tone];
  return (
    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
      <div className={`h-full ${c} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return ref;
}
