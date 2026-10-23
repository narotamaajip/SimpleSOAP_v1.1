import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { AccordionSection } from '../components/ui/AccordionSection';
import { VitalInput } from '../components/ui/VitalInput';
import { GlassSelect } from '../components/ui/GlassSelect';
import { AmbientBackground } from '../components/ui/AmbientBackground';
import { useDialog } from '../context/DialogContext';
import { cn } from '../utils/cn';

const SOAP_TEMPLATES = {
  stabil: {
    s: 'Keluhan (-), mobilitas baik. Pasien merasa nyaman.',
    a: 'Kondisi klinis stabil, progres baik.',
    p: 'Lanjutkan terapi saat ini.\nMonitoring tanda vital tiap shift.\nRencana BLPL (boleh pulang) jika stabil 24 jam.'
  },
  membaik: {
    s: 'Keluhan utama berkurang signifikan. Nafsu makan mulai membaik.',
    a: 'Evolusi perbaikan klinis.',
    p: 'Tappering off obat IV ke oral.\nMobilisasi bertahap.\nDiet bebas.'
  },
  sesak: {
    s: 'Sesak napas bertambah terutama saat posisi berbaring.',
    a: 'Eksaserbasi sesak, curiga kongesti.',
    p: 'O2 nasal kanul 3 lpm.\nFurosemide 1 ampul extra IV.\nEvaluasi produksi urin dan Ro Thorax.'
  }
};

const SEX_OPTIONS = [
  { value: 'L', label: 'L (Pria)' },
  { value: 'P', label: 'P (Wanita)' }
];

