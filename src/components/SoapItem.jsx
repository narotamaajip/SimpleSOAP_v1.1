export function SoapItem({ label, content, list }) {
  const safeContent = content || '-';

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100/50">
        {list ? (
          <ul className="space-y-1">
            {safeContent.split('\n').map((line, i) => (
              <li key={i} className="text-xs font-bold text-slate-700 flex gap-2">
                <span className="text-emerald-500">•</span>
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs font-bold text-slate-700 leading-relaxed">{safeContent}</p>
        )}
      </div>
    </div>
  );
}
