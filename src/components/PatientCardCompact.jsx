import { cn } from '../utils/cn';

export function PatientCardCompact({ patient, onClick }) {
  const isPending = !patient.isFollowedUp && patient.status !== 'PULANG';
  const isDischarged = patient.status === 'PULANG';

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white p-4 rounded-lg border border-slate-100 border-l-4 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform cursor-pointer',
        isDischarged
          ? 'border-l-slate-400 opacity-75'
          : isPending
          ? 'border-l-rose-500'
          : 'border-l-emerald-500'
      )}
    >
      <div>
        <h4 className="font-bold text-slate-800">{patient.name}</h4>
        <p className="text-[10px] font-bold text-slate-400 mt-0.5">Usia: {patient.age} thn</p>
      </div>
      <div
        className={cn(
          'text-white px-2 py-1 rounded text-[8px] font-black uppercase',
          isDischarged ? 'bg-slate-400' : isPending ? 'bg-rose-500' : 'bg-emerald-500'
        )}
      >
        {patient.status}
      </div>
    </div>
  );
}
