const SECTION_BADGES = {
  'SUBJECTIVE (S)': { code: 'S', title: 'Subjective' },
  'OBJECTIVE (O)': { code: 'O', title: 'Objective' },
  'ASSESSMENT (A)': { code: 'A', title: 'Assessment' },
  'PLAN (P)': { code: 'P', title: 'Plan' },
  'INSTRUCTION (I)': { code: 'I', title: 'Instruction' }
};

export function SoapItem({ label, content, list }) {
  const safeContent = content || '-';
  const badge = SECTION_BADGES[label] || { code: '', title: label };

  return (
    <div className="bg-white/75 backdrop-blur-md p-3.5 rounded-2xl border border-white/95 shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_14px_-3px_rgba(15,23,42,0.05)] space-y-2">
      <div className="flex items-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide bg-teal-500/12 text-teal-800 border border-teal-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          {badge.code ? (
            <>
              <span className="text-teal-700 font-black">{badge.code}</span>
              <span className="text-teal-600/50">—</span>
              <span>{badge.title}</span>
            </>
          ) : (
            <span>{label}</span>
          )}
        </span>
      </div>

      <div className="pl-0.5">
        {list ? (
          <ul className="space-y-1.5">
            {safeContent.split('\n').map((line, i) => (
              <li key={i} className="text-xs font-semibold text-slate-700 flex gap-2 leading-relaxed">
                <span className="text-teal-600 font-bold">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
            {safeContent}
          </p>
        )}
      </div>
    </div>
  );
}
