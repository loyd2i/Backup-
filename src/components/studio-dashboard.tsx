'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Calendar, FileText, MessageSquare, Music, Users, Clock, Euro, TrendingUp, ChevronRight, Plus, Eye, Download, Send, Settings, Globe } from 'lucide-react';
import StudioHoursSettings from './studio-hours-settings';
import StudioShowcasePage from './studio-showcase-page';

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  notes?: string;
  totalPrice?: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

interface Studio {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  appointment: { date: string; startTime: string };
}

interface Project {
  id: string;
  title: string;
  artist: string;
  status: string;
  createdAt: string;
  user?: { name: string };
  audioUrl?: string;
}

export default function StudioDashboard() {
  const user = useAppStore((state) => state.user);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'invoices' | 'projects' | 'hours' | 'vitrine'>('overview');

  useEffect(() => {
    fetchStudioData();
  }, [user]);

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
      }
    } catch (error) {
      console.error('Error fetching studio data:', error);
    } finally {
      setIsLoading(false);
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Today's Schedule */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#6366f1]" />
                Planning du jour
              </h2>
              <span className="text-gray-500 text-sm">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            
            {todayAppointments.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Aucun rendez-vous aujourd'hui</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2a2a2a]">
                {todayAppointments.map((apt) => (
                  <div key={apt.id} className="p-5 flex items-center gap-4 hover:bg-[#222] transition-colors">
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold text-white">{formatTime(apt.startTime)}</p>
                      <p className="text-gray-500 text-sm">{apt.duration}h</p>
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
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Aucun rendez-vous à venir</p>
              </div>
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
          <div className="p-5 border-b border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white">Tous les rendez-vous</h2>
          </div>
          
          {appointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Aucun rendez-vous</p>
              <p className="text-gray-500 text-sm mt-1">Les réservations apparaîtront ici</p>
            </div>
          ) : (
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
                  {appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-[#222]">
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{apt.user.name}</p>
                          <p className="text-gray-500 text-sm">{apt.user.email}</p>
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
                        {apt.totalPrice || studio?.pricePerHour * apt.duration || 0}€
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
          <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Factures</h2>
            <button className="flex items-center gap-2 bg-[#6366f1] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#5558e3] transition-colors">
              <Plus className="w-4 h-4" />
              Nouvelle facture
            </button>
          </div>
          
          {invoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Aucune facture</p>
              <p className="text-gray-500 text-sm mt-1">Les factures sont générées automatiquement après chaque session</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-5 flex items-center gap-4 hover:bg-[#222] transition-colors">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">Facture #{invoice.id.slice(-6).toUpperCase()}</p>
                    <p className="text-gray-500 text-sm">{invoice.user.name} • {invoice.appointment.date}</p>
                  </div>
                  <p className="text-xl font-bold text-white">{invoice.amount}€</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {invoice.status === 'paid' ? 'Payée' : 'En attente'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-[#2a2a2a] rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
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
            <button className="flex items-center gap-2 bg-[#f59e0b] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#e8950a] transition-colors">
              <Plus className="w-4 h-4" />
              Nouveau projet
            </button>
          </div>
          
          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Aucun projet</p>
              <p className="text-gray-500 text-sm mt-1">Les projets audio apparaîtront ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              {projects.map((project) => (
                <div key={project.id} className="bg-[#121212] rounded-xl p-5 border border-[#2a2a2a] hover:border-[#f59e0b]/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#f59e0b] to-[#ef4444] rounded-xl flex items-center justify-center">
                      <Music className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{project.title}</p>
                      <p className="text-gray-400 text-sm">{project.artist}</p>
                      {project.user && (
                        <p className="text-gray-500 text-sm mt-1">Client: {project.user.name}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      project.status === 'finished' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {project.status === 'finished' ? 'Terminé' : 'En cours'}
                    </span>
                  </div>
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
          <StudioShowcasePage studioId={studio.id} isOwner={true} />
        </div>
      )}
    </div>
  );
}
