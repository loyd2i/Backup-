'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Star } from 'lucide-react';

export interface MapStudio {
  id: string;
  name: string;
  location: string;
  type: string;
  pricePerHour: number;
  rating: number;
  latitude: number;
  longitude: number;
}

function priceIcon(price: number, selected: boolean, isHomeStudio: boolean) {
  const bg = selected ? '#6366f1' : '#1a1a1a';
  const border = selected ? '#6366f1' : isHomeStudio ? '#f59e0b' : '#3a3a3a';
  const width = 40 + String(price).length * 8;
  return L.divIcon({
    className: 'studiolib-map-marker',
    html: `<div style="
      background:${bg};border:1.5px solid ${border};color:#fff;
      width:100%;height:100%;display:flex;align-items:center;justify-content:center;
      border-radius:999px;font:600 12px 'Inter',system-ui,sans-serif;
      white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.45);
      transform:scale(${selected ? 1.12 : 1});transition:transform .15s ease;
    ">${price}€</div>`,
    iconSize: [width, 28],
    iconAnchor: [width / 2, 14],
    popupAnchor: [0, -16],
  });
}

// Centre/ajuste la vue sur l'ensemble des studios visibles, sans dépendre
// d'un recalcul manuel de projection (Leaflet s'en charge nativement).
function FitToStudios({ studios }: { studios: MapStudio[] }) {
  const map = useMap();

  useEffect(() => {
    if (studios.length === 0) return;
    if (studios.length === 1) {
      map.setView([studios[0].latitude, studios[0].longitude], 13);
      return;
    }
    const bounds = L.latLngBounds(studios.map((s) => [s.latitude, s.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [studios, map]);

  return null;
}

// Recentre la carte sur le studio sélectionné depuis la liste, façon Airbnb.
function FlyToSelected({ studio }: { studio: MapStudio | null }) {
  const map = useMap();

  useEffect(() => {
    if (!studio) return;
    map.flyTo([studio.latitude, studio.longitude], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [studio, map]);

  return null;
}

interface StudiosMapProps {
  studios: MapStudio[];
  center: { lat: number; lng: number };
  selected: MapStudio | null;
  onSelect: (studio: MapStudio) => void;
  onViewDetails: (studioId: string) => void;
}

export default function StudiosMap({ studios, center, selected, onSelect, onViewDetails }: StudiosMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#1a1a1a' }}
    >
      {/* Tuiles OpenStreetMap standard : gratuites, sans clé API, aucune
          limite d'usage inattendue - contrairement à certains fonds sombres
          "gratuits" qui exigent en réalité une clé passé un faible quota. */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FitToStudios studios={studios} />
      <FlyToSelected studio={selected} />
      {studios.map((studio) => (
        <Marker
          key={studio.id}
          position={[studio.latitude, studio.longitude]}
          icon={priceIcon(studio.pricePerHour * 2, selected?.id === studio.id, studio.type !== 'professionnel')}
          eventHandlers={{ click: () => onSelect(studio) }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-semibold text-sm">{studio.name}</p>
              <p className="text-xs text-gray-500">{studio.location}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="flex items-center gap-1 text-xs">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  {studio.rating.toFixed(1)}
                </span>
                <span className="text-xs font-semibold">{studio.pricePerHour * 2}€/2h</span>
              </div>
              <button
                onClick={() => onViewDetails(studio.id)}
                className="mt-2 w-full text-xs font-medium bg-[#6366f1] text-white rounded-md py-1.5 hover:bg-[#5558e3] transition-colors"
              >
                Voir la fiche
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
