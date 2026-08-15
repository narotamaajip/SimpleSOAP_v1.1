import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { AccordionSection } from '../components/ui/AccordionSection';
import { VitalInput } from '../components/ui/VitalInput';

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

export function SoapForm({ patient, editingSoapId, onBack, onSave }) {
  const [activeSection, setActiveSection] = useState('s');
  const [isDischarged, setIsDischarged] = useState(patient.status === 'PULANG');
  const [soap, setSoap] = useState({
    s: '',
    vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
    o: '',
    a: '',
    p: '',
    i: ''
  });

  useEffect(() => {
    if (editingSoapId) {
      const historyItem = patient.history.find((h) => h.id === editingSoapId);
      if (historyItem) {
        setSoap({
          s: historyItem.s || '',
          vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
          o: historyItem.o || '',
          a: historyItem.a || '',
          p: historyItem.p || '',
          i: historyItem.i || ''
        });
      }
    }
  }, [editingSoapId, patient]);

  const copyPrevious = () => {
    if (patient.history && patient.history.length > 0) {
      const historyCopy = [...patient.history].sort((a, b) => b.id - a.id);
      const prevItem = editingSoapId
        ? historyCopy.find((h) => h.id !== editingSoapId)
        : historyCopy[0];

      if (prevItem) {
        setSoap({
          s: prevItem.s || '',
          vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
          o: prevItem.o || '',
          a: prevItem.a || '',
          p: prevItem.p || '',
          i: prevItem.i || ''
        });
        alert('SOAP sebelumnya berhasil disalin.');
      } else {
        alert('Tidak ada riwayat SOAP sebelumnya untuk disalin.');
      }
    } else {
      alert('Tidak ada riwayat SOAP sebelumnya.');
    }
  };

  const applyTemplate = (type) => {
    const t = SOAP_TEMPLATES[type];
    if (t) {
      setSoap((prev) => ({ ...prev, s: t.s, a: t.a, p: t.p }));
      setActiveSection('o');
    }
  };

  const handleSave = () => {
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

    onSave({
      s: soap.s || '-',
      o: formattedO || '-',
      a: soap.a || '-',
      p: soap.p || '-',
      i: soap.i || '-',
      isDischarged
    });
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
        <h2 className="text-emerald-800 font-black text-sm tracking-tight uppercase">Update SOAP</h2>
        <button
          onClick={handleSave}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform"
        >
          Simpan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-2xl font-black text-slate-800">Entry SOAP Baru</h1>
          <p className="text-xs font-bold text-slate-500 mt-1">
            {patient.name} (RM: {patient.rm}) - {patient.ward}
          </p>
        </div>

        {/* Template Cepat */}
        <div className="px-4 mb-4">
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">TEMPLATE CEPAT</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={copyPrevious}
              className="px-4 py-2 rounded-lg bg-indigo-50/50 text-indigo-700 text-xs font-bold whitespace-nowrap border border-indigo-100 shadow-sm flex items-center gap-1.5"
            >
              <FileText size={14} /> Salin Terakhir
            </button>
            <button
              onClick={() => applyTemplate('stabil')}
              className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm"
            >
              Pasien Stabil
            </button>
            <button
              onClick={() => applyTemplate('membaik')}
              className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm"
            >
              Pasien Membaik
            </button>
            <button
              onClick={() => applyTemplate('sesak')}
              className="px-4 py-2 rounded-lg bg-emerald-50/50 text-slate-600 text-xs font-bold whitespace-nowrap border border-emerald-100 shadow-sm"
            >
              Pasien Sesak
            </button>
          </div>
        </div>

        {/* Accordions */}
        <div className="px-4 space-y-3 pb-8">
          <AccordionSection
            id="s" title="(S) Subjective"
            isActive={activeSection === 's'}
            onClick={() => setActiveSection(activeSection === 's' ? null : 's')}
          >
            <textarea
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Catatan keluhan tambahan pasien..."
              value={soap.s}
              onChange={(e) => setSoap({ ...soap, s: e.target.value })}
            />
          </AccordionSection>

          <AccordionSection
            id="o" title="(O) Objective"
            isActive={activeSection === 'o'}
            onClick={() => setActiveSection(activeSection === 'o' ? null : 'o')}
          >
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
                <textarea
                  className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
                  rows={4}
                  placeholder="Catatan pemeriksaan fisik dan hasil lab/radiologi..."
                  value={soap.o}
                  onChange={(e) => setSoap({ ...soap, o: e.target.value })}
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            id="a" title="(A) Assessment"
            isActive={activeSection === 'a'}
            onClick={() => setActiveSection(activeSection === 'a' ? null : 'a')}
          >
            <textarea
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Diagnosis atau masalah klinis saat ini..."
              value={soap.a}
              onChange={(e) => setSoap({ ...soap, a: e.target.value })}
            />
          </AccordionSection>

          <AccordionSection
            id="p" title="(P) Plan"
            isActive={activeSection === 'p'}
            onClick={() => setActiveSection(activeSection === 'p' ? null : 'p')}
          >
            <textarea
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Rencana tatalaksana, terapi, dan edukasi..."
              value={soap.p}
              onChange={(e) => setSoap({ ...soap, p: e.target.value })}
            />
          </AccordionSection>

          <AccordionSection
            id="i" title="(I) Instruction"
            isActive={activeSection === 'i'}
            onClick={() => setActiveSection(activeSection === 'i' ? null : 'i')}
          >
            <textarea
              className="w-full p-3 rounded-md border border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm font-medium resize-none bg-white"
              rows={4}
              placeholder="Instruksi spesifik kepada pasien/perawat..."
              value={soap.i}
              onChange={(e) => setSoap({ ...soap, i: e.target.value })}
            />
          </AccordionSection>

          {/* BLPL Checkbox */}
          <div className="pt-2 flex items-center gap-3 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <input
              type="checkbox"
              id="blpl"
              checked={isDischarged}
              onChange={(e) => setIsDischarged(e.target.checked)}
              className="w-5 h-5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
            />
            <label htmlFor="blpl" className="text-sm font-bold text-slate-800">
              Tandai Pasien Boleh Pulang (BLPL)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 pb-20 space-y-3">
            <button
              onClick={handleSave}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform"
            >
              Simpan SOAP
            </button>
            <button
              onClick={onBack}
              className="w-full py-4 bg-white border-2 border-emerald-100 rounded-xl text-slate-700 font-bold text-sm shadow-sm active:scale-[0.98] transition-transform"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
