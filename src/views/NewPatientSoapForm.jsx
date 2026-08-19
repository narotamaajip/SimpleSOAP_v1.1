import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import { AccordionSection } from '../components/ui/AccordionSection';
import { VitalInput } from '../components/ui/VitalInput';
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

export function NewPatientSoapForm({ onBack, onSave, isTourActive, defaultDpjp }) {
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
            s: soap.s || '-',
            o: formattedO || '-',
            a: soap.a || '-',
            p: soap.p || '-',
            i: soap.i || '-',
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex-1 flex flex-col h-full bg-[#f9fcf9] overflow-hidden absolute inset-0 z-50"
    >
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="text-slate-400 p-1 rounded-full hover:bg-slate-50">
          <X size={24} />
        </button>
        <h2 className="text-emerald-800 font-black text-sm tracking-tight uppercase">Pasien Baru</h2>
        <button
          id="tour-save-patient-btn-header"
          onClick={handleSave}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
        >
          Simpan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-2xl font-black text-slate-800">Entry Pasien &amp; SOAP</h1>
          <p className="text-xs font-bold text-slate-500 mt-1">Isi data pasien dan follow-up awal</p>
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
                    'w-full p-3 rounded-lg border text-sm font-medium bg-white outline-none transition-colors',
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
                  <input
                    value={patientData.rm}
                    onChange={(e) => setPatientData({ ...patientData, rm: e.target.value })}
                    placeholder="No RM (opsional)"
                    className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="w-1/4">
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
                      'w-full p-3 rounded-lg border text-sm font-medium bg-white outline-none transition-colors',
                      errors.age ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-emerald-500'
                    )}
                  />
                  {errors.age && (
                    <p className="text-[10px] font-bold text-rose-600 mt-1 leading-tight">{errors.age}</p>
                  )}
                </div>
                <div className="w-1/4">
                  <select
                    value={patientData.sex}
                    onChange={(e) => setPatientData({ ...patientData, sex: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white outline-none focus:border-emerald-500"
                  >
                    <option value="L">L</option>
                    <option value="P">P</option>
                  </select>
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
                    'w-full p-3 rounded-lg border text-sm font-medium bg-white outline-none transition-colors',
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
                <input
                  value={patientData.dpjp}
                  onChange={(e) => {
                    setPatientData({ ...patientData, dpjp: e.target.value });
                    if (errors.dpjp) setErrors({ ...errors, dpjp: '' });
                  }}
                  placeholder="DPJP *"
                  className={cn(
                    'w-full p-3 rounded-lg border text-sm font-medium bg-white outline-none transition-colors',
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
                <input
                  value={patientData.dx}
                  onChange={(e) => {
                    setPatientData({ ...patientData, dx: e.target.value });
                    if (errors.dx) setErrors({ ...errors, dx: '' });
                  }}
                  placeholder="Diagnosis Utama *"
                  className={cn(
                    'w-full p-3 rounded-lg border text-sm font-medium bg-white outline-none transition-colors',
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
                <input
                  value={patientData.alergi}
                  onChange={(e) => setPatientData({ ...patientData, alergi: e.target.value })}
                  placeholder="Alergi Obat (opsional)"
                  className="w-full p-3 rounded-lg border border-slate-200 text-sm font-medium bg-white outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleSaveOnly}
                className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-lg mt-2 text-xs shadow-sm active:scale-[0.98] transition-transform"
              >
                Simpan Data Pasien Saja
              </button>
            </div>
          </AccordionSection>

          {/* Template Cepat */}
          <div className="pt-2">
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">TEMPLATE CEPAT SOAP</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button onClick={() => applyTemplate('stabil')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Stabil</button>
              <button onClick={() => applyTemplate('membaik')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Membaik</button>
              <button onClick={() => applyTemplate('sesak')} className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm">Pasien Sesak</button>
            </div>
          </div>

          <AccordionSection id="s" title="(S) Subjective" isActive={activeSection === 's'} onClick={() => setActiveSection(activeSection === 's' ? null : 's')}>
            <textarea className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white" rows={4} placeholder="Catatan keluhan tambahan pasien..." value={soap.s} onChange={(e) => setSoap({ ...soap, s: e.target.value })} />
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
                <p className="text-[10px] font-bold text-slate-800 mb-1.5">Pemeriksaan Fisik / Penunjang</p>
                <textarea className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white" rows={4} placeholder="Catatan pemeriksaan fisik dan hasil lab/radiologi..." value={soap.o} onChange={(e) => setSoap({ ...soap, o: e.target.value })} />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection id="a" title="(A) Assessment" isActive={activeSection === 'a'} onClick={() => setActiveSection(activeSection === 'a' ? null : 'a')}>
            <textarea className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white" rows={4} placeholder="Diagnosis atau masalah klinis saat ini..." value={soap.a} onChange={(e) => setSoap({ ...soap, a: e.target.value })} />
          </AccordionSection>

          <AccordionSection id="p" title="(P) Plan" isActive={activeSection === 'p'} onClick={() => setActiveSection(activeSection === 'p' ? null : 'p')}>
            <textarea className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white" rows={4} placeholder="Rencana tatalaksana, terapi, dan edukasi..." value={soap.p} onChange={(e) => setSoap({ ...soap, p: e.target.value })} />
          </AccordionSection>

          <AccordionSection id="i" title="(I) Instruction" isActive={activeSection === 'i'} onClick={() => setActiveSection(activeSection === 'i' ? null : 'i')}>
            <textarea className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white" rows={4} placeholder="Instruksi spesifik kepada pasien/perawat..." value={soap.i} onChange={(e) => setSoap({ ...soap, i: e.target.value })} />
          </AccordionSection>

          {/* BLPL Checkbox */}
          <div className="pt-2 flex items-center gap-3 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <input type="checkbox" id="blpl_new" checked={isDischarged} onChange={(e) => setIsDischarged(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500" />
            <label htmlFor="blpl_new" className="text-sm font-bold text-slate-800">Tandai Pasien Boleh Pulang (BLPL)</label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 pb-20 space-y-3">
            <button
              id="tour-save-patient-btn"
              onClick={handleSave}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform"
            >
              Simpan Pasien &amp; SOAP
            </button>
            <button onClick={onBack} className="w-full py-4 bg-white border-2 border-emerald-100 rounded-xl text-slate-700 font-bold text-sm shadow-sm active:scale-[0.98] transition-transform">
              Kembali
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
