'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  appointmentId: string | null;
  readAt: string | null;
  createdAt: string;
}

// Pas de push serveur->navigateur possible sans que l'onglet soit ouvert :
// on complète avec un polling léger pour que le badge se mette à jour même
// sans rouvrir la page (rappels 2h, fin de session envoyés par le scheduler).
const POLL_INTERVAL_MS = 30_000;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silencieux : le badge reste simplement à sa dernière valeur connue
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      // best-effort
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch {
      // best-effort
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#ef4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-xl z-50">
          <div className="flex items-center justify-between p-3 border-b border-[#2a2a2a] sticky top-0 bg-[#1a1a1a]">
            <span className="text-white font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-[#6366f1] hover:text-[#818cf8] flex items-center gap-1">
                <Check className="w-3 h-3" /> Tout marquer lu
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-sm text-center p-6">Aucune notification pour le moment</p>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.readAt && markAsRead(n.id)}
                  className={`w-full text-left p-3 hover:bg-[#222] transition-colors ${!n.readAt ? 'bg-[#6366f1]/5' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] mt-1.5 flex-shrink-0" />}
                    <div className={`min-w-0 ${n.readAt ? 'ml-3.5' : ''}`}>
                      <p className="text-white text-sm font-medium truncate">{n.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-gray-600 text-[11px] mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