export function NewPatientSoapForm({ onBack, onSave, isTourActive, defaultDpjp }) {
  const { confirm } = useDialog();
  const [activeSection, setActiveSection] = useState('data');
  const [patientData, setPatientData] = useState(() => {
    if (isTourActive) {
      return {
        name: 'Pasien Contoh',
        rm: 'RM-001',
        ward: 'Bangsal Contoh',
        age: '45',
        sex: 'L',
        dpjp: defaultDpjp || 'dr. Tester',
        dx: 'Data contoh — boleh dihapus',
        alergi: 'Tidak ada'
      };
    }
    return {
      name: '', rm: '', ward: '', age: '', sex: 'L', dpjp: defaultDpjp || '', dx: '', alergi: ''
    };
  });

  const [errors, setErrors] = useState({});
  const [isDischarged, setIsDischarged] = useState(false);
  const [soap, setSoap] = useState({
    s: '',
    vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
    o: '', a: '', p: '', i: ''
  });

  const validate = () => {
    const newErrors = {};
    if (!patientData.name.trim()) {
      newErrors.name = 'Nama pasien wajib diisi.';
    }
    if (!patientData.ward.trim()) {
      newErrors.ward = 'Bangsal / ruangan wajib diisi.';
    }
    if (!patientData.dpjp.trim()) {
      newErrors.dpjp = 'Nama DPJP wajib diisi.';
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
    if (Object.keys(newErrors).length > 0) {
      setActiveSection('data');
      return false;
    }
    return true;
  };

  const applyTemplate = (type) => {
    const t = SOAP_TEMPLATES[type];
    if (t) {
      setSoap((prev) => ({ ...prev, s: t.s, a: t.a, p: t.p }));
      setActiveSection('o');
    }
  };

  const buildFormattedO = () => {
    const { td, nadi, rr, suhu, spo2, bb } = soap.vitals;
    const vitalsStr = [
      td && `TD ${td} mmHg`,
      nadi && `HR ${nadi} x/m`,
      rr && `RR ${rr} x/m`,
      suhu && `T ${suhu} °C`,
      spo2 && `SpO2 ${spo2}%`,
      bb && `BB ${bb} kg`
    ]
      .filter(Boolean)
      .join(', ');

    let formattedO = '';
    if (vitalsStr) formattedO += vitalsStr + '.\n';
    if (soap.o) formattedO += soap.o;
    return formattedO;
  };

  const handleSave = () => {
    if (!validate()) return;

    const formattedO = buildFormattedO();
    const initialSoap =
      soap.s || formattedO || soap.a || soap.p || soap.i || isDischarged
        ? {
            s: soap.s.trim() || '-',
            o: formattedO.trim() || '-',
            rawO: soap.o.trim(),
            a: soap.a.trim() || '-',
            p: soap.p.trim() || '-',
            i: soap.i.trim() || '-',
            vitals: soap.vitals,
            isDischarged
          }
        : null;

    onSave(
      {
        name: patientData.name.trim(),
        rm: patientData.rm.trim(),
        ward: patientData.ward.trim(),
        age: patientData.age.trim(),
        sex: patientData.sex,
        dpjp: patientData.dpjp.trim(),
        dx: patientData.dx.trim(),
        alergi: patientData.alergi.trim() || 'Tidak ada'
      },
      initialSoap
    );
  };

  const handleSaveOnly = () => {
    if (!validate()) return;
    onSave(
      {
        name: patientData.name.trim(),
        rm: patientData.rm.trim(),
        ward: patientData.ward.trim(),
        age: patientData.age.trim(),
        sex: patientData.sex,
        dpjp: patientData.dpjp.trim(),
        dx: patientData.dx.trim(),
        alergi: patientData.alergi.trim() || 'Tidak ada'
      },
      null
    );
  };

  const isDirty = () => {
    if (isTourActive) return false;
    return (
      patientData.name.trim() !== '' ||
      patientData.ward.trim() !== '' ||
      patientData.dx.trim() !== '' ||
      soap.s.trim() !== '' ||
      soap.o.trim() !== '' ||
      soap.a.trim() !== '' ||
      Object.values(soap.vitals).some((v) => (v || '').trim() !== '')
    );
  };

  const handleClose = async () => {
    if (isDirty()) {
      const ok = await confirm({
        title: 'Tutup Form Pasien?',
        message: 'Ada data pasien yang belum disimpan. Yakin ingin menutup form?',
        confirmText: 'Tutup Form',
        cancelText: 'Lanjut Mengisi',
        variant: 'warning'
      });
      if (ok) {
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
      className="absolute inset-0 z-50 flex flex-col w-full h-full liquid-canvas overflow-hidden"
    >
      <AmbientBackground />

      {/* Header */}
      <div className="glass-bar px-4 py-3 flex items-center justify-between border-b sticky top-0 z-30">
        <button onClick={handleClose} className="text-slate-600 p-1.5 rounded-xl glass-btn-secondary">
          <X size={20} />
        </button>
        <h2 className="text-slate-800 font-extrabold text-sm tracking-tight uppercase">Pasien Baru</h2>
        <button
          id="tour-save-patient-btn-header"
          onClick={handleSave}
          className="glass-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold"
        >
          Simpan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 z-10">
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Entry Pasien &amp; SOAP</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Isi data pasien dan follow-up awal</p>
        </div>

        <div className="px-4 space-y-3 pb-8">
          {/* Data Pasien Accordion */}
          <AccordionSection
            id="data"
            title="Data Pasien"
            isActive={activeSection === 'data'}
            onClick={() => setActiveSection(activeSection === 'data' ? null : 'data')}
          >
            <div className="space-y-3">
              <div>
                <input
                  value={patientData.name}
                  onChange={(e) => {
                    setPatientData({ ...patientData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  placeholder="Nama Pasien *"
                  className={cn(
                    'w-full p-3 rounded-2xl glass-input text-sm font-medium text-slate-800',
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
                  <input
                    value={patientData.rm}
                    onChange={(e) => setPatientData({ ...patientData, rm: e.target.value })}
                    placeholder="No RM (opsional)"
                    className="w-full p-3 rounded-2xl glass-input text-sm font-medium text-slate-800"
                  />
                </div>
                <div className="w-[26%]">
                  <input
                    value={patientData.age}
                    onChange={(e) => {
                      setPatientData({ ...patientData, age: e.target.value });
                      if (errors.age) setErrors({ ...errors, age: '' });
                    }}
                    type="text"
                    inputMode="numeric"
                    placeholder="Usia *"
                    className={cn(
                      'w-full p-3 rounded-2xl glass-input text-sm font-medium text-slate-800',
                      errors.age && 'border-rose-400 bg-rose-50/40'
                    )}
                  />
                  {errors.age && (
                    <p className="text-[10px] font-bold text-rose-600 mt-1 leading-tight">{errors.age}</p>
                  )}
                </div>
                <div className="w-[30%]">
                  <GlassSelect
                    value={patientData.sex}
                    onChange={(val) => setPatientData({ ...patientData, sex: val })}
                    options={SEX_OPTIONS}
                    buttonClassName="py-3 rounded-2xl text-sm"
                  />
                </div>
              </div>

              <div>
                <input
                  value={patientData.ward}
                  onChange={(e) => {
                    setPatientData({ ...patientData, ward: e.target.value });
                    if (errors.ward) setErrors({ ...errors, ward: '' });
                  }}
                  placeholder="Bangsal / Ruangan *"
                  className={cn(
                    'w-full p-3 rounded-2xl glass-input text-sm font-medium text-slate-800',
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
                <input
                  value={patientData.dpjp}
                  onChange={(e) => {
                    setPatientData({ ...patientData, dpjp: e.target.value });
                    if (errors.dpjp) setErrors({ ...errors, dpjp: '' });
                  }}
                  placeholder="DPJP *"
                  className={cn(
                    'w-full p-3 rounded-2xl glass-input text-sm font-medium text-slate-800',
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
                <input
                  value={patientData.dx}
                  onChange={(e) => {
                    setPatientData({ ...patientData, dx: e.target.value });
                    if (errors.dx) setErrors({ ...errors, dx: '' });
                  }}
                  placeholder="Diagnosis Utama *"
                  className={cn(
                    'w-full p-3 rounded-2xl glass-input text-sm font-medium text-slate-800',
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
                <input
                  value={patientData.alergi}
                  onChange={(e) => setPatientData({ ...patientData, alergi: e.target.value })}
                  placeholder="Alergi Obat (opsional)"
                  className="w-full p-3 rounded-2xl glass-input text-sm font-medium text-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveOnly}
                className="w-full py-2.5 glass-btn-secondary text-slate-800 font-bold rounded-2xl mt-2 text-xs"
              >
                Simpan Data Pasien Saja
              </button>
            </div>
          </AccordionSection>

          {/* Template Cepat */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              TEMPLATE CEPAT SOAP
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button type="button" onClick={() => applyTemplate('stabil')} className="px-3.5 py-2 rounded-2xl glass-btn-secondary text-slate-700 text-xs font-semibold whitespace-nowrap">Pasien Stabil</button>
              <button type="button" onClick={() => applyTemplate('membaik')} className="px-3.5 py-2 rounded-2xl glass-btn-secondary text-slate-700 text-xs font-semibold whitespace-nowrap">Pasien Membaik</button>
              <button type="button" onClick={() => applyTemplate('sesak')} className="px-3.5 py-2 rounded-2xl glass-btn-secondary text-slate-700 text-xs font-semibold whitespace-nowrap">Pasien Sesak</button>
            </div>
          </div>

          <AccordionSection id="s" title="(S) Subjective" isActive={activeSection === 's'} onClick={() => setActiveSection(activeSection === 's' ? null : 's')}>
            <textarea className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800" rows={4} placeholder="Catatan keluhan tambahan pasien..." value={soap.s} onChange={(e) => setSoap({ ...soap, s: e.target.value })} />
          </AccordionSection>

          <AccordionSection id="o" title="(O) Objective" isActive={activeSection === 'o'} onClick={() => setActiveSection(activeSection === 'o' ? null : 'o')}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <VitalInput label="TD (mmHg)" placeholder="120/80" value={soap.vitals.td} onChange={(v) => setSoap({ ...soap, vitals: { ...soap.vitals, td: v } })} />
                <VitalInput label="Nadi (x/m)" placeholder="80" value={soap.vitals.nadi} onChange={(v) => setSoap({ ...soap, vitals: { ...soap.vitals, nadi: v } })} />
                <VitalInput label="RR (x/m)" placeholder="20" value={soap.vitals.rr} onChange={(v) => setSoap({ ...soap, vitals: { ...soap.vitals, rr: v } })} />
                <VitalInput label="Suhu (°C)" placeholder="36.5" value={soap.vitals.suhu} onChange={(v) => setSoap({ ...soap, vitals: { ...soap.vitals, suhu: v } })} />
                <VitalInput label="SpO2 (%)" placeholder="98" value={soap.vitals.spo2} onChange={(v) => setSoap({ ...soap, vitals: { ...soap.vitals, spo2: v } })} />
                <VitalInput label="BB (kg)" placeholder="65.0" value={soap.vitals.bb} onChange={(v) => setSoap({ ...soap, vitals: { ...soap.vitals, bb: v } })} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Pemeriksaan Fisik / Penunjang</p>
                <textarea className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800" rows={4} placeholder="Catatan pemeriksaan fisik dan hasil lab/radiologi..." value={soap.o} onChange={(e) => setSoap({ ...soap, o: e.target.value })} />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection id="a" title="(A) Assessment" isActive={activeSection === 'a'} onClick={() => setActiveSection(activeSection === 'a' ? null : 'a')}>
            <textarea className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800" rows={4} placeholder="Diagnosis atau masalah klinis saat ini..." value={soap.a} onChange={(e) => setSoap({ ...soap, a: e.target.value })} />
          </AccordionSection>

          <AccordionSection id="p" title="(P) Plan" isActive={activeSection === 'p'} onClick={() => setActiveSection(activeSection === 'p' ? null : 'p')}>
            <textarea className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800" rows={4} placeholder="Rencana tatalaksana, terapi, dan edukasi..." value={soap.p} onChange={(e) => setSoap({ ...soap, p: e.target.value })} />
          </AccordionSection>

          <AccordionSection id="i" title="(I) Instruction" isActive={activeSection === 'i'} onClick={() => setActiveSection(activeSection === 'i' ? null : 'i')}>
            <textarea className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800" rows={4} placeholder="Instruksi spesifik kepada pasien/perawat..." value={soap.i} onChange={(e) => setSoap({ ...soap, i: e.target.value })} />
          </AccordionSection>

          {/* BLPL Checkbox */}
          <div className="flex items-center gap-3 glass-card p-4 rounded-2xl">
            <input type="checkbox" id="blpl_new" checked={isDischarged} onChange={(e) => setIsDischarged(e.target.checked)} className="w-5 h-5 text-cyan-700 rounded-md border-slate-300 focus:ring-cyan-600 cursor-pointer" />
            <label htmlFor="blpl_new" className="text-sm font-bold text-slate-800 cursor-pointer select-none">Tandai Pasien Boleh Pulang (BLPL)</label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 pb-20 space-y-3">
            <button
              id="tour-save-patient-btn"
              onClick={handleSave}
              className="w-full py-4 glass-btn-primary rounded-2xl font-bold text-sm"
            >
              Simpan Pasien &amp; SOAP
            </button>
            <button onClick={onBack} className="w-full py-4 glass-btn-secondary rounded-2xl text-slate-700 font-bold text-sm">
              Kembali
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
