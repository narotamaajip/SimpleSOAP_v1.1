import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export function EditPatientProfileForm({ patient, onBack, onSave }) {
  // Only keep editable fields – do NOT spread internal Firestore/runtime fields
  const [patientData, setPatientData] = useState({
    name: patient.name || '',
    rm: patient.rm || '',
    age: patient.age || '',
    sex: patient.sex || 'L',
    ward: patient.ward || '',
    dpjp: patient.dpjp || '',
    dx: patient.dx || '',
    alergi: patient.alergi || ''
  });

  const handleSave = () => {
    onSave(patientData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex-1 flex flex-col h-full bg-[#f9fcf9] overflow-hidden absolute inset-0 z-50"
    >
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="text-slate-400 p-1 rounded-full hover:bg-slate-50">
          <X size={24} />
        </button>
        <h2 className="text-emerald-800 font-black text-sm tracking-tight uppercase">Edit Pasien</h2>
        <button
          onClick={handleSave}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
        >
          Simpan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <input
            required value={patientData.name}
            onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
            placeholder="Nama Pasien"
            className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
          />
          <div className="flex gap-2">
            <input
              value={patientData.rm}
              onChange={(e) => setPatientData({ ...patientData, rm: e.target.value })}
              placeholder="No RM (opsional)"
              className="w-1/2 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
            <input
              required value={patientData.age}
              onChange={(e) => setPatientData({ ...patientData, age: e.target.value })}
              type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Usia"
              className="w-1/4 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
            <select
              value={patientData.sex}
              onChange={(e) => setPatientData({ ...patientData, sex: e.target.value })}
              className="w-1/4 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            >
              <option value="L">L</option>
              <option value="P">P</option>
            </select>
          </div>
          <input
            required value={patientData.ward}
            onChange={(e) => setPatientData({ ...patientData, ward: e.target.value })}
            placeholder="Bangsal / Ruangan"
            className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
          />
          <input
            required value={patientData.dpjp}
            onChange={(e) => setPatientData({ ...patientData, dpjp: e.target.value })}
            placeholder="DPJP"
            className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
          />
          <input
            required value={patientData.dx}
            onChange={(e) => setPatientData({ ...patientData, dx: e.target.value })}
            placeholder="Diagnosis Utama"
            className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
          />
          <input
            value={patientData.alergi}
            onChange={(e) => setPatientData({ ...patientData, alergi: e.target.value })}
            placeholder="Alergi Obat (opsional)"
            className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
          />
        </div>
      </div>
    </motion.div>
  );
}
