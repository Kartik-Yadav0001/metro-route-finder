import React from 'react';

export default function MetricCard({ label, value }) {
  return (
    <div className="glass rounded-[24px] p-5 border border-white/5 bg-slate-950/20 backdrop-blur-xl flex flex-col justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="mt-2 text-2xl font-black tracking-tight text-white">{value}</span>
    </div>
  );
}
