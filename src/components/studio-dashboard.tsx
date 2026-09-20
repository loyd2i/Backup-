'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Calendar, FileText, Music, Users, Clock, Euro, TrendingUp, ChevronRight, ChevronLeft, Plus, Download, Send, Settings, Globe, Wallet, ArrowDownCircle, ArrowUpCircle, Check, X, Eye, Star, Flag, Percent, Moon, Sun, Mail, Phone, User, Radio } from 'lucide-react';
import StudioHoursSettings from './studio-hours-settings';
import EmptyState from './ui/empty-state';
import StudioShowcasePage from './studio-showcase-page';
import AudioPlayer from './audio-player';
import AudioPlayerWithVersions from './audio-player-with-versions';
import ReviewModal from './review-modal';
import ReportModal from './report-modal';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  type?: string;
  notes?: string;
  totalPrice?: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  eStudioSession?: { id: string; status: string } | null;
}

interface BlockedSlot {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason?: string | null;
}

interface Studio {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  walletBalance: number;
  totalEarnings: number;
  views: number;
}

interface WalletTransaction {
  id: string;
  type: string; // earning, fee
  amount: number;
  description: string | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  createdAt: string;
  appointmentId: string | null;
  user: { name: string; email: string };
  appointment: { date: string; startTime: string };
}

interface Project {
  id: string;
  title: string;
  artist: string;
  bpm?: number | null;
  key?: string | null;
  status: string;
  isPublic?: boolean;
  isShared?: boolean;
  createdAt: string;
  user?: { id: string; name: string };
  audioUrl?: string | null;
  duration?: number | null;
  views?: number;
  studio?: { id: string; name: string } | null;
  _count?: { comments: number };
  sampleRate?: number | null;
  bitDepth?: number | null;
  bitrate?: number | null;
  audioFormat?: string | null;
  truePeak?: number | null;
  lufs?: number | null;
  lra?: number | null;
  waveformPeaks?: string | null;
  versions?: {
    id: string; label: string | null; audioUrl: string | null; duration: number | null; createdAt: string;
    sampleRate?: number | null; bitDepth?: number | null; bitrate?: number | null; audioFormat?: string | null;
    truePeak?: number | null; lufs?: number | null; lra?: number | null; waveformPeaks?: string | null;
  }[];
  onelibRelease?: { id: string; slug: string; status: string } | null;
}

