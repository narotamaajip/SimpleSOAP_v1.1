import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { GlassSelect } from '../components/ui/GlassSelect';
import { AmbientBackground } from '../components/ui/AmbientBackground';
import { cn } from '../utils/cn';

const SEX_OPTIONS = [
  { value: 'L', label: 'L (Pria)' },
  { value: 'P', label: 'P (Wanita)' }
];

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
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
      className="flex-1 flex flex-col h-full liquid-canvas overflow-hidden absolute inset-0 z-50"
    >
      <AmbientBackground />

      <div className="glass-bar px-4 py-3 flex items-center justify-between border-b sticky top-0 z-30">
        <button onClick={handleClose} className="text-slate-600 p-1.5 rounded-xl glass-btn-secondary">
          <X size={20} />
        </button>
        <h2 className="text-slate-800 font-extrabold text-sm tracking-tight uppercase">Edit Pasien</h2>
        <button
          onClick={handleSave}
          className="glass-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold"
        >
          Simpan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 z-10">
        <div className="space-y-3.5 glass-card p-5 rounded-3xl">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Pasien *</label>
            <input
              value={patientData.name}
              onChange={(e) => {
                setPatientData({ ...patientData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder="Nama Pasien"
              className={cn(
                'w-full mt-1 p-3 rounded-2xl glass-input text-sm font-semibold text-slate-800',
                errors.name && 'border-rose-400 bg-rose-50/40'
              )}
            />
            {errors.name && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.name}
              </p>
            )}
          </div>

          <div className="flex gap-2 items-start">
            <div className="w-[44%]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No RM</label>
              <input
                value={patientData.rm}
                onChange={(e) => setPatientData({ ...patientData, rm: e.target.value })}
                placeholder="No RM (opsional)"
                className="w-full mt-1 p-3 rounded-2xl glass-input text-sm font-semibold text-slate-800"
              />
            </div>
            <div className="w-[26%]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usia *</label>
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
                  'w-full mt-1 p-3 rounded-2xl glass-input text-sm font-semibold text-slate-800',
                  errors.age && 'border-rose-400 bg-rose-50/40'
                )}
              />
              {errors.age && (
                <p className="text-[10px] font-bold text-rose-600 mt-1 leading-tight">{errors.age}</p>
              )}
            </div>
            <div className="w-[30%]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kelamin</label>
              <div className="mt-1">
                <GlassSelect
                  value={patientData.sex}
                  onChange={(val) => setPatientData({ ...patientData, sex: val })}
                  options={SEX_OPTIONS}
                  buttonClassName="py-3 rounded-2xl text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bangsal / Ruangan *</label>
            <input
              value={patientData.ward}
              onChange={(e) => {
                setPatientData({ ...patientData, ward: e.target.value });
                if (errors.ward) setErrors({ ...errors, ward: '' });
              }}
              placeholder="Bangsal / Ruangan"
              className={cn(
                'w-full mt-1 p-3 rounded-2xl glass-input text-sm font-semibold text-slate-800',
                errors.ward && 'border-rose-400 bg-rose-50/40'
              )}
            />
            {errors.ward && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.ward}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">DPJP *</label>
            <input
              value={patientData.dpjp}
              onChange={(e) => {
                setPatientData({ ...patientData, dpjp: e.target.value });
                if (errors.dpjp) setErrors({ ...errors, dpjp: '' });
              }}
              placeholder="DPJP"
              className={cn(
                'w-full mt-1 p-3 rounded-2xl glass-input text-sm font-semibold text-slate-800',
                errors.dpjp && 'border-rose-400 bg-rose-50/40'
              )}
            />
            {errors.dpjp && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.dpjp}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Diagnosis Utama *</label>
            <input
              value={patientData.dx}
              onChange={(e) => {
                setPatientData({ ...patientData, dx: e.target.value });
                if (errors.dx) setErrors({ ...errors, dx: '' });
              }}
              placeholder="Diagnosis Utama"
              className={cn(
                'w-full mt-1 p-3 rounded-2xl glass-input text-sm font-semibold text-slate-800',
                errors.dx && 'border-rose-400 bg-rose-50/40'
              )}
            />
            {errors.dx && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.dx}
              </p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alergi Obat</label>
            <input
              value={patientData.alergi}
              onChange={(e) => setPatientData({ ...patientData, alergi: e.target.value })}
              placeholder="Alergi Obat (opsional)"
              className="w-full mt-1 p-3 rounded-2xl glass-input text-sm font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
