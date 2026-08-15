import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Activity, Key } from 'lucide-react';
import { auth } from '../lib/firebase';
import { findPatientByShareCode, addToAccessList } from '../lib/patients';
import { PatientCardDetailed } from '../components/PatientCardDetailed';
import { cn } from '../utils/cn';

export function PatientListView({
  patients,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  onSelectPatient,
  onAddPatientClick
}) {
  const [roomFilter, setRoomFilter] = useState('');
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState({ type: '', message: '' });

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setIsRedeeming(true);
    setRedeemStatus({ type: 'info', message: 'Mencari pasien...' });

    try {
      const result = await findPatientByShareCode(redeemCode);
      if (!result.found) {
        setRedeemStatus({ type: 'error', message: 'Kode tidak ditemukan.' });
      } else if (result.data.accessList?.includes(auth.currentUser.uid)) {
        setRedeemStatus({ type: 'error', message: 'Anda sudah memiliki akses ke pasien ini.' });
      } else {
        await addToAccessList(result.patientId, auth.currentUser.uid);
        setRedeemStatus({ type: 'success', message: 'Berhasil! Pasien ditambahkan.' });
        setRedeemCode('');
        setTimeout(() => {
          setShowRedeem(false);
          setRedeemStatus({ type: '', message: '' });
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setRedeemStatus({ type: 'error', message: 'Terjadi kesalahan sistem.' });
    } finally {
      setIsRedeeming(false);
    }
  };

  const uniqueRooms = useMemo(() => {
    const rooms = patients.map((p) => p.ward).filter(Boolean);
    return [...new Set(rooms)].sort();
  }, [patients]);

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ward?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRoom = roomFilter ? p.ward === roomFilter : true;

    let matchesCategory = true;
    if (categoryFilter === 'AKTIF') {
      matchesCategory = p.status !== 'PULANG';
    } else if (categoryFilter === 'BELUM_FU') {
      matchesCategory = !p.isFollowedUp && p.status !== 'PULANG';
    } else if (categoryFilter === 'INAKTIF') {
      matchesCategory = p.status === 'PULANG';
    }

    return matchesSearch && matchesRoom && matchesCategory;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col overflow-hidden relative"
    >
      <div className="bg-white px-4 py-4 border-b border-slate-100 sticky top-0 z-20 space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-emerald-800 font-black text-base tracking-tight uppercase">Daftar Pasien</h1>
          <button
            onClick={() => setShowRedeem(!showRedeem)}
            className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Key size={14} /> Akses Kode
          </button>
        </div>

        <AnimatePresence>
          {showRedeem && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleRedeem} className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col gap-2">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                  Masukkan Kode Unik Pasien
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: X7A9KQ"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    className="flex-1 p-2 rounded-lg border border-emerald-200 text-sm font-mono font-bold tracking-widest focus:outline-none focus:border-emerald-500 uppercase"
                  />
                  <button
                    type="submit" disabled={isRedeeming}
                    className="bg-emerald-600 text-white px-4 rounded-lg font-bold text-xs shadow-sm disabled:opacity-50"
                  >
                    {isRedeeming ? <Activity size={16} className="animate-spin" /> : 'Cari'}
                  </button>
                </div>
                {redeemStatus.message && (
                  <p className={cn(
                    'text-[10px] font-bold mt-1',
                    redeemStatus.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
                  )}>
                    {redeemStatus.message}
                  </p>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setCategoryFilter('AKTIF')}
            className={cn(
              'flex-1 py-1.5 text-xs font-bold rounded-md transition-all',
              categoryFilter === 'AKTIF' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'
            )}
          >
            Aktif
          </button>
          <button
            onClick={() => setCategoryFilter('BELUM_FU')}
            className={cn(
              'flex-1 py-1.5 text-xs font-bold rounded-md transition-all',
              categoryFilter === 'BELUM_FU' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'
            )}
          >
            Belum FU
          </button>
          <button
            onClick={() => setCategoryFilter('INAKTIF')}
            className={cn(
              'flex-1 py-1.5 text-xs font-bold rounded-md transition-all',
              categoryFilter === 'INAKTIF' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            )}
          >
            Pulang
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari Nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold"
            />
          </div>
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="w-1/3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-bold text-slate-600"
          >
            <option value="">Semua Kamar</option>
            {uniqueRooms.map((room) => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 text-sm font-bold mt-10">Tidak ada pasien yang sesuai.</p>
        ) : (
          filtered.map((p) => (
            <PatientCardDetailed key={p.id} patient={p} onClick={() => onSelectPatient(p.id)} />
          ))
        )}
      </div>

      <button
        onClick={onAddPatientClick}
        className="absolute bottom-6 right-6 bg-emerald-600 text-white w-14 h-14 flex items-center justify-center rounded-full shadow-lg shadow-emerald-600/40 active:scale-95 transition-transform z-30"
      >
        <Plus size={28} />
      </button>
    </motion.div>
  );
}
