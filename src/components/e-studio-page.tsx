'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Cast, Plus, X, Users, Radio, Clock, CheckCircle2, Video, MonitorUp,
  MessageSquare, PenLine, CircleDot, Mic, ArrowLeft, Link2, Check,
  Play, Square, UserX, Send, Crown,
} from 'lucide-react';

interface Participant {
  id: string;
  userId: string;
  role: string;
  connectionState: string;
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
  startedAt: string | null;
  endedAt: string | null;
  host: { id: string; name: string };
  participants: Participant[];
  _count?: { participants: number };
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
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

  // Detail view state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EStudioSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const accentColor = user?.role === 'studio_owner' ? '#f59e0b' : '#6366f1';

  useEffect(() => {
    fetchSessions();
  }, []);

  // Traite un lien d'invitation (?e-studio=join&token=xxx) au montage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('e-studio') === 'join') {
      const token = params.get('token');
      if (token) {
        (async () => {
          try {
            const res = await fetch('/api/e-studio/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            });
            const data = await res.json();
            if (res.ok) {
              window.history.replaceState({}, '', window.location.pathname);
              await fetchSessions();
              openSession(data.sessionId);
            } else {
              setJoinError(data.error || 'Impossible de rejoindre cette session');
              window.history.replaceState({}, '', window.location.pathname);
            }
          } catch {
            setJoinError('Impossible de rejoindre cette session');
          }
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling détail + chat pendant qu'une session est ouverte
  useEffect(() => {
    if (!selectedSessionId) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const poll = async () => {
      await fetchSessionDetail(selectedSessionId);
      await fetchMessages(selectedSessionId);
    };
    poll();
    pollRef.current = setInterval(poll, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const fetchSessionDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/e-studio/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data.session);
      }
    } catch (error) {
      console.error('Error fetching session detail:', error);
    }
  };

  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/e-studio/sessions/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const openSession = (id: string) => {
    setJoinError(null);
    setInviteLink(null);
    setDetail(null);
    setMessages([]);
    setSelectedSessionId(id);
  };

  const closeSession = () => {
    setSelectedSessionId(null);
    setDetail(null);
    setMessages([]);
    fetchSessions();
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

  const handleToggleStatus = async (status: 'live' | 'ended') => {
    if (!selectedSessionId) return;
    setIsTogglingStatus(true);
    try {
      const res = await fetch(`/api/e-studio/sessions/${selectedSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data.session);
      }
    } catch (error) {
      console.error('Error toggling session status:', error);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!selectedSessionId) return;
    try {
      const res = await fetch(`/api/e-studio/sessions/${selectedSessionId}/invite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        const url = `${window.location.origin}${window.location.pathname}?e-studio=join&token=${data.invitation.token}`;
        setInviteLink(url);
        try {
          await navigator.clipboard.writeText(url);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2500);
        } catch {
          // Clipboard indisponible : le lien reste affiché à l'écran pour copie manuelle
        }
      }
    } catch (error) {
      console.error('Error generating invite:', error);
    }
  };

  const handleExpel = async (participantId: string) => {
    if (!selectedSessionId) return;
    if (!confirm('Expulser ce participant de la session ?')) return;
    try {
      await fetch(`/api/e-studio/sessions/${selectedSessionId}/participants/${participantId}`, {
        method: 'DELETE'
      });
      fetchSessionDetail(selectedSessionId);
    } catch (error) {
      console.error('Error expelling participant:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSessionId) return;
    const content = newMessage;
    setNewMessage('');
    try {
      const res = await fetch(`/api/e-studio/sessions/${selectedSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (res.ok) {
        fetchMessages(selectedSessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (start: string, end: string) => {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h${(mins % 60).toString().padStart(2, '0')}`;
  };

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

  // ─── Detail view ───
  if (selectedSessionId) {
    const isHost = detail?.host.id === user?.id;

    return (
      <div className="p-6 lg:p-8">
        <button
          onClick={closeSession}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux sessions
        </button>

        {!detail ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[#2a2a2a] rounded w-1/3" />
            <div className="h-40 bg-[#1a1a1a] rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="text-xl font-bold text-white">{detail.title}</h1>
                    {getStatusBadge(detail.status)}
                  </div>
                  <p className="text-gray-500 text-sm">
                    {sessionTypeLabel(detail.sessionType)} • Hôte : {detail.host.name}
                  </p>
                  {detail.status === 'ended' && detail.startedAt && detail.endedAt && (
                    <p className="text-gray-500 text-sm mt-1">
                      Durée : {formatDuration(detail.startedAt, detail.endedAt)} •{' '}
                      {detail.participants.length} participant{detail.participants.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {isHost && detail.status !== 'ended' && (
                  <div className="flex items-center gap-2">
                    {detail.status === 'waiting' && (
                      <button
                        onClick={() => handleToggleStatus('live')}
                        disabled={isTogglingStatus}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" />
                        Démarrer
                      </button>
                    )}
                    {detail.status === 'live' && (
                      <button
                        onClick={() => handleToggleStatus('ended')}
                        disabled={isTogglingStatus}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <Square className="w-4 h-4" />
                        Terminer
                      </button>
                    )}
                    <button
                      onClick={handleGenerateInvite}
                      className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors"
                    >
                      {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
                      {copySuccess ? 'Lien copié !' : 'Inviter'}
                    </button>
                  </div>
                )}
              </div>

              {inviteLink && (
                <div className="mt-4 bg-[#121212] rounded-xl p-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 bg-transparent text-gray-400 text-xs truncate outline-none"
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              )}
            </div>

            {joinError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
                {joinError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Participants */}
              <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
                <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <h2 className="text-white font-semibold text-sm">
                    Participants ({detail.participants.length}/{detail.maxParticipants})
                  </h2>
                </div>
                <div className="divide-y divide-[#2a2a2a]">
                  {detail.participants.map((p) => (
                    <div key={p.id} className="p-3 flex items-center gap-3">
                      <div
                        style={{ backgroundColor: accentColor }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      >
                        {p.user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate flex items-center gap-1">
                          {p.user.name}
                          {p.role === 'host' && <Crown className="w-3 h-3 text-yellow-400" />}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {p.role === 'host' ? 'Hôte' : 'Participant'}
                        </p>
                      </div>
                      {isHost && p.role !== 'host' && detail.status !== 'ended' && (
                        <button
                          onClick={() => handleExpel(p.id)}
                          className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Expulser"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div className="lg:col-span-2 bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] flex flex-col h-[480px]">
                <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <h2 className="text-white font-semibold text-sm">Chat</h2>
                </div>

                {!detail.enableChat ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-6 text-center">
                    Le chat est désactivé pour cette session.
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">
                          Aucun message pour le moment.
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div key={msg.id} className="flex gap-2">
                            <div className="w-7 h-7 bg-[#2a2a2a] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {msg.user.name[0]}
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">
                                {msg.user.name} • {formatTime(msg.createdAt)}
                              </p>
                              <p className="text-white text-sm">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    {detail.status !== 'ended' && (
                      <form onSubmit={handleSendMessage} className="p-3 border-t border-[#2a2a2a] flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Écrire un message..."
                          className="flex-1 bg-[#2a2a2a] text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                        />
                        <button
                          type="submit"
                          style={{ backgroundColor: accentColor }}
                          className="p-2 text-white rounded-xl hover:opacity-90 transition-opacity"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── List view ───
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

      {joinError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm mb-6">
          {joinError}
        </div>
      )}

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
                  onClick={() => openSession(session.id)}
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
