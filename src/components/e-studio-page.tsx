'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Cast, Plus, X, Users, Radio, Clock, CheckCircle2, Video, MonitorUp,
  MessageSquare, PenLine, CircleDot, Mic,
} from 'lucide-react';

interface Participant {
  id: string;
  role: string;
  user: { id: string; name: string };
}

interface EStudioSession {
  id: string;
  title: string;
  status: string; // waiting, live, ended
  sessionType: string; // mixing, mastering, session_live
  audioQuality: string;
  enableVideo: boolean;
  enableScreenShare: boolean;
  enableChat: boolean;
  enableAnnotations: boolean;
  enableRecording: boolean;
  maxParticipants: number;
  createdAt: string;
  host: { id: string; name: string };
  participants: Participant[];
  _count?: { participants: number };
}

const SESSION_TYPES = [
  { value: 'session_live', label: 'Session live' },
  { value: 'mixing', label: 'Mixage' },
  { value: 'mastering', label: 'Mastering' },
];

const AUDIO_QUALITIES = [
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'Haute qualité' },
];

export default function EStudioPage() {
  const user = useAppStore((state) => state.user);
  const [sessions, setSessions] = useState<EStudioSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    sessionType: 'session_live',
    audioQuality: 'standard',
    enableVideo: false,
    enableScreenShare: true,
    enableChat: true,
    enableAnnotations: false,
    enableRecording: false,
    maxParticipants: 5,
  });

  const accentColor = user?.role === 'studio_owner' ? '#f59e0b' : '#6366f1';

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/e-studio/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching E-Studio sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/e-studio/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({
          title: '',
          sessionType: 'session_live',
          audioQuality: 'standard',
          enableVideo: false,
          enableScreenShare: true,
          enableChat: true,
          enableAnnotations: false,
          enableRecording: false,
          maxParticipants: 5,
        });
        fetchSessions();
      }
    } catch (error) {
      console.error('Error creating E-Studio session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <span className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            En direct
          </span>
        );
      case 'ended':
        return (
          <span className="flex items-center gap-1 bg-gray-500/20 text-gray-400 px-2.5 py-1 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Terminée
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
    }
  };

  const sessionTypeLabel = (type: string) =>
    SESSION_TYPES.find(t => t.value === type)?.label || type;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#2a2a2a] rounded w-1/3" />
          {[1, 2].map(i => <div key={i} className="h-24 bg-[#1a1a1a] rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <Cast className="w-7 h-7" style={{ color: accentColor }} />
            E-Studio
          </h1>
          <p className="text-gray-400 mt-1">
            Sessions collaboratives à distance : écoute partagée, écran partagé, chat
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ backgroundColor: accentColor }}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Nouvelle session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-12 text-center">
          <Cast className="w-14 h-14 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Aucune session E-Studio pour le moment</p>
          <p className="text-gray-500 text-sm mt-1">
            Créez une session pour collaborer en direct avec un studio ou un artiste
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 hover:border-[#3a3a3a] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h3 className="text-white font-semibold text-lg truncate">{session.title}</h3>
                    {getStatusBadge(session.status)}
                  </div>
                  <p className="text-gray-500 text-sm">
                    {sessionTypeLabel(session.sessionType)} • Hôte : {session.host.name}
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {session._count?.participants || session.participants.length}/{session.maxParticipants}
                    </span>
                    {session.enableVideo && (
                      <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Vidéo</span>
                    )}
                    {session.enableScreenShare && (
                      <span className="flex items-center gap-1"><MonitorUp className="w-3.5 h-3.5" /> Écran</span>
                    )}
                    {session.enableChat && (
                      <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Chat</span>
                    )}
                    {session.enableAnnotations && (
                      <span className="flex items-center gap-1"><PenLine className="w-3.5 h-3.5" /> Annotations</span>
                    )}
                    {session.enableRecording && (
                      <span className="flex items-center gap-1"><CircleDot className="w-3.5 h-3.5" /> Enregistrement</span>
                    )}
                  </div>
                </div>
                <button
                  style={{ backgroundColor: accentColor }}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                >
                  <Radio className="w-4 h-4" />
                  {session.status === 'ended' ? 'Voir le récap' : 'Ouvrir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="text-xl font-bold text-white">Nouvelle session E-Studio</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Titre de la session</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Mix du titre Nuit Polaire"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Type de session</label>
                  <select
                    value={form.sessionType}
                    onChange={(e) => setForm(prev => ({ ...prev, sessionType: e.target.value }))}
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                  >
                    {SESSION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Qualité audio</label>
                  <select
                    value={form.audioQuality}
                    onChange={(e) => setForm(prev => ({ ...prev, audioQuality: e.target.value }))}
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a]"
                  >
                    {AUDIO_QUALITIES.map(q => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">
                  Participants max ({form.maxParticipants})
                </label>
                <input
                  type="range"
                  min={2}
                  max={5}
                  value={form.maxParticipants}
                  onChange={(e) => setForm(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                  className="w-full accent-[#6366f1]"
                />
              </div>

              <div className="space-y-2">
                <p className="text-gray-400 text-sm mb-1">Options</p>
                {[
                  { key: 'enableVideo' as const, label: 'Vidéo', icon: Video },
                  { key: 'enableScreenShare' as const, label: 'Partage d\'écran', icon: MonitorUp },
                  { key: 'enableChat' as const, label: 'Chat', icon: MessageSquare },
                  { key: 'enableAnnotations' as const, label: 'Annotations', icon: PenLine },
                  { key: 'enableRecording' as const, label: 'Enregistrement', icon: CircleDot },
                ].map(({ key, label, icon: Icon }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between bg-[#2a2a2a] rounded-lg px-4 py-3 cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-white text-sm">
                      <Icon className="w-4 h-4 text-gray-400" />
                      {label}
                    </span>
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-[#6366f1]"
                    />
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={isCreating || !form.title.trim()}
                style={{ backgroundColor: accentColor }}
                className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isCreating ? 'Création...' : 'Créer la session'}
              </button>

              <p className="text-gray-600 text-xs flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" />
                Connexion pair-à-pair, 5 participants max. Aucun enregistrement furtif.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
