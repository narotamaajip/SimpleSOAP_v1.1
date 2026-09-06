import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export function EditPatientProfileForm({ patient, onBack, onSave }) {
  const [patientData, setPatientData] = useState({
    name: patient.name || '',
    rm: patient.rm || '',
    age: String(patient.age ?? ''),
    sex: patient.sex || 'L',
    ward: patient.ward || '',
    dpjp: patient.dpjp || '',
    dx: patient.dx || '',
    alergi: patient.alergi || ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!patientData.name.trim()) {
      newErrors.name = 'Nama pasien wajib diisi.';
    }
    if (!patientData.ward.trim()) {
      newErrors.ward = 'Bangsal / ruangan wajib diisi.';
    }
    if (!patientData.dpjp.trim()) {
      newErrors.dpjp = 'DPJP wajib diisi.';
    }
    if (!patientData.dx.trim()) {
      newErrors.dx = 'Diagnosis utama wajib diisi.';
    }

    const trimmedAge = String(patientData.age || '').trim();
    if (!trimmedAge) {
      newErrors.age = 'Usia wajib diisi.';
    } else {
      const ageNum = Number(trimmedAge);
      if (isNaN(ageNum) || !/^\d+$/.test(trimmedAge) || ageNum < 0 || ageNum > 130) {
        newErrors.age = 'Usia harus 0-130 thn.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: patientData.name.trim(),
      rm: patientData.rm.trim(),
      age: patientData.age.trim(),
      sex: patientData.sex,
      ward: patientData.ward.trim(),
      dpjp: patientData.dpjp.trim(),
      dx: patientData.dx.trim(),
      alergi: patientData.alergi.trim() || 'Tidak ada'
    });
  };

  const isDirty = () => {
    return (
      patientData.name !== (patient.name || '') ||
      patientData.rm !== (patient.rm || '') ||
      patientData.age !== String(patient.age ?? '') ||
      patientData.sex !== (patient.sex || 'L') ||
      patientData.ward !== (patient.ward || '') ||
      patientData.dpjp !== (patient.dpjp || '') ||
      patientData.dx !== (patient.dx || '') ||
      patientData.alergi !== (patient.alergi || '')
    );
  };

  const handleClose = () => {
    if (isDirty()) {
      if (window.confirm('Ada perubahan profil yang belum disimpan. Yakin ingin keluar?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex-1 flex flex-col h-full bg-[#f9fcf9] overflow-hidden absolute inset-0 z-50"
    >
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <button onClick={handleClose} className="text-slate-400 p-1 rounded-full hover:bg-slate-50">
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
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Pasien *</label>
            <input
              value={patientData.name}
              onChange={(e) => {
                setPatientData({ ...patientData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder="Nama Pasien"
              className={cn(
                'w-full mt-1 p-3 rounded-lg border text-sm font-medium bg-slate-50 focus:bg-white outline-none transition-colors',
                errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-emerald-500'
              )}
            />
            {errors.name && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.name}
              </p>
            )}
          </div>

          <div className="flex gap-2 items-start">
            <div className="w-1/2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">No RM</label>
              <input
                value={patientData.rm}
                onChange={(e) => setPatientData({ ...patientData, rm: e.target.value })}
                placeholder="No RM (opsional)"
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
            <div className="w-1/4">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Usia *</label>
              <input
                value={patientData.age}
                onChange={(e) => {
                  setPatientData({ ...patientData, age: e.target.value });
                  if (errors.age) setErrors({ ...errors, age: '' });
                }}
                type="text"
                inputMode="numeric"
                placeholder="Usia"
                className={cn(
                  'w-full mt-1 p-3 rounded-lg border text-sm font-medium bg-slate-50 focus:bg-white outline-none transition-colors',
                  errors.age ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-emerald-500'
                )}
              />
              {errors.age && (
                <p className="text-[10px] font-bold text-rose-600 mt-1 leading-tight">{errors.age}</p>
              )}
            </div>
            <div className="w-1/4">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Kelamin</label>
              <select
                value={patientData.sex}
                onChange={(e) => setPatientData({ ...patientData, sex: e.target.value })}
                className="w-full mt-1 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
              >
                <option value="L">L</option>
                <option value="P">P</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Bangsal / Ruangan *</label>
            <input
              value={patientData.ward}
              onChange={(e) => {
                setPatientData({ ...patientData, ward: e.target.value });
                if (errors.ward) setErrors({ ...errors, ward: '' });
              }}
              placeholder="Bangsal / Ruangan"
              className={cn(
                'w-full mt-1 p-3 rounded-lg border text-sm font-medium bg-slate-50 focus:bg-white outline-none transition-colors',
                errors.ward ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-emerald-500'
              )}
            />
            {errors.ward && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.ward}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">DPJP *</label>
            <input
              value={patientData.dpjp}
              onChange={(e) => {
                setPatientData({ ...patientData, dpjp: e.target.value });
                if (errors.dpjp) setErrors({ ...errors, dpjp: '' });
              }}
              placeholder="DPJP"
              className={cn(
                'w-full mt-1 p-3 rounded-lg border text-sm font-medium bg-slate-50 focus:bg-white outline-none transition-colors',
                errors.dpjp ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-emerald-500'
              )}
            />
            {errors.dpjp && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.dpjp}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Diagnosis Utama *</label>
            <input
              value={patientData.dx}
              onChange={(e) => {
                setPatientData({ ...patientData, dx: e.target.value });
                if (errors.dx) setErrors({ ...errors, dx: '' });
              }}
              placeholder="Diagnosis Utama"
              className={cn(
                'w-full mt-1 p-3 rounded-lg border text-sm font-medium bg-slate-50 focus:bg-white outline-none transition-colors',
                errors.dx ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-emerald-500'
              )}
            />
            {errors.dx && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.dx}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Alergi Obat</label>
            <input
              value={patientData.alergi}
              onChange={(e) => setPatientData({ ...patientData, alergi: e.target.value })}
              placeholder="Alergi Obat (opsional)"
              className="w-full mt-1 p-3 rounded-lg border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
