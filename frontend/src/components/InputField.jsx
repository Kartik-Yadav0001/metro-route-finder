import React from 'react';

export default function InputField({ label, value, onChange }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs outline-none text-white focus:border-orange-500/40"
      />
    </div>
  );
}