export default function StudioDashboard() {
  const user = useAppStore((state) => state.user);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const setPendingEStudioSessionId = useAppStore((state) => state.setPendingEStudioSessionId);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [nightModeEnabled, setNightModeEnabled] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedBlockSlot, setSelectedBlockSlot] = useState<{ date: string; hour: number } | null>(null);
  const [appointmentDetail, setAppointmentDetail] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'invoices' | 'projects' | 'hours' | 'vitrine'>('overview');
  const [appointmentsView, setAppointmentsView] = useState<'list' | 'byArtist'>('list');
  const [expandedArtistId, setExpandedArtistId] = useState<string | null>(null);
  const [reviewAppointmentId, setReviewAppointmentId] = useState<string | null>(null);
  const [reportAppointmentId, setReportAppointmentId] = useState<string | null>(null);
  const [hoursPackOffers, setHoursPackOffers] = useState<{ id: string; hours: number; price: number }[]>([]);
  const [newPackHours, setNewPackHours] = useState('');
  const [newPackPrice, setNewPackPrice] = useState('');
  const [isCreatingPack, setIsCreatingPack] = useState(false);
  const [slotDiscounts, setSlotDiscounts] = useState<{ id: string; date: string; startTime: string; discountedPrice: number }[]>([]);
  const [newDiscountDate, setNewDiscountDate] = useState('');
  const [newDiscountTime, setNewDiscountTime] = useState('');
  const [newDiscountPrice, setNewDiscountPrice] = useState('');
  const [isCreatingDiscount, setIsCreatingDiscount] = useState(false);

  useEffect(() => {
    fetchStudioData();
  }, [user]);

  useEffect(() => {
    if (studio?.id) {
      fetchHoursPackOffers();
      fetchSlotDiscounts();
    }
  }, [studio?.id]);

  const fetchHoursPackOffers = async () => {
    if (!studio) return;
    try {
      const res = await fetch(`/api/studios/${studio.id}/hours-pack-offers`);
      const data = await res.json();
      setHoursPackOffers(data.offers || []);
    } catch {
      // best-effort
    }
  };

  const handleCreatePackOffer = async () => {
    if (!studio || !newPackHours || !newPackPrice) return;
    setIsCreatingPack(true);
    try {
      const res = await fetch(`/api/studios/${studio.id}/hours-pack-offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: newPackHours, price: newPackPrice }),
      });
      if (res.ok) {
        setNewPackHours('');
        setNewPackPrice('');
        fetchHoursPackOffers();
      }
    } finally {
      setIsCreatingPack(false);
    }
  };

  const handleDeletePackOffer = async (offerId: string) => {
    if (!studio) return;
    await fetch(`/api/studios/${studio.id}/hours-pack-offers/${offerId}`, { method: 'DELETE' });
    fetchHoursPackOffers();
  };

  const fetchSlotDiscounts = async () => {
    if (!studio) return;
    try {
      const res = await fetch(`/api/studios/${studio.id}/slot-discounts`);
      const data = await res.json();
      setSlotDiscounts(data.discounts || []);
    } catch {
      // best-effort
    }
  };

  const handleCreateDiscount = async () => {
    if (!studio || !newDiscountDate || !newDiscountTime || !newDiscountPrice) return;
    setIsCreatingDiscount(true);
    try {
      const res = await fetch(`/api/studios/${studio.id}/slot-discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDiscountDate, startTime: newDiscountTime, discountedPrice: newDiscountPrice }),
      });
      if (res.ok) {
        setNewDiscountDate('');
        setNewDiscountTime('');
        setNewDiscountPrice('');
        fetchSlotDiscounts();
      }
    } finally {
      setIsCreatingDiscount(false);
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!studio) return;
    await fetch(`/api/studios/${studio.id}/slot-discounts/${discountId}`, { method: 'DELETE' });
    fetchSlotDiscounts();
  };

  const fetchStudioData = async () => {
    if (!user) return;
    
    try {
      // Fetch studio owned by user
      const studioRes = await fetch('/api/studios');
      const studioData = await studioRes.json();
      const ownedStudio = studioData.studios?.find((s: Studio) => s.ownerId === user.id || s.owner?.id === user.id);
      
      if (ownedStudio) {
        setStudio(ownedStudio);
        
        // Fetch appointments for this studio
        const apptRes = await fetch(`/api/appointments?studioId=${ownedStudio.id}`);
        const apptData = await apptRes.json();
        setAppointments(apptData.appointments || []);
        
        // Fetch invoices
        const invoiceRes = await fetch(`/api/invoices?studioId=${ownedStudio.id}`);
        const invoiceData = await invoiceRes.json();
        setInvoices(invoiceData.invoices || []);
        
        // Fetch projects/tracks
        const tracksRes = await fetch('/api/tracks');
        const tracksData = await tracksRes.json();
        setProjects(tracksData.tracks || []);

        // Fetch wallet transactions
        const walletRes = await fetch(`/api/studios/${ownedStudio.id}/wallet`);
        const walletData = await walletRes.json();
        setWalletTransactions(walletData.transactions || []);

        // Fetch blocked slots (agenda)
        const blocksRes = await fetch(`/api/studios/${ownedStudio.id}/blocks`);
        const blocksData = await blocksRes.json();
        setBlockedSlots(blocksData.blocks || []);
      }
    } catch (error) {
      console.error('Error fetching studio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinEStudio = (sessionId: string) => {
    setPendingEStudioSessionId(sessionId);
    setCurrentPage('e-studio');
  };

  const handleSendInvoiceEmail = async (appointmentId: string) => {
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', appointmentId })
      });
      if (res.ok) {
        alert('Facture envoyée par e-mail au client');
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        fetchStudioData();
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const formatTime = (time: string) => time?.substring(0, 5) || '';
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmé';
      case 'pending': return 'En attente';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  // Une ligne de rendez-vous, partagée entre la vue "Liste" (table à plat)
  // et la vue "Par artiste" (regroupée), pour ne pas dupliquer la logique
  // des actions selon le statut.
  const renderAppointmentRow = (apt: Appointment) => (
    <tr key={apt.id} className="hover:bg-[#222]">
      <td className="p-4">
        <div>
          <p className="text-white font-medium">{apt.user.name}</p>
          <p className="text-gray-500 text-sm">{apt.user.email}</p>
          {apt.type === 'e_studio' && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-[#6366f1]/20 text-[#6366f1]">
              E-Studio
            </span>
          )}
        </div>
      </td>
      <td className="p-4 text-white">
        {new Date(apt.date).toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        })}
      </td>
      <td className="p-4 text-white">
        {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
      </td>
      <td className="p-4 text-gray-400">{apt.duration}h</td>
      <td className="p-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
          {getStatusLabel(apt.status)}
        </span>
      </td>
      <td className="p-4 text-[#6366f1] font-semibold">
        {apt.totalPrice || (studio?.pricePerHour || 0) * apt.duration}€
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          {apt.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatusChange(apt.id, 'confirmed')}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Confirmer
              </button>
              <button
                onClick={() => handleStatusChange(apt.id, 'cancelled')}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Refuser
              </button>
            </>
          )}
          {apt.status === 'confirmed' && (
            <>
              {apt.type === 'e_studio' && apt.eStudioSession && (
                <button
                  onClick={() => handleJoinEStudio(apt.eStudioSession!.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#6366f1]/20 text-[#6366f1] hover:bg-[#6366f1]/30 rounded-lg text-xs font-medium transition-colors"
                >
                  Rejoindre
                </button>
              )}
              <button
                onClick={() => handleStatusChange(apt.id, 'completed')}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Marquer terminée
              </button>
              <button
                onClick={() => handleStatusChange(apt.id, 'cancelled')}
                className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {apt.status === 'completed' && (
            <>
              <button
                onClick={() => setReviewAppointmentId(apt.id)}
                className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-[#f59e0b] transition-colors"
                title="Laisser un avis sur l'artiste"
              >
                <Star className="w-4 h-4" />
              </button>
              <button
                onClick={() => setReportAppointmentId(apt.id)}
                className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                title="Signaler un problème"
              >
                <Flag className="w-4 h-4" />
              </button>
            </>
          )}
          {apt.status === 'cancelled' && (
            <span className="text-gray-600 text-sm">—</span>
          )}
        </div>
      </td>
    </tr>
  );

  // Rendez-vous groupés par artiste, triés par activité la plus récente
  // (appointments est déjà trié date desc côté API, l'ordre est conservé).
  const artistGroups = (() => {
    const map = new Map<string, { user: Appointment['user']; appointments: Appointment[] }>();
    for (const apt of appointments) {
      if (!map.has(apt.user.id)) {
        map.set(apt.user.id, { user: apt.user, appointments: [] });
      }
      map.get(apt.user.id)!.appointments.push(apt);
    }
    return Array.from(map.values());
  })();

  // ---------- Agenda hebdomadaire ----------
  const prevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setCurrentWeekStart(now);
  };

  const getWeekDays = () => {
    const days: { date: Date; dateStr: string; dayName: string; dayNumber: number; monthName: string; isToday: boolean }[] = [];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      days.push({
        date,
        dateStr,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        monthName: monthNames[date.getMonth()],
        isToday: date.toDateString() === new Date().toDateString()
      });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const dayHours = Array.from({ length: 13 }, (_, i) => i + 8); // 8h à 20h
  const nightHours = Array.from({ length: 5 }, (_, i) => i + 21); // 21h à 2h (20h déjà dans dayHours)
  const agendaHours = nightModeEnabled ? [...dayHours, ...nightHours] : dayHours;

  const getCellStatus = (dateStr: string, hour: number): {
    isOccupied: boolean;
    type: 'block' | 'appointment' | null;
    isFirstHour: boolean;
    data: BlockedSlot | Appointment | null;
    isNight: boolean;
  } => {
    for (const block of blockedSlots) {
      let blockDateStr = block.date;
      if (typeof blockDateStr === 'string' && blockDateStr.includes('T')) {
        blockDateStr = blockDateStr.split('T')[0];
      }
      if (blockDateStr !== dateStr) continue;

      const startHour = parseInt((block.startTime || '00:00').split(':')[0]);
      const endHour = parseInt((block.endTime || '23:59').split(':')[0]);

      if (endHour < startHour) {
        if (hour >= startHour || hour < endHour) {
          return { isOccupied: true, type: 'block', isFirstHour: hour === startHour, data: block, isNight: hour >= 20 || hour < 8 };
        }
      } else if (hour >= startHour && hour < endHour) {
        return { isOccupied: true, type: 'block', isFirstHour: hour === startHour, data: block, isNight: hour >= 20 };
      }
    }

    for (const apt of appointments) {
      if (apt.status === 'cancelled') continue;

      let aptDateStr = apt.date;
      if (typeof aptDateStr === 'string' && aptDateStr.includes('T')) {
        aptDateStr = aptDateStr.split('T')[0];
      }
      if (aptDateStr !== dateStr) continue;

      const startHour = parseInt(apt.startTime.split(':')[0]);
      const endHour = parseInt(apt.endTime.split(':')[0]);

      if (hour >= startHour && hour < endHour) {
        return { isOccupied: true, type: 'appointment', isFirstHour: hour === startHour, data: apt, isNight: hour >= 20 };
      }
    }

    return { isOccupied: false, type: null, isFirstHour: false, data: null, isNight: hour >= 20 };
  };

  const handleSlotClick = (dateStr: string, hour: number) => {
    const status = getCellStatus(dateStr, hour);
    if (status.isOccupied) return;
    setSelectedBlockSlot({ date: dateStr, hour });
    setShowBlockModal(true);
  };

  const handleBlockSlot = async (date: string, hour: number) => {
    if (!studio) return;
    const endHour = hour + 2;
    try {
      const res = await fetch(`/api/studios/${studio.id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${endHour.toString().padStart(2, '0')}:00`,
          reason: hour >= 20 ? 'Horaire de nuit' : ''
        })
      });
      if (res.ok) fetchStudioData();
    } catch (error) {
      console.error('Error blocking slot:', error);
    }
  };

  const handleUnblockSlot = async (blockId: string) => {
    if (!studio) return;
    try {
      const res = await fetch(`/api/studios/${studio.id}/blocks?id=${blockId}`, { method: 'DELETE' });
      if (res.ok) fetchStudioData();
    } catch (error) {
      console.error('Error unblocking slot:', error);
    }
  };

  // Calculate stats
  const todayAppointments = appointments.filter(a => {
    const aptDate = new Date(a.date);
    const today = new Date();
    return aptDate.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter(a => {
    const aptDate = new Date(a.date);
    return aptDate >= new Date() && a.status !== 'cancelled';
  });

  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const pendingInvoices = invoices.filter(i => i.status === 'pending');

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[#2a2a2a] rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[#2a2a2a] rounded-xl"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Tableau de bord Studio
        </h1>
        <p className="text-gray-400">
          {studio?.name || 'Mon Studio'} • {studio?.location}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#6366f1]/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#6366f1]" />
            </div>
            <span className="text-gray-400 text-sm">Aujourd'hui</span>
          </div>
          <p className="text-3xl font-bold text-white">{todayAppointments.length}</p>
          <p className="text-gray-500 text-sm">Rendez-vous</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm">À venir</span>
          </div>
          <p className="text-3xl font-bold text-white">{upcomingAppointments.length}</p>
          <p className="text-gray-500 text-sm">Sessions planifiées</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <Euro className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-gray-400 text-sm">Revenus</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalRevenue}€</p>
          <p className="text-gray-500 text-sm">Ce mois</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-gray-400 text-sm">Factures</span>
          </div>
          <p className="text-3xl font-bold text-white">{pendingInvoices.length}</p>
          <p className="text-gray-500 text-sm">En attente</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#6366f1]/20 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#6366f1]" />
            </div>
            <span className="text-gray-400 text-sm">Visites</span>
          </div>
          <p className="text-3xl font-bold text-white">{studio?.views ?? 0}</p>
          <p className="text-gray-500 text-sm">Fiche publique</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
          { id: 'appointments', label: 'Rendez-vous', icon: Calendar },
          { id: 'invoices', label: 'Factures', icon: FileText },
          { id: 'projects', label: 'Projets', icon: Music },
          { id: 'vitrine', label: 'Ma vitrine', icon: Globe },
          { id: 'hours', label: 'Horaires', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div key={activeTab} className="tab-fade-in">
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Portefeuille */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#6366f1]" />
                Portefeuille
              </h2>
              <span className="text-gray-500 text-sm">Commission plateforme : 3%</span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#2a2a2a] border-b border-[#2a2a2a]">
              <div className="p-5">
                <p className="text-gray-400 text-sm mb-1">Solde disponible</p>
                <p className="text-3xl font-bold text-white">{(studio?.walletBalance ?? 0).toFixed(2)}€</p>
              </div>
              <div className="p-5">
                <p className="text-gray-400 text-sm mb-1">Gains cumulés</p>
                <p className="text-3xl font-bold text-white">{(studio?.totalEarnings ?? 0).toFixed(2)}€</p>
              </div>
            </div>

            {walletTransactions.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Aucun mouvement pour le moment"
                description="Le portefeuille se crédite automatiquement après chaque session terminée"
              />
            ) : (
              <div className="divide-y divide-[#2a2a2a]">
                {walletTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center gap-3">
                    {tx.type === 'earning' ? (
                      <ArrowDownCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {tx.description || (tx.type === 'earning' ? 'Crédit session' : 'Commission plateforme')}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <p className={`font-semibold ${tx.type === 'earning' ? 'text-green-400' : 'text-orange-400'}`}>
                      {tx.type === 'earning' ? '+' : '-'}{tx.amount.toFixed(2)}€
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agenda - Vue hebdomadaire */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button onClick={prevWeek} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <button onClick={nextWeek} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                <h2 className="text-lg font-semibold text-white">
                  {weekDays[0].dayNumber} {weekDays[0].monthName} - {weekDays[6].dayNumber} {weekDays[6].monthName} {weekDays[6].date.getFullYear()}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 bg-[#6366f1]/20 text-[#6366f1] rounded-lg text-sm hover:bg-[#6366f1]/30 transition-colors"
                >
                  Aujourd'hui
                </button>
              </div>

              <button
                onClick={() => setNightModeEnabled(!nightModeEnabled)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  nightModeEnabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                }`}
              >
                {nightModeEnabled ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Horaires de nuit (20h-2h)
              </button>
            </div>

            {/* En-tête des jours */}
            <div className="grid grid-cols-8 border-b border-[#2a2a2a]">
              <div className="p-2 text-center text-gray-500 text-xs font-medium border-r border-[#2a2a2a]">
                Heure
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.dateStr}
                  className={`p-2 text-center border-r border-[#2a2a2a] last:border-r-0 ${day.isToday ? 'bg-[#6366f1]/10' : ''}`}
                >
                  <p className={`text-xs ${day.isToday ? 'text-[#6366f1] font-semibold' : 'text-gray-500'}`}>{day.dayName}</p>
                  <p className={`text-lg font-bold ${day.isToday ? 'text-[#6366f1]' : 'text-white'}`}>{day.dayNumber}</p>
                </div>
              ))}
            </div>

            {/* Grille des créneaux */}
            <div className="max-h-[500px] overflow-y-auto">
              {agendaHours.map((hour) => {
                const displayHour = hour >= 24 ? hour - 24 : hour;
                const isNightHour = hour >= 20 || hour < 8;

                return (
                  <div key={hour} className="grid grid-cols-8">
                    <div className={`relative h-[50px] border-r border-b border-[#2a2a2a] ${isNightHour ? 'bg-indigo-900/20' : 'bg-[#1a1a1a]'}`}>
                      <span className={`absolute top-0 left-2 text-xs font-medium leading-[20px] ${isNightHour ? 'text-indigo-400' : 'text-gray-500'}`}>
                        {displayHour.toString().padStart(2, '0')}:00
                        {isNightHour && <Moon className="w-3 h-3 inline ml-1" />}
                      </span>
                    </div>

                    {weekDays.map((day) => {
                      const status = getCellStatus(day.dateStr, hour);

                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dayDate = new Date(day.date);
                      dayDate.setHours(0, 0, 0, 0);
                      const isPast = dayDate < today;

                      return (
                        <div
                          key={day.dateStr}
                          onClick={() => !status.isOccupied && !isPast && handleSlotClick(day.dateStr, hour)}
                          className={`h-[50px] border-r border-b border-[#2a2a2a] last:border-r-0 transition-colors relative
                            ${status.isOccupied ? '' : isPast ? 'bg-[#1a1a1a]/50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#2a2a2a]/50'}
                            ${day.isToday && !status.isOccupied ? 'bg-[#6366f1]/5' : ''}
                            ${status.isNight && !status.isOccupied ? 'bg-indigo-900/10' : ''}
                          `}
                        >
                          {status.type === 'appointment' && status.isFirstHour && status.data && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setAppointmentDetail(status.data as Appointment);
                              }}
                              className="absolute inset-1 bg-[#6366f1]/30 border border-[#6366f1]/50 rounded p-1 overflow-hidden cursor-pointer hover:bg-[#6366f1]/40 transition-colors"
                            >
                              <p className="text-white font-medium text-xs truncate">{(status.data as Appointment).user.name}</p>
                              <span className={`inline-block px-1 py-0.5 rounded text-[10px] ${getStatusColor((status.data as Appointment).status)}`}>
                                {getStatusLabel((status.data as Appointment).status)}
                              </span>
                            </div>
                          )}

                          {status.type === 'appointment' && !status.isFirstHour && (
                            <div className={`absolute inset-0 ${status.isNight ? 'bg-indigo-500/20' : 'bg-[#6366f1]/20'}`} />
                          )}

                          {status.type === 'block' && status.isFirstHour && status.data && (
                            <div
                              className="absolute inset-0 cursor-pointer group"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnblockSlot((status.data as BlockedSlot).id);
                              }}
                            >
                              <div className="absolute inset-0 overflow-hidden">
                                <div className={`absolute inset-0 ${status.isNight ? 'bg-red-900/60' : 'bg-red-600/50'}`} />
                                <div
                                  className="absolute inset-0 opacity-30"
                                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 8px)' }}
                                />
                              </div>
                              <div className="absolute inset-1 flex items-center justify-center">
                                <div className="text-center">
                                  <X className="w-4 h-4 text-white mx-auto mb-0.5" />
                                  <span className="text-white text-[9px] font-medium">INDISPONIBLE</span>
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-medium bg-red-500 px-2 py-1 rounded">Cliquer pour débloquer</span>
                              </div>
                            </div>
                          )}

                          {status.type === 'block' && !status.isFirstHour && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className={`absolute inset-0 ${status.isNight ? 'bg-red-900/50' : 'bg-red-600/40'}`} />
                              <div
                                className="absolute inset-0 opacity-20"
                                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 8px)' }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-400" />
                Prochains rendez-vous
              </h2>
              <button 
                onClick={() => setActiveTab('appointments')}
                className="text-[#6366f1] text-sm hover:underline"
              >
                Voir tout
              </button>
            </div>
            
            {upcomingAppointments.length === 0 ? (
              <EmptyState icon={Calendar} title="Aucun rendez-vous à venir" size="sm" />
            ) : (
              <div className="divide-y divide-[#2a2a2a]">
                {upcomingAppointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="p-5 flex items-center gap-4 hover:bg-[#222] transition-colors">
                    <div className="min-w-[100px]">
                      <p className="text-white font-medium">
                        {new Date(apt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-gray-500 text-sm">{formatTime(apt.startTime)} - {formatTime(apt.endTime)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{apt.user.name}</p>
                      <p className="text-gray-500 text-sm">{apt.user.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                      {getStatusLabel(apt.status)}
                    </span>
                    {apt.totalPrice && (
                      <p className="text-[#6366f1] font-semibold">{apt.totalPrice}€</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
          <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-white">
              {appointmentsView === 'list' ? 'Tous les rendez-vous' : 'Rendez-vous par artiste'}
            </h2>
            <div className="flex items-center gap-1 bg-[#121212] rounded-xl p-1">
              <button
                onClick={() => setAppointmentsView('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  appointmentsView === 'list' ? 'bg-[#6366f1] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Liste
              </button>
              <button
                onClick={() => setAppointmentsView('byArtist')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  appointmentsView === 'byArtist' ? 'bg-[#6366f1] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Par artiste
              </button>
            </div>
          </div>

          {appointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Aucun rendez-vous"
              description="Les réservations apparaîtront ici"
              size="lg"
            />
          ) : appointmentsView === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#121212]">
                  <tr>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Client</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Date</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Horaires</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Durée</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Statut</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Montant</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {appointments.map(renderAppointmentRow)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {artistGroups.map(({ user: artist, appointments: artistAppointments }) => {
                const isExpanded = expandedArtistId === artist.id;
                const pendingCount = artistAppointments.filter(a => a.status === 'pending').length;
                const totalRevenue = artistAppointments
                  .filter(a => a.status === 'completed' || a.status === 'confirmed')
                  .reduce((sum, a) => sum + (a.totalPrice || (studio?.pricePerHour || 0) * a.duration), 0);

                return (
                  <div key={artist.id}>
                    <button
                      onClick={() => setExpandedArtistId(isExpanded ? null : artist.id)}
                      className="w-full flex items-center justify-between gap-4 p-5 hover:bg-[#222] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold">
                            {artist.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{artist.name}</p>
                          <p className="text-gray-500 text-sm truncate">{artist.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-white text-sm font-medium">
                            {artistAppointments.length} session{artistAppointments.length > 1 ? 's' : ''}
                            {pendingCount > 0 && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                                {pendingCount} en attente
                              </span>
                            )}
                          </p>
                          <p className="text-[#6366f1] text-sm font-semibold">{totalRevenue}€</p>
                        </div>
                        <a
                          href={`/artiste/${artist.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#3a3a3a] rounded-lg text-xs font-medium transition-colors"
                          title="Voir la page publique et les titres de l'artiste"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Page publique</span>
                        </a>
                        <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="overflow-x-auto bg-[#121212]/40">
                        <table className="w-full">
                          <thead className="bg-[#121212]">
                            <tr>
                              <th className="text-left p-4 text-gray-400 text-sm font-medium">Client</th>
                              <th className="text-left p-4 text-gray-400 text-sm font-medium">Date</th>
                              <th className="text-left p-4 text-gray-400 text-sm font-medium">Horaires</th>
                              <th className="text-left p-4 text-gray-400 text-sm font-medium">Durée</th>
                              <th className="text-left p-4 text-gray-400 text-sm font-medium">Statut</th>
                              <th className="text-left p-4 text-gray-400 text-sm font-medium">Montant</th>
                              <th className="text-left p-4 text-gray-400 text-sm font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2a2a2a]">
                            {artistAppointments.map(renderAppointmentRow)}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
          <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Factures</h2>
          </div>

          {invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune facture"
              description="Les factures sont générées automatiquement après chaque session"
              size="lg"
            />
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-5 flex items-center gap-4 hover:bg-[#222] transition-colors">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Facture {invoice.invoiceNumber}</p>
                    <p className="text-gray-500 text-sm">{invoice.user.name} • {invoice.appointment.date}</p>
                  </div>
                  <p className="text-xl font-bold text-white">{invoice.amount}€</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {invoice.status === 'paid' ? 'Payée' : 'En attente'}
                  </span>
                  <div className="flex items-center gap-2">
                    {invoice.appointmentId && (
                      <button
                        onClick={() => window.open(`/api/appointments/${invoice.appointmentId}/receipt`, '_blank')}
                        className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Télécharger le reçu (avec commission)"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {invoice.appointmentId && (
                      <button
                        onClick={() => handleSendInvoiceEmail(invoice.appointmentId!)}
                        className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Envoyer la facture par e-mail"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
          <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Projets par client</h2>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={Music}
              title="Aucun projet"
              description="Les projets audio apparaîtront ici"
              size="lg"
            />
          ) : (
            <div className="space-y-4 p-5">
              {projects.map((project) => (
                <div key={project.id}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    {project.user && (
                      <p className="text-gray-500 text-sm">Client : {project.user.name}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {project.onelibRelease && (
                        <a
                          href={`/?public=onelib&slug=${project.onelibRelease.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity ${
                            project.onelibRelease.status === 'published'
                              ? 'bg-[#6366f1]/20 text-[#818cf8]'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                          title={project.onelibRelease.status === 'published' ? 'Voir la fiche publique OneLib' : 'Brouillon sur OneLib, pas encore publié'}
                        >
                          <Radio className="w-3 h-3" />
                          {project.onelibRelease.status === 'published' ? 'Sur OneLib' : 'Brouillon OneLib'}
                        </a>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.status === 'finished'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {project.status === 'finished' ? 'Terminé' : 'En cours'}
                      </span>
                    </div>
                  </div>
                  {project.versions && project.versions.length > 0 ? (
                    <AudioPlayerWithVersions
                      trackId={project.id}
                      title={project.title}
                      artist={project.artist}
                      bpm={project.bpm}
                      keySignature={project.key}
                      duration={project.duration || 180}
                      audioUrl={project.audioUrl || undefined}
                      sampleRate={project.sampleRate}
                      bitDepth={project.bitDepth}
                      bitrate={project.bitrate}
                      audioFormat={project.audioFormat}
                      truePeak={project.truePeak}
                      lufs={project.lufs}
                      lra={project.lra}
                      waveformPeaks={project.waveformPeaks}
                      versions={project.versions.map(v => ({
                        id: v.id,
                        label: v.label || 'Version',
                        audioUrl: v.audioUrl,
                        duration: v.duration,
                        uploadedAt: v.createdAt,
                        notes: null,
                        sampleRate: v.sampleRate,
                        bitDepth: v.bitDepth,
                        bitrate: v.bitrate,
                        audioFormat: v.audioFormat,
                        truePeak: v.truePeak,
                        lufs: v.lufs,
                        lra: v.lra,
                        waveformPeaks: v.waveformPeaks,
                      }))}
                      isPublic={project.isPublic}
                      isShared={project.isShared}
                      views={project.views}
                      studio={project.studio}
                      commentCount={project._count?.comments || 0}
                      hideStudio
                    />
                  ) : (
                    <AudioPlayer
                      trackId={project.id}
                      title={project.title}
                      artist={project.artist}
                      bpm={project.bpm}
                      keySignature={project.key}
                      duration={project.duration || 180}
                      audioUrl={project.audioUrl || undefined}
                      sampleRate={project.sampleRate}
                      bitDepth={project.bitDepth}
                      bitrate={project.bitrate}
                      audioFormat={project.audioFormat}
                      truePeak={project.truePeak}
                      lufs={project.lufs}
                      lra={project.lra}
                      waveformPeaks={project.waveformPeaks}
                      isPublic={project.isPublic}
                      isShared={project.isShared}
                      views={project.views}
                      studio={project.studio}
                      commentCount={project._count?.comments || 0}
                      hideStudio
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'hours' && studio && (
        <StudioHoursSettings studioId={studio.id} />
      )}

      {activeTab === 'vitrine' && studio && (
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#6366f1]" />
              Ma page vitrine
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Personnalisez votre carte de visite numérique visible par tous les artistes. Ajoutez des photos, votre équipement, vos réseaux sociaux et des liens personnalisés.
            </p>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#6366f1]" />
              Packs d&apos;heures prépayées
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Propose un forfait remisé chez toi : l&apos;artiste paie d&apos;avance, les heures restent valables uniquement dans ton studio.
            </p>

            {hoursPackOffers.length > 0 && (
              <div className="space-y-2 mb-4">
                {hoursPackOffers.map((offer) => (
                  <div key={offer.id} className="flex items-center justify-between bg-[#121212] rounded-lg p-3 border border-[#2a2a2a]">
                    <span className="text-white text-sm">{offer.hours}h — {offer.price}€</span>
                    <button
                      onClick={() => handleDeletePackOffer(offer.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="Retirer cette offre"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                min={1}
                value={newPackHours}
                onChange={(e) => setNewPackHours(e.target.value)}
                placeholder="Heures"
                className="w-28 bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
              />
              <input
                type="number"
                min={1}
                value={newPackPrice}
                onChange={(e) => setNewPackPrice(e.target.value)}
                placeholder="Prix total (€)"
                className="w-36 bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
              />
              <button
                onClick={handleCreatePackOffer}
                disabled={isCreatingPack || !newPackHours || !newPackPrice}
                className="flex items-center gap-1 text-sm px-3 py-2.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Créer l&apos;offre
              </button>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#6366f1]" />
              Tarification heures creuses
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Propose un prix remisé sur un créneau précis, au cas par cas — une réduction ponctuelle, pas une règle récurrente. Elle disparaît dès qu&apos;un artiste réserve avec.
            </p>

            {slotDiscounts.length > 0 && (
              <div className="space-y-2 mb-4">
                {slotDiscounts.map((discount) => (
                  <div key={discount.id} className="flex items-center justify-between bg-[#121212] rounded-lg p-3 border border-[#2a2a2a]">
                    <span className="text-white text-sm">
                      {new Date(discount.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à {formatTime(discount.startTime)} — {discount.discountedPrice}€
                    </span>
                    <button
                      onClick={() => handleDeleteDiscount(discount.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="Retirer cette réduction"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={newDiscountDate}
                onChange={(e) => setNewDiscountDate(e.target.value)}
                className="bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
              />
              <input
                type="time"
                value={newDiscountTime}
                onChange={(e) => setNewDiscountTime(e.target.value)}
                className="bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
              />
              <input
                type="number"
                min={0}
                value={newDiscountPrice}
                onChange={(e) => setNewDiscountPrice(e.target.value)}
                placeholder="Prix remisé (€)"
                className="w-36 bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
              />
              <button
                onClick={handleCreateDiscount}
                disabled={isCreatingDiscount || !newDiscountDate || !newDiscountTime || !newDiscountPrice}
                className="flex items-center gap-1 text-sm px-3 py-2.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Appliquer la réduction
              </button>
            </div>
          </div>

          <StudioShowcasePage studioId={studio.id} isOwner={true} />
        </div>
      )}
      </div>

      {reviewAppointmentId && (
        <ReviewModal
          appointmentId={reviewAppointmentId}
          direction="studio_to_artist"
          targetLabel="cet artiste"
          onClose={() => setReviewAppointmentId(null)}
        />
      )}

      {reportAppointmentId && (
        <ReportModal
          appointmentId={reportAppointmentId}
          onClose={() => setReportAppointmentId(null)}
        />
      )}

      {/* Modale : bloquer un créneau */}
      {showBlockModal && selectedBlockSlot && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6 text-[#6366f1]" />
                Bloquer ce créneau
              </h2>
              <button onClick={() => { setShowBlockModal(false); setSelectedBlockSlot(null); }} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-[#2a2a2a] rounded-lg p-4 mb-6">
              <p className="text-white font-medium mb-2 capitalize">
                {new Date(selectedBlockSlot.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-[#6366f1] font-semibold text-lg">
                {selectedBlockSlot.hour}h - {selectedBlockSlot.hour + 2}h (2h)
              </p>
            </div>

            <p className="text-gray-400 text-sm mb-6">
              Ce créneau sera marqué comme non disponible. Les artistes ne pourront pas le réserver.
            </p>

            <div className="flex gap-3">
              <button onClick={() => { setShowBlockModal(false); setSelectedBlockSlot(null); }} className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-lg font-medium hover:bg-[#3a3a3a]">
                Annuler
              </button>
              <button
                onClick={() => {
                  handleBlockSlot(selectedBlockSlot.date, selectedBlockSlot.hour);
                  setShowBlockModal(false);
                  setSelectedBlockSlot(null);
                }}
                className="flex-1 bg-[#6366f1] text-white py-3 rounded-lg font-medium hover:bg-[#5558e3] flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Bloquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale : détail d'un rendez-vous (depuis la grille) */}
      {appointmentDetail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-6 h-6 text-[#6366f1]" />
                Détails du rendez-vous
              </h2>
              <button onClick={() => setAppointmentDetail(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-[#2a2a2a] rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm mb-2">Client</p>
              <p className="text-white font-semibold text-lg">{appointmentDetail.user.name}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <a href={`mailto:${appointmentDetail.user.email}`} className="flex items-center gap-1 text-[#6366f1] text-sm hover:underline">
                  <Mail className="w-3 h-3" />
                  {appointmentDetail.user.email}
                </a>
                {appointmentDetail.user.phone && (
                  <a href={`tel:${appointmentDetail.user.phone}`} className="flex items-center gap-1 text-gray-400 text-sm hover:text-white">
                    <Phone className="w-3 h-3" />
                    {appointmentDetail.user.phone}
                  </a>
                )}
              </div>
            </div>

            <div className="bg-[#2a2a2a] rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#6366f1]/20 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-[#6366f1]" />
                </div>
                <div>
                  <p className="text-white font-medium capitalize">
                    {new Date(appointmentDetail.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-[#6366f1] font-semibold">{formatTime(appointmentDetail.startTime)} - {formatTime(appointmentDetail.endTime)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 p-3 bg-[#121212] rounded-lg">
              <div>
                <p className="text-gray-400 text-xs">Statut</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointmentDetail.status)}`}>
                  {getStatusLabel(appointmentDetail.status)}
                </span>
              </div>
              {appointmentDetail.totalPrice && (
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Total</p>
                  <p className="text-[#6366f1] font-bold text-2xl">{appointmentDetail.totalPrice}€</p>
                </div>
              )}
            </div>

            {appointmentDetail.notes && (
              <div className="bg-[#2a2a2a] rounded-lg p-4 mb-4">
                <p className="text-gray-400 text-sm mb-1">Notes</p>
                <p className="text-white text-sm">{appointmentDetail.notes}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setAppointmentDetail(null)} className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-lg font-medium hover:bg-[#3a3a3a]">
                Fermer
              </button>
              {appointmentDetail.status === 'pending' && (
                <button
                  onClick={() => {
                    handleStatusChange(appointmentDetail.id, 'confirmed');
                    setAppointmentDetail(null);
                  }}
                  className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Confirmer
                </button>
              )}
              {(appointmentDetail.status === 'pending' || appointmentDetail.status === 'confirmed') && (
                <button
                  onClick={() => {
                    handleStatusChange(appointmentDetail.id, 'cancelled');
                    setAppointmentDetail(null);
                  }}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
