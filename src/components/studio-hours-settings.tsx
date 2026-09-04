'use client';

import { useEffect, useState } from 'react';
import { Clock, Save, Plus, X, Calendar, AlertCircle } from 'lucide-react';

interface StudioHours {
  [key: number]: { open: string; close: string; closed: boolean };
}

interface Block {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

const DAYS = [
  { key: 0, name: 'Dimanche', short: 'Dim' },
  { key: 1, name: 'Lundi', short: 'Lun' },
  { key: 2, name: 'Mardi', short: 'Mar' },
  { key: 3, name: 'Mercredi', short: 'Mer' },
  { key: 4, name: 'Jeudi', short: 'Jeu' },
  { key: 5, name: 'Vendredi', short: 'Ven' },
  { key: 6, name: 'Samedi', short: 'Sam' },
];

interface StudioHoursSettingsProps {
  studioId: string;
}

export default function StudioHoursSettings({ studioId }: StudioHoursSettingsProps) {
  const [hours, setHours] = useState<StudioHours>({
    0: { open: '10:00', close: '18:00', closed: true },
    1: { open: '10:00', close: '22:00', closed: false },
    2: { open: '10:00', close: '22:00', closed: false },
    3: { open: '10:00', close: '22:00', closed: false },
    4: { open: '10:00', close: '22:00', closed: false },
    5: { open: '10:00', close: '22:00', closed: false },
    6: { open: '10:00', close: '20:00', closed: false },
  });
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlock, setNewBlock] = useState({
    date: '',
    startTime: '',
    endTime: '',
    reason: ''
  });

  useEffect(() => {
    fetchHours();
  }, [studioId]);

  const fetchHours = async () => {
    try {
      const res = await fetch(`/api/studios/${studioId}/hours`);
      const data = await res.json();
      
      if (data.hours) {
        const hoursMap: StudioHours = { ...hours };
        data.hours.forEach((h: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }) => {
          hoursMap[h.dayOfWeek] = {
            open: h.startTime,
            close: h.endTime,
            closed: !h.isActive
          };
        });
        setHours(hoursMap);
      }
      
      if (data.blocks) {
        setBlocks(data.blocks);
      }
    } catch (error) {
      console.error('Error fetching hours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHourChange = (day: number, field: 'open' | 'close', value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const toggleDayClosed = (day: number) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], closed: !prev[day].closed }
    }));
  };

  const saveHours = async () => {
    setIsSaving(true);
    try {
      const hoursArray = Object.entries(hours).map(([day, data]) => ({
        dayOfWeek: parseInt(day),
        startTime: data.open,
        endTime: data.close,
        isActive: !data.closed
      }));

      const res = await fetch(`/api/studios/${studioId}/hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: hoursArray })
      });

      if (res.ok) {
        setSaveMessage('Horaires enregistrés avec succès');
      } else {
        setSaveMessage('Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Error saving hours:', error);
      setSaveMessage('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const addBlock = async () => {
    if (!newBlock.date) return;
    
    try {
      const res = await fetch(`/api/studios/${studioId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlock)
      });

      if (res.ok) {
        const data = await res.json();
        setBlocks(prev => [...prev, data.block]);
        setShowBlockModal(false);
        setNewBlock({ date: '', startTime: '', endTime: '', reason: '' });
      }
    } catch (error) {
      console.error('Error adding block:', error);
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      await fetch(`/api/studios/${studioId}/blocks?id=${blockId}`, {
        method: 'DELETE'
      });
      setBlocks(prev => prev.filter(b => b.id !== blockId));
    } catch (error) {
      console.error('Error deleting block:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-[#2a2a2a] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Hours */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
        <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-white font-semibold">Horaires d'ouverture</h3>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className={`text-sm ${saveMessage.startsWith('Erreur') ? 'text-red-400' : 'text-green-400'}`}>
                {saveMessage}
              </span>
            )}
            <button
              onClick={saveHours}
              disabled={isSaving}
              className="flex items-center gap-2 bg-[#f59e0b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e8950a] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#2a2a2a]">
          {DAYS.map(day => (
            <div 
              key={day.key} 
              className={`p-4 flex items-center gap-4 ${hours[day.key].closed ? 'opacity-50' : ''}`}
            >
              {/* Day name */}
              <div className="w-28 flex-shrink-0">
                <p className="text-white font-medium">{day.name}</p>
              </div>

              {/* Closed toggle */}
              <button
                onClick={() => toggleDayClosed(day.key)}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  hours[day.key].closed ? 'bg-red-500/30' : 'bg-green-500/30'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                  hours[day.key].closed ? 'left-1' : 'left-6'
                }`} />
              </button>

              {/* Hours inputs */}
              <div className="flex items-center gap-3 flex-1">
                {hours[day.key].closed ? (
                  <span className="text-red-400 text-sm">Fermé</span>
                ) : (
                  <>
                    <input
                      type="time"
                      value={hours[day.key].open}
                      onChange={(e) => handleHourChange(day.key, 'open', e.target.value)}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm border border-[#3a3a3a] focus:border-[#f59e0b] focus:outline-none"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                      type="time"
                      value={hours[day.key].close}
                      onChange={(e) => handleHourChange(day.key, 'close', e.target.value)}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm border border-[#3a3a3a] focus:border-[#f59e0b] focus:outline-none"
                    />
                    <span className="text-gray-500 text-sm">
                      ({(parseInt(hours[day.key].close.split(':')[0]) - parseInt(hours[day.key].open.split(':')[0]))}h ouvertes)
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exception Blocks */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
        <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-white font-semibold">Exceptions & Fermetures</h3>
          </div>
          <button
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3a3a3a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>

        {blocks.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucune fermeture planifiée</p>
            <p className="text-gray-500 text-sm">Ajoutez des exceptions pour les vacances, jours fériés, etc.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2a]">
            {blocks.map(block => (
              <div key={block.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{formatDate(block.date)}</p>
                  <p className="text-gray-400 text-sm">
                    {block.startTime && block.endTime 
                      ? `${block.startTime} - ${block.endTime}`
                      : 'Toute la journée'
                    }
                    {block.reason && ` • ${block.reason}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Ajouter une fermeture</h3>
              <button onClick={() => setShowBlockModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Date</label>
                <input
                  type="date"
                  value={newBlock.date}
                  onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Début (optionnel)</label>
                  <input
                    type="time"
                    value={newBlock.startTime}
                    onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                    placeholder="Toute la journée"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Fin (optionnel)</label>
                  <input
                    type="time"
                    value={newBlock.endTime}
                    onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Motif (optionnel)</label>
                <input
                  type="text"
                  value={newBlock.reason}
                  onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  placeholder="Vacances, Maintenance, etc."
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                />
              </div>

              <div className="flex items-center gap-2 bg-[#f59e0b]/10 text-[#f59e0b] p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Laissez les heures vides pour bloquer toute la journée</span>
              </div>

              <button
                onClick={addBlock}
                disabled={!newBlock.date}
                className="w-full bg-[#f59e0b] text-white py-3 rounded-lg font-medium hover:bg-[#e8950a] transition-colors disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
