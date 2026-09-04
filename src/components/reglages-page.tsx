'use client';

import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  CreditCard,
  Globe,
  Shield,
  Key,
  LogOut,
  ChevronRight,
  Save,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function ReglagesPage() {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const handleEdit = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setMessage('Profil mis à jour avec succès');
    setIsEditing(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const settingsSections = [
    {
      title: 'Coordonnées',
      items: [
        { icon: User, label: 'Profil utilisateur' },
        { icon: Mail, label: 'E-mail', value: user?.email || '' },
        { icon: Phone, label: 'Télephone', value: user?.phone || 'Non renseigné' },
        { icon: Lock, label: 'Mot de passe', value: '••••••••' },
      ],
    },
    {
      title: 'Paiement',
      items: [
        { icon: CreditCard, label: 'Paramètres de paiement' },
        { icon: CreditCard, label: 'Moyens de paiement' },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        { icon: Globe, label: 'Pays', value: 'France' },
        { icon: Globe, label: 'Langue', value: 'Français' },
        { icon: Key, label: 'Identification à deux facteurs' },
        { icon: Shield, label: 'Chiffrement des données' },
      ],
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Réglages</h1>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-6 bg-green-500/20 text-green-400 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      {/* User Card */}
      <div className="mb-8 bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#6366f1] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-[#2a2a2a] text-white text-xl font-bold rounded-lg px-3 py-2 w-full"
              />
            ) : (
              <h2 className="text-white text-xl font-bold">{user?.name}</h2>
            )}
            <p className="text-gray-500 capitalize">{user?.role}</p>
          </div>
          {isEditing ? (
            <button
              onClick={handleSave}
              className="bg-[#6366f1] text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
          ) : (
            <button
              onClick={handleEdit}
              className="bg-[#2a2a2a] text-white px-4 py-2 rounded-lg hover:bg-[#3a3a3a]"
            >
              Modifier
            </button>
          )}
        </div>
        
        {isEditing && (
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Téléphone</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full"
                placeholder="+33 6 12 34 56 78"
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h2 className="text-gray-400 text-sm mb-3">{section.title}</h2>
            <div className="bg-[#1a1a1a] rounded-xl overflow-hidden divide-y divide-[#2a2a2a]">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <button
                    key={itemIndex}
                    className="flex items-center justify-between w-full p-4 hover:bg-[#222] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className="text-white">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.value && (
                        <span className="text-gray-500 text-sm">{item.value}</span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Confidentialité */}
        <div>
          <h2 className="text-gray-400 text-sm mb-3">Confidentialité</h2>
          <div className="bg-[#1a1a1a] rounded-xl overflow-hidden divide-y divide-[#2a2a2a]">
            <button className="flex items-center justify-between w-full p-4 hover:bg-[#222] transition-colors text-left">
              <span className="text-white">Politique de confidentialité</span>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button className="flex items-center justify-between w-full p-4 hover:bg-[#222] transition-colors text-left">
              <span className="text-white">Conditions d'utilisation</span>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-8">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full md:w-auto bg-[#ef4444]/20 text-[#ef4444] font-medium py-4 px-8 rounded-xl hover:bg-[#ef4444]/30 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
