import { Stethoscope, MapPin, User } from 'lucide-react';
import { cn } from '../utils/cn';

export function PatientCardCompact({ patient, onClick }) {
  const isPending = !patient.isFollowedUp && patient.status !== 'PULANG';
  const isDischarged = patient.status === 'PULANG';

  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card-interactive p-4 pl-5 rounded-2xl cursor-pointer relative overflow-hidden',
        isDischarged && 'opacity-80'
      )}
    >
      {/* Full-height solid accent strip flush along the entire left edge */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[5px]',
          isDischarged
            ? 'bg-slate-400'
            : isPending
            ? 'bg-[#EF4444]'
            : 'bg-[#10B981]'
        )}
      />

      <div className="flex justify-between items-start gap-2 mb-2.5">
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-extrabold text-slate-800 leading-tight truncate">
            {patient.name}
          </h4>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500 mt-0.5">
            <span>Usia: {patient.age} thn</span>
            {patient.rm && (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-mono">RM: {patient.rm}</span>
              </>
            )}
          </div>
        </div>

        <span
          className={cn(
            'px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm shrink-0',
            isDischarged
              ? 'bg-slate-400'
              : isPending
              ? 'bg-[#EF4444] shadow-red-500/20'
              : 'bg-[#10B981] shadow-emerald-500/20'
          )}
        >
          {patient.status}
        </span>
      </div>

      <div className="pt-2.5 border-t border-slate-200/50 space-y-1.5">
        <div className="flex items-start gap-2">
          <Stethoscope size={13} className="text-teal-600/80 mt-0.5 shrink-0" />
          <p className="text-xs font-semibold text-slate-600 line-clamp-1">
            {patient.dx || '-'}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs font-semibold text-slate-500 line-clamp-1">
            {patient.ward || '-'}
          </p>
        </div>
        {patient.lastSoapDoctor && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 pt-0.5 border-t border-slate-100">
            <User size={12} className="text-teal-600/80 shrink-0" />
            <span className="truncate">
              FU Terakhir: <strong className="text-slate-700">{patient.lastSoapDoctor}</strong>
              {patient.lastSoapDate ? ` (${patient.lastSoapDate})` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
