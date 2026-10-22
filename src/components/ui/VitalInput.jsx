export function VitalInput({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 rounded-xl glass-input text-sm font-semibold text-slate-800 placeholder:text-slate-400/80"
      />
    </div>
  );
}
