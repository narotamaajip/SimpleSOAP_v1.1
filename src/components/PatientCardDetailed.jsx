import { Stethoscope, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';

export function PatientCardDetailed({ patient, onClick, id }) {
  const isPending = !patient.isFollowedUp && patient.status !== 'PULANG';
  const isDischarged = patient.status === 'PULANG';

  return (
    <div
      id={id}
      onClick={onClick}
      className={cn(
        'bg-white p-4 rounded-xl border shadow-sm border-l-[6px] active:scale-[0.99] transition-all cursor-pointer',
        isDischarged
          ? 'border-slate-400 opacity-80'
          : isPending
          ? 'border-rose-500'
          : 'border-emerald-500'
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-base font-black text-slate-800 leading-tight">{patient.name}</h4>
          <p className="text-[10px] font-mono text-slate-400 font-bold mt-1">Usia: {patient.age} thn</p>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white',
            isDischarged ? 'bg-slate-400' : isPending ? 'bg-rose-500' : 'bg-emerald-500'
          )}
        >
          {patient.status}
        </span>
      </div>
      <div className="pt-3 border-t border-slate-50 space-y-1.5">
        <div className="flex items-start gap-2">
          <Stethoscope size={12} className="text-slate-300 mt-0.5" />
          <p className="text-xs font-bold text-slate-600 line-clamp-1">{patient.dx}</p>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={12} className="text-slate-300 mt-0.5" />
          <p className="text-xs font-bold text-slate-600 line-clamp-1">{patient.ward}</p>
        </div>
      </div>
    </div>
  );
}
