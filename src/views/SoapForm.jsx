import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, CheckCircle2 } from 'lucide-react';
import { AccordionSection } from '../components/ui/AccordionSection';
import { VitalInput } from '../components/ui/VitalInput';
import { AmbientBackground } from '../components/ui/AmbientBackground';

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

function formatVitalsStr(vitals = {}) {
  const { td, nadi, rr, suhu, spo2, bb } = vitals;
  return [
    td && `TD ${td} mmHg`,
    nadi && `HR ${nadi} x/m`,
    rr && `RR ${rr} x/m`,
    suhu && `T ${suhu} °C`,
    spo2 && `SpO2 ${spo2}%`,
    bb && `BB ${bb} kg`
  ]
    .filter(Boolean)
    .join(', ');
}

function extractCleanO(item) {
  if (!item) return '';
  if (typeof item.rawO === 'string') return item.rawO;

  let raw = item.o && item.o !== '-' ? item.o : '';
  const vitalsStr = formatVitalsStr(item.vitals);
  if (vitalsStr) {
    const prefix = `${vitalsStr}.`;
    while (raw.startsWith(prefix)) {
      raw = raw.slice(prefix.length).replace(/^\n+/, '');
    }
  }
  return raw;
}

export function SoapForm({ patient, notes, editingSoapId, onBack, onSave }) {
  const [activeSection, setActiveSection] = useState('s');
  const [isDischarged, setIsDischarged] = useState(patient.status === 'PULANG');
  const [hasDraftRestored, setHasDraftRestored] = useState(false);

  const [soap, setSoap] = useState({
    s: '',
    vitals: { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
    o: '',
    a: '',
    p: '',
    i: ''
  });

  const draftKey = `soap_draft_${patient.id}`;
  const availableNotes = notes && notes.length > 0 ? notes : (patient.history || []);

  // Load existing SOAP if editing, or restore local draft if creating new
  useEffect(() => {
    if (editingSoapId) {
      const historyItem = availableNotes.find((h) => String(h.id) === String(editingSoapId));
      if (historyItem) {
        setSoap({
          s: historyItem.s && historyItem.s !== '-' ? historyItem.s : '',
          vitals: historyItem.vitals || { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
          o: extractCleanO(historyItem),
          a: historyItem.a && historyItem.a !== '-' ? historyItem.a : '',
          p: historyItem.p && historyItem.p !== '-' ? historyItem.p : '',
          i: historyItem.i && historyItem.i !== '-' ? historyItem.i : ''
        });
      }
    } else {
      // Check for saved draft in localStorage
      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && parsed.soap) {
            setSoap(parsed.soap);
            if (parsed.isDischarged !== undefined) setIsDischarged(parsed.isDischarged);
            setHasDraftRestored(true);
            setTimeout(() => setHasDraftRestored(false), 4000);
          }
        }
      } catch (e) {
        console.warn('Error reading SOAP draft from localStorage:', e);
      }
    }
  }, [editingSoapId, patient.id]);

  // Autosave draft to localStorage when creating a new SOAP note
  useEffect(() => {
    if (editingSoapId) return;

    const hasAnyContent =
      soap.s.trim() ||
      soap.o.trim() ||
      soap.a.trim() ||
      soap.p.trim() ||
      soap.i.trim() ||
      Object.values(soap.vitals).some((v) => (v || '').trim());

    if (hasAnyContent) {
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify({ soap, isDischarged, timestamp: Date.now() }));
        } catch (e) {
          console.warn('Error saving SOAP draft:', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [soap, isDischarged, editingSoapId, draftKey]);

  const isDirty = () => {
    return (
      soap.s.trim() !== '' ||
      soap.o.trim() !== '' ||
      soap.a.trim() !== '' ||
      soap.p.trim() !== '' ||
      soap.i.trim() !== '' ||
      Object.values(soap.vitals).some((v) => (v || '').trim() !== '')
    );
  };

  const handleClose = () => {
    if (isDirty()) {
      if (window.confirm('Ada draf catatan yang belum disimpan. Yakin ingin menutup form?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const copyPrevious = () => {
    if (availableNotes.length > 0) {
      const historyCopy = [...availableNotes].sort((a, b) => {
        const timeA = a.localTimestamp || Number(a.id) || 0;
        const timeB = b.localTimestamp || Number(b.id) || 0;
        return timeB - timeA;
      });
      const prevItem = editingSoapId
        ? historyCopy.find((h) => String(h.id) !== String(editingSoapId))
        : historyCopy[0];

      if (prevItem) {
        setSoap({
          s: prevItem.s && prevItem.s !== '-' ? prevItem.s : '',
          vitals: prevItem.vitals || { td: '', nadi: '', rr: '', suhu: '', spo2: '', bb: '' },
          o: extractCleanO(prevItem),
          a: prevItem.a && prevItem.a !== '-' ? prevItem.a : '',
          p: prevItem.p && prevItem.p !== '-' ? prevItem.p : '',
          i: prevItem.i && prevItem.i !== '-' ? prevItem.i : ''
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
    const hasAnyContent =
      soap.s.trim() ||
      soap.o.trim() ||
      soap.a.trim() ||
      soap.p.trim() ||
      soap.i.trim() ||
      Object.values(soap.vitals).some((v) => (v || '').trim());

    if (!hasAnyContent) {
      alert('Mohon isi minimal salah satu komponen catatan SOAP atau tanda vital sebelum menyimpan.');
      return;
    }

    const vitalsStr = formatVitalsStr(soap.vitals);
    const cleanRawO = soap.o.trim();

    let formattedO = '';
    if (vitalsStr) formattedO += vitalsStr + '.\n';
    if (cleanRawO) formattedO += cleanRawO;

    try {
      localStorage.removeItem(draftKey);
    } catch (e) {
      console.warn('Error clearing draft:', e);
    }

    onSave({
      s: soap.s.trim() || '-',
      o: formattedO.trim() || '-',
      rawO: cleanRawO,
      a: soap.a.trim() || '-',
      p: soap.p.trim() || '-',
      i: soap.i.trim() || '-',
      vitals: soap.vitals,
      isDischarged
    });
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

      {/* Header */}
      <div className="glass-bar px-4 py-3 flex items-center justify-between border-b sticky top-0 z-30">
        <button onClick={handleClose} className="text-slate-600 p-1.5 rounded-xl glass-btn-secondary">
          <X size={20} />
        </button>
        <h2 className="text-slate-800 font-extrabold text-sm tracking-tight uppercase">
          {editingSoapId ? 'Edit Catatan SOAP' : 'Entry SOAP Baru'}
        </h2>
        <button
          onClick={handleSave}
          className="glass-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold"
        >
          Simpan
        </button>
      </div>

      {/* Restored Draft Banner */}
      {hasDraftRestored && (
        <div className="glass-subpanel border-b border-white/80 px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-teal-800 z-20">
          <CheckCircle2 size={14} className="text-teal-600 shrink-0" />
          <span>Draf catatan belum tersimpan berhasil dipulihkan otomatis.</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 z-10">
        <div className="px-4 pt-5 pb-4">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {editingSoapId ? 'Koreksi SOAP' : 'Entry SOAP Baru'}
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {patient.name} (RM: {patient.rm || '-'}) • {patient.ward}
          </p>
        </div>

        {/* Template Cepat */}
        <div className="px-4 mb-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            TEMPLATE CEPAT
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              type="button"
              onClick={copyPrevious}
              className="px-3.5 py-2 rounded-2xl glass-btn-secondary text-cyan-900 text-xs font-bold whitespace-nowrap flex items-center gap-1.5"
            >
              <FileText size={13} className="text-cyan-700" /> Salin Terakhir
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('stabil')}
              className="px-3.5 py-2 rounded-2xl glass-btn-secondary text-slate-700 text-xs font-semibold whitespace-nowrap"
            >
              Pasien Stabil
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('membaik')}
              className="px-3.5 py-2 rounded-2xl glass-btn-secondary text-slate-700 text-xs font-semibold whitespace-nowrap"
            >
              Pasien Membaik
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('sesak')}
              className="px-3.5 py-2 rounded-2xl glass-btn-secondary text-slate-700 text-xs font-semibold whitespace-nowrap"
            >
              Pasien Sesak
            </button>
          </div>
        </div>

        {/* Accordions */}
        <div className="px-4 space-y-3 pb-8">
          <AccordionSection
            id="s"
            title="(S) Subjective"
            isActive={activeSection === 's'}
            onClick={() => setActiveSection(activeSection === 's' ? null : 's')}
          >
            <textarea
              className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800 placeholder:text-slate-400"
              rows={4}
              placeholder="Catatan keluhan tambahan pasien..."
              value={soap.s}
              onChange={(e) => setSoap({ ...soap, s: e.target.value })}
            />
          </AccordionSection>

          <AccordionSection
            id="o"
            title="(O) Objective"
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
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Pemeriksaan Fisik / Penunjang
                </p>
                <textarea
                  className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800 placeholder:text-slate-400"
                  rows={4}
                  placeholder="Catatan pemeriksaan fisik dan hasil lab/radiologi..."
                  value={soap.o}
                  onChange={(e) => setSoap({ ...soap, o: e.target.value })}
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            id="a"
            title="(A) Assessment"
            isActive={activeSection === 'a'}
            onClick={() => setActiveSection(activeSection === 'a' ? null : 'a')}
          >
            <textarea
              className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800 placeholder:text-slate-400"
              rows={4}
              placeholder="Diagnosis atau masalah klinis saat ini..."
              value={soap.a}
              onChange={(e) => setSoap({ ...soap, a: e.target.value })}
            />
          </AccordionSection>

          <AccordionSection
            id="p"
            title="(P) Plan"
            isActive={activeSection === 'p'}
            onClick={() => setActiveSection(activeSection === 'p' ? null : 'p')}
          >
            <textarea
              className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800 placeholder:text-slate-400"
              rows={4}
              placeholder="Rencana tatalaksana, terapi, dan edukasi..."
              value={soap.p}
              onChange={(e) => setSoap({ ...soap, p: e.target.value })}
            />
          </AccordionSection>

          <AccordionSection
            id="i"
            title="(I) Instruction"
            isActive={activeSection === 'i'}
            onClick={() => setActiveSection(activeSection === 'i' ? null : 'i')}
          >
            <textarea
              className="w-full p-3.5 rounded-2xl glass-input text-sm font-medium resize-none text-slate-800 placeholder:text-slate-400"
              rows={4}
              placeholder="Instruksi spesifik kepada pasien/perawat..."
              value={soap.i}
              onChange={(e) => setSoap({ ...soap, i: e.target.value })}
            />
          </AccordionSection>

          {/* BLPL Checkbox */}
          <div className="flex items-center gap-3 glass-card p-4 rounded-2xl">
            <input
              type="checkbox"
              id="blpl"
              checked={isDischarged}
              onChange={(e) => setIsDischarged(e.target.checked)}
              className="w-5 h-5 text-cyan-700 rounded-md border-slate-300 focus:ring-cyan-600 cursor-pointer"
            />
            <label htmlFor="blpl" className="text-sm font-bold text-slate-800 cursor-pointer select-none">
              Tandai Pasien Boleh Pulang (BLPL)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 pb-20 space-y-3">
            <button
              onClick={handleSave}
              className="w-full py-4 glass-btn-primary rounded-2xl font-bold text-sm"
            >
              Simpan SOAP
            </button>
            <button
              onClick={handleClose}
              className="w-full py-4 glass-btn-secondary rounded-2xl text-slate-700 font-bold text-sm"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
