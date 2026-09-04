'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Star, AlertCircle, Check, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Studio {
  id: string;
  name: string;
  location: string;
  pricePerHour: number;
  rating: number;
  type: string;
  imageUrl?: string;
  equipment?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  selected: boolean;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  notes?: string | null;
  totalPrice?: number | null;
  studio: { id: string; name: string; location: string };
}

export default function RendezvousPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [recommendedStudios, setRecommendedStudios] = useState<Studio[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmingSlot, setConfirmingSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'booking' | 'upcoming' | 'past'>('booking');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStudio) {
      fetchSlots();
    }
  }, [selectedStudio, selectedDate]);

  const fetchData = async () => {
    try {
      const [rdvRes, studiosRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/studios')
      ]);
      const rdvData = await rdvRes.json();
      const studiosData = await studiosRes.json();
      setAppointments(rdvData.appointments || []);
      setStudios(studiosData.studios || []);
      
      // Auto-select first studio
      if (studiosData.studios?.length > 0) {
        setSelectedStudio(studiosData.studios[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSlots = async () => {
    if (!selectedStudio) return;
    
    setLoadingSlots(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`/api/studios/${selectedStudio.id}/slots?date=${dateStr}`);
      const data = await res.json();
      setSlots(data.slots || []);
      
      // If no slots available, find recommended studios
      const availableSlots = (data.slots || []).filter((s: TimeSlot) => s.available);
      if (availableSlots.length === 0) {
        findRecommendedStudios();
      } else {
        setRecommendedStudios([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      // Generate default slots
      generateDefaultSlots();
    } finally {
      setLoadingSlots(false);
    }
  };

  const generateDefaultSlots = () => {
    const defaultSlots: TimeSlot[] = [];
    for (let hour = 10; hour < 22; hour += 2) {
      defaultSlots.push({
        startTime: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${(hour + 2).toString().padStart(2, '0')}:00`,
        available: true,
        selected: false
      });
    }
    setSlots(defaultSlots);
  };

  const findRecommendedStudios = async () => {
    if (!selectedStudio) return;
    
    try {
      const res = await fetch('/api/studios');
      const data = await res.json();
      const allStudios: Studio[] = data.studios || [];
      
      // Filter similar studios (same location area, similar price range)
      const similar = allStudios
        .filter(s => s.id !== selectedStudio.id)
        .map(s => {
          let score = 0;
          // Similar price (±20%)
          if (Math.abs(s.pricePerHour - selectedStudio.pricePerHour) / selectedStudio.pricePerHour < 0.3) score += 3;
          // Same type
          if (s.type === selectedStudio.type) score += 2;
          // Good rating
          if (s.rating >= 4.5) score += 1;
          return { ...s, score };
        })
        .sort((a, b) => (b as any).score - (a as any).score)
        .slice(0, 3);
      
      setRecommendedStudios(similar);
    } catch (error) {
      console.error('Error finding recommendations:', error);
    }
  };

  const toggleSlot = (index: number) => {
    if (!slots[index].available) return;
    
    setSlots(prev => prev.map((slot, i) => ({
      ...slot,
      selected: i === index ? !slot.selected : slot.selected
    })));
  };

  const handleBooking = () => {
    const selected = slots.filter(s => s.selected);
    if (selected.length === 0) return;
    
    setConfirmingSlot(selected[0]);
    setShowConfirmation(true);
  };

  const confirmBooking = async () => {
    if (!selectedStudio || !confirmingSlot) return;
    
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: selectedStudio.id,
          date: selectedDate.toISOString().split('T')[0],
          startTime: confirmingSlot.startTime,
          endTime: confirmingSlot.endTime,
          duration: 2,
          notes
        })
      });

      if (res.ok) {
        setShowConfirmation(false);
        setConfirmingSlot(null);
        setNotes('');
        fetchSlots();
        fetchData();
        setActiveTab('upcoming');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    
    // Don't allow past dates
    if (newDate < new Date(new Date().setHours(0, 0, 0, 0))) return;
    
    setSelectedDate(newDate);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long'
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const selectedCount = slots.filter(s => s.selected).length;
  const totalPrice = selectedStudio && selectedCount > 0 
    ? selectedStudio.pricePerHour * 2 * selectedCount 
    : 0;

  const upcomingRdvs = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));
  const pastRdvs = appointments.filter(a => ['completed', 'cancelled'].includes(a.status));

  return (
    <div className="p-6 lg:p-8">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('booking')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'booking'
              ? 'bg-[#6366f1] text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Réserver
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'upcoming'
              ? 'bg-[#6366f1] text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
          }`}
        >
          <Clock className="w-4 h-4" />
          À venir ({upcomingRdvs.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === 'past'
              ? 'bg-[#6366f1] text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
          }`}
        >
          Historique
        </button>
      </div>

      {/* Booking Tab */}
      {activeTab === 'booking' && (
        <>
          {isLoading ? (
            <div className="space-y-6">
              <div className="h-20 bg-[#1a1a1a] rounded-xl animate-pulse" />
              <div className="grid grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[#1a1a1a] rounded-xl animate-pulse" />)}
              </div>
            </div>
          ) : (
            <>
              {/* Selected Studio Card */}
              {selectedStudio && (
                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a] mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {selectedStudio.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{selectedStudio.name}</h3>
                      <div className="flex items-center gap-3 text-gray-400 text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {selectedStudio.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {selectedStudio.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-[#6366f1] font-semibold mt-1">
                        {selectedStudio.pricePerHour}€/h
                      </p>
                    </div>
                    <select
                      value={selectedStudio.id}
                      onChange={(e) => {
                        const studio = studios.find(s => s.id === e.target.value);
                        if (studio) setSelectedStudio(studio);
                      }}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 text-sm border border-[#3a3a3a]"
                    >
                      {studios.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Date Navigation */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 bg-[#1a1a1a] rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <p className="text-white font-semibold capitalize">
                    {formatDateShort(selectedDate)}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {selectedDate.toLocaleDateString('fr-FR', { year: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 bg-[#1a1a1a] rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Time Slots Grid */}
              <div className="mb-6">
                <h3 className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Créneaux de 2h disponibles
                </h3>
                
                {loadingSlots ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <div key={i} className="h-20 bg-[#1a1a1a] rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {slots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => toggleSlot(index)}
                        disabled={!slot.available}
                        className={`relative p-4 rounded-xl text-center transition-all ${
                          !slot.available
                            ? 'bg-[#1a1a1a] border border-[#2a2a2a] cursor-not-allowed opacity-50'
                            : slot.selected
                              ? 'bg-[#6366f1] border-2 border-[#6366f1] text-white'
                              : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#6366f1] text-white'
                        }`}
                      >
                        <p className="font-semibold">{slot.startTime}</p>
                        <p className="text-sm opacity-70">{slot.endTime}</p>
                        {!slot.available && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                        {slot.selected && (
                          <Check className="absolute top-1 right-1 w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* No Slots Warning + Recommendations */}
              {slots.length > 0 && slots.every(s => !s.available) && recommendedStudios.length > 0 && (
                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#f59e0b]/30 mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Aucun créneau disponible</p>
                      <p className="text-gray-400 text-sm">Voici des studios similaires avec des disponibilités :</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {recommendedStudios.map(studio => (
                      <button
                        key={studio.id}
                        onClick={() => setSelectedStudio(studio)}
                        className="bg-[#121212] rounded-xl p-4 text-left hover:bg-[#222] transition-colors border border-[#2a2a2a] hover:border-[#6366f1]"
                      >
                        <p className="text-white font-medium">{studio.name}</p>
                        <p className="text-gray-400 text-sm">{studio.location}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[#6366f1] font-semibold">{studio.pricePerHour}€/h</span>
                          <span className="flex items-center gap-1 text-yellow-400 text-sm">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            {studio.rating.toFixed(1)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking Summary */}
              {selectedCount > 0 && (
                <div className="fixed bottom-20 lg:bottom-6 left-6 right-6 lg:left-72 lg:right-8 z-30">
                  <div className="bg-[#6366f1] rounded-2xl p-4 shadow-xl flex items-center justify-between max-w-5xl mx-auto">
                    <div>
                      <p className="text-white font-semibold">
                        {selectedCount} créneau{selectedCount > 1 ? 'x' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
                      </p>
                      <p className="text-white/70 text-sm">{totalPrice.toFixed(0)}€ total</p>
                    </div>
                    <button
                      onClick={handleBooking}
                      className="bg-white text-[#6366f1] px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Réserver
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Upcoming Tab */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingRdvs.length === 0 ? (
            <div className="text-center py-12 bg-[#1a1a1a] rounded-xl">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Aucun rendez-vous à venir</p>
            </div>
          ) : (
            upcomingRdvs.map((rdv) => (
              <div key={rdv.id} className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-medium capitalize">{formatDate(rdv.date)}</p>
                    <p className="text-[#6366f1] font-semibold text-xl">{rdv.startTime} - {rdv.endTime}</p>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    rdv.status === 'confirmed' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {rdv.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{rdv.studio.name}</span>
                  <span className="text-gray-600">•</span>
                  <span className="text-sm">{rdv.duration}h</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Past Tab */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          {pastRdvs.length === 0 ? (
            <div className="text-center py-12 bg-[#1a1a1a] rounded-xl">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Aucun historique</p>
            </div>
          ) : (
            pastRdvs.map((rdv) => (
              <div key={rdv.id} className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a] opacity-70">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium capitalize">{formatDate(rdv.date)}</p>
                    <p className="text-gray-400">{rdv.startTime} - {rdv.studio.name}</p>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    rdv.status === 'cancelled' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {rdv.status === 'cancelled' ? 'Annulé' : 'Terminé'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && confirmingSlot && selectedStudio && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Confirmer la réservation</h2>
              <button onClick={() => setShowConfirmation(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-[#121212] rounded-xl p-4 mb-4">
              <p className="text-white font-medium">{selectedStudio.name}</p>
              <p className="text-[#6366f1] font-semibold text-lg mt-1">
                {confirmingSlot.startTime} - {confirmingSlot.endTime}
              </p>
              <p className="text-gray-400 text-sm capitalize">{formatDate(selectedDate.toISOString())}</p>
              <p className="text-white font-semibold mt-2">{(selectedStudio.pricePerHour * 2).toFixed(0)}€</p>
            </div>
            
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations complémentaires..."
                className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] min-h-[80px]"
              />
            </div>
            
            <div className="bg-[#6366f1]/10 border border-[#6366f1]/30 rounded-xl p-3 mb-4">
              <p className="text-[#6366f1] text-sm">
                💳 Une empreinte de {(selectedStudio.pricePerHour * 2).toFixed(0)}€ sera pré-autorisée. 
                Aucun débit en cas d'annulation 24h avant.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 bg-[#2a2a2a] text-white py-3 rounded-lg font-medium hover:bg-[#3a3a3a] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmBooking}
                className="flex-1 bg-[#6366f1] text-white py-3 rounded-lg font-medium hover:bg-[#5558e3] transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
