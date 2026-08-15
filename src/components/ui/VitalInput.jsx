export function VitalInput({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-800 mb-1.5 block">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2.5 rounded-md border border-emerald-100 bg-white focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium placeholder:text-slate-300 transition-colors"
      />
    </div>
  );
}
