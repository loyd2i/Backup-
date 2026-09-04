'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { MapPin, Star, Clock, Phone, ChevronLeft, Calendar, AlertCircle, Users, Wrench, Check } from 'lucide-react';

interface Studio {
  id: string;
  name: string;
  location: string;
  address?: string | null;
  description?: string | null;
  type: string;
  pricePerHour: number;
  rating: number;
  equipment?: string | null;
  capacity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  owner?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  availabilities?: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[];
  pricingTiers?: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    duration: number;
    unit: string;
  }[];
  blocks?: {
    id: string;
    date: Date;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
  }[];
}

interface TimeSlot {
  time: string;
  endTime: string;
  available: boolean;
  reason?: string;
}

interface Props {
  studioId: string;
  onClose: () => void;
}

const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function StudioDetail({ studioId, onClose }: Props) {
  const user = useAppStore((state) => state.user);
  const [studio, setStudio] = useState<Studio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Booking state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'pricing' | 'booking'>('info');
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    fetchStudio();
  }, [studioId]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchStudio = async () => {
    try {
      const res = await fetch(`/api/studios/${studioId}`);
      const data = await res.json();
      setStudio(data.studio);
      
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    } catch (error) {
      console.error('Error fetching studio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;
    
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/slots?studioId=${studioId}&date=${selectedDate}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const calculatePrice = () => {
    if (!studio || !selectedSlot) return 0;
    return studio.pricePerHour * 2; // 2-hour slots
  };

  const handleBooking = async () => {
    if (!user || !studio || !selectedSlot || !selectedDate) return;
    
    setIsBooking(true);
    
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: studio.id,
          date: selectedDate,
          startTime: selectedSlot.time,
          duration: 2, // 2-hour slots
          notes
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Send confirmation email
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'confirmation',
            appointmentId: data.appointment.id
          })
        });
        
        setBookingSuccess(true);
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Error booking:', error);
    } finally {
      setIsBooking(false);
    }
  };

  const getDayAvailability = (dayOfWeek: number) => {
    return studio?.availabilities?.find(a => a.dayOfWeek === dayOfWeek);
  };

  // Generate next 14 days for date selection
  const getDateOptions = () => {
    const dates: { date: string; dayName: string; dayNum: number; monthName: string; available: boolean }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const availability = getDayAvailability(dayOfWeek);
      
      dates.push({
        date: dateStr,
        dayName: dayNames[dayOfWeek].substring(0, 3),
        dayNum: date.getDate(),
        monthName: monthNames[date.getMonth()].substring(0, 3),
        available: !!availability && availability.isActive
      });
    }
    
    return dates;
  };

  // Group slots by morning/afternoon/evening
  const groupSlotsByPeriod = () => {
    const morning = availableSlots.filter(s => parseInt(s.time.split(':')[0]) < 12);
    const afternoon = availableSlots.filter(s => {
      const hour = parseInt(s.time.split(':')[0]);
      return hour >= 12 && hour < 18;
    });
    const evening = availableSlots.filter(s => parseInt(s.time.split(':')[0]) >= 18);
    
    return { morning, afternoon, evening };
  };

  // Render checkbox-style slot selector (Doctolib inspired)
  const renderSlotCheckbox = (slot: TimeSlot) => {
    const isSelected = selectedSlot?.time === slot.time;
    const isUnavailable = !slot.available;
    
    return (
      <label 
        key={slot.time}
        className={`
          relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
          ${isUnavailable 
            ? 'bg-[#1a1a1a] border-[#252525] cursor-not-allowed opacity-50' 
            : isSelected
              ? 'bg-[#6366f1]/10 border-[#6366f1] shadow-lg shadow-[#6366f1]/20'
              : 'bg-[#1a1a1a] border-[#3a3a3a] hover:border-[#6366f1]/50 hover:bg-[#6366f1]/5'
          }
        `}
        title={isUnavailable ? slot.reason : `${slot.time} - ${slot.endTime}`}
      >
        <div className={`
          w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${isUnavailable 
            ? 'border-[#333] bg-[#222]' 
            : isSelected 
              ? 'border-[#6366f1] bg-[#6366f1]' 
              : 'border-[#555] bg-transparent'
          }
        `}>
          {isSelected && !isUnavailable && (
            <Check className="w-3 h-3 text-white" />
          )}
          {isUnavailable && (
            <div className="w-2 h-0.5 bg-[#444] rotate-45" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isUnavailable ? 'text-gray-600 line-through' : 'text-white'}`}>
            {slot.time}
          </p>
        </div>
        
        <div className="text-right">
          <p className={`text-xs ${isUnavailable ? 'text-gray-600' : 'text-gray-400'}`}>
            {slot.endTime}
          </p>
          <p className={`text-xs font-medium ${isUnavailable ? 'text-gray-700' : 'text-[#6366f1]'}`}>
            2h
          </p>
        </div>
        
        {!isUnavailable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => setSelectedSlot(slot)}
            className="sr-only"
          />
        )}
      </label>
    );
  };

  const renderSlotGrid = (slots: TimeSlot[], title: string, icon: string) => {
    if (slots.length === 0) return null;
    
    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{icon}</span>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {slots.map(renderSlotCheckbox)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-[#2a2a2a] rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-[#2a2a2a] rounded w-1/3 mb-8"></div>
            <div className="h-32 bg-[#2a2a2a] rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
          <p className="text-white">Studio non trouvé</p>
          <button onClick={onClose} className="mt-4 text-[#6366f1]">Fermer</button>
        </div>
      </div>
    );
  }

  const { morning, afternoon, evening } = groupSlotsByPeriod();

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#2a2a2a] p-4 flex items-center justify-between z-10">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            Retour
          </button>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            studio.type === 'professionnel' 
              ? 'bg-[#6366f1]/20 text-[#6366f1]' 
              : 'bg-[#f59e0b]/20 text-[#f59e0b]'
          }`}>
            {studio.type === 'professionnel' ? 'Studio Pro' : 'Home Studio'}
          </span>
        </div>

        {bookingSuccess ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Réservation confirmée !</h2>
            <p className="text-gray-400 mb-4">Un email de confirmation vous a été envoyé.</p>
            <p className="text-gray-500 text-sm">Vous serez redirigé automatiquement...</p>
          </div>
        ) : (
          <>
            {/* Studio Info */}
            <div className="p-6 border-b border-[#2a2a2a]">
              <h1 className="text-2xl font-bold text-white mb-2">{studio.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {studio.location}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {studio.rating.toFixed(1)}
                </span>
                {studio.capacity && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {studio.capacity} pers.
                  </span>
                )}
              </div>
              {studio.description && (
                <p className="text-gray-300">{studio.description}</p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#2a2a2a]">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'info' 
                    ? 'text-[#6366f1] border-b-2 border-[#6366f1]' 
                    : 'text-gray-400'
                }`}
              >
                Horaires
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'pricing' 
                    ? 'text-[#6366f1] border-b-2 border-[#6366f1]' 
                    : 'text-gray-400'
                }`}
              >
                Tarifs
              </button>
              <button
                onClick={() => setActiveTab('booking')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'booking' 
                    ? 'text-[#6366f1] border-b-2 border-[#6366f1]' 
                    : 'text-gray-400'
                }`}
              >
                Réserver
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'info' && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Horaires d'ouverture</h3>
                  <div className="space-y-2">
                    {dayNames.map((day, index) => {
                      const avail = getDayAvailability(index);
                      return (
                        <div key={index} className="flex justify-between py-2 border-b border-[#2a2a2a]">
                          <span className="text-gray-400">{day}</span>
                          {avail ? (
                            <span className="text-white">{avail.startTime} - {avail.endTime}</span>
                          ) : (
                            <span className="text-gray-600 bg-[#2a2a2a] px-2 py-0.5 rounded text-xs">Fermé</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {studio.equipment && (
                    <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
                      <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                        <Wrench className="w-5 h-5" />
                        Équipement
                      </h3>
                      <p className="text-gray-300 text-sm">{studio.equipment}</p>
                    </div>
                  )}
                  
                  {studio.owner?.phone && (
                    <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
                      <h3 className="text-lg font-medium text-white mb-3">Contact</h3>
                      <p className="text-gray-400 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {studio.owner.phone}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pricing' && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Grille tarifaire</h3>
                  <div className="space-y-3">
                    {studio.pricingTiers && studio.pricingTiers.length > 0 ? (
                      studio.pricingTiers.map((tier) => (
                        <div key={tier.id} className="bg-[#2a2a2a] rounded-xl p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-white font-medium">{tier.name}</h4>
                              {tier.description && (
                                <p className="text-gray-500 text-sm mt-1">{tier.description}</p>
                              )}
                              {tier.duration > 0 && (
                                <p className="text-gray-400 text-sm mt-1">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  {tier.duration}h
                                </p>
                              )}
                            </div>
                            <span className="text-[#6366f1] font-bold text-xl">{tier.price}€</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="bg-[#2a2a2a] rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-white font-medium">Créneau 2h</h4>
                              <p className="text-gray-400 text-sm">Séance standard de 2 heures</p>
                            </div>
                            <span className="text-[#6366f1] font-bold text-xl">{studio.pricePerHour * 2}€</span>
                          </div>
                        </div>
                        <div className="bg-[#2a2a2a] rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-white font-medium">Tarif horaire</h4>
                              <p className="text-gray-400 text-sm">Prix par heure supplémentaire</p>
                            </div>
                            <span className="text-[#6366f1] font-bold text-xl">{studio.pricePerHour}€/h</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'booking' && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Réserver une séance</h3>
                  <p className="text-gray-500 text-sm mb-6">Créneaux de 2 heures disponibles</p>
                  
                  {!user ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">Connectez-vous pour réserver</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Date Selection - Doctolib style horizontal scroll */}
                      <div>
                        <label className="text-gray-400 text-sm mb-3 block font-medium">Choisir une date</label>
                        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-2 px-2">
                          {getDateOptions().map((dateOpt) => (
                            <button
                              key={dateOpt.date}
                              onClick={() => dateOpt.available && setSelectedDate(dateOpt.date)}
                              disabled={!dateOpt.available}
                              className={`flex-shrink-0 w-[72px] py-3 rounded-xl border-2 text-center transition-all ${
                                !dateOpt.available
                                  ? 'bg-[#1a1a1a] border-[#252525] opacity-40 cursor-not-allowed'
                                  : selectedDate === dateOpt.date
                                    ? 'bg-[#6366f1] border-[#6366f1] text-white shadow-lg shadow-[#6366f1]/30'
                                    : 'bg-[#1a1a1a] border-[#3a3a3a] hover:border-[#6366f1]/50'
                              }`}
                            >
                              <p className={`text-xs ${selectedDate === dateOpt.date ? 'text-white/70' : 'text-gray-500'}`}>
                                {dateOpt.dayName}
                              </p>
                              <p className={`text-xl font-bold ${!dateOpt.available ? 'text-gray-600' : selectedDate === dateOpt.date ? 'text-white' : 'text-white'}`}>
                                {dateOpt.dayNum}
                              </p>
                              <p className={`text-xs ${selectedDate === dateOpt.date ? 'text-white/70' : 'text-gray-500'}`}>
                                {dateOpt.monthName}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time Slots - Checkbox style */}
                      {selectedDate && (
                        <div>
                          <label className="text-gray-400 text-sm mb-3 block font-medium">
                            Créneaux disponibles
                          </label>
                          
                          {loadingSlots ? (
                            <div className="flex justify-center py-8">
                              <div className="animate-spin w-8 h-8 border-2 border-[#6366f1] border-t-transparent rounded-full"></div>
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div className="bg-[#2a2a2a] rounded-xl p-8 text-center">
                              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                              <p className="text-gray-400 font-medium">Aucun créneau disponible</p>
                              <p className="text-gray-600 text-sm mt-1">Veuillez sélectionner un autre jour</p>
                            </div>
                          ) : (
                            <div className="bg-[#121212] rounded-xl p-4 border border-[#2a2a2a]">
                              {renderSlotGrid(morning, 'Matin', '🌅')}
                              {renderSlotGrid(afternoon, 'Après-midi', '☀️')}
                              {renderSlotGrid(evening, 'Soir', '🌙')}
                              
                              {availableSlots.some(s => !s.available) && (
                                <p className="text-gray-600 text-xs mt-3 flex items-center gap-2 pt-3 border-t border-[#2a2a2a]">
                                  <span className="w-3 h-3 bg-[#252525] rounded border border-[#333] inline-flex items-center justify-center">
                                    <div className="w-1.5 h-0.5 bg-[#444] rotate-45" />
                                  </span>
                                  Créneau non disponible (déjà réservé ou fermé)
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Selected Slot Summary */}
                      {selectedSlot && (
                        <div className="bg-gradient-to-r from-[#6366f1]/20 to-[#8b5cf6]/10 border border-[#6366f1]/40 rounded-xl p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-[#6366f1] rounded-xl flex items-center justify-center shadow-lg shadow-[#6366f1]/30">
                              <Clock className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium text-lg">
                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', { 
                                  weekday: 'long', 
                                  day: 'numeric', 
                                  month: 'long' 
                                })}
                              </p>
                              <p className="text-gray-400">
                                {selectedSlot.time} → {selectedSlot.endTime}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[#6366f1] font-bold text-3xl">{calculatePrice()}€</p>
                              <p className="text-gray-500 text-sm">2 heures</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {selectedSlot && (
                        <div>
                          <label className="text-gray-400 text-sm mb-2 block">Notes (optionnel)</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Informations complémentaires pour le studio..."
                            className="w-full bg-[#2a2a2a] text-white rounded-xl p-4 border border-[#3a3a3a] min-h-[100px] text-sm focus:outline-none focus:border-[#6366f1] transition-colors"
                          />
                        </div>
                      )}

                      {/* Book Button */}
                      <button
                        onClick={handleBooking}
                        disabled={!selectedSlot || isBooking}
                        className="w-full bg-[#6366f1] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#5558e3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6366f1]/20"
                      >
                        {isBooking ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Réservation en cours...
                          </span>
                        ) : selectedSlot 
                          ? `Réserver pour ${calculatePrice()}€`
                          : 'Sélectionnez un créneau'
                        }
                      </button>
                      
                      <p className="text-gray-600 text-xs text-center mt-3">
                        ✓ Email de confirmation automatique • ✓ Rappel 3h avant le RDV
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
