'use client';

import { useEffect, useState } from 'react';
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
  Percent,
  QrCode,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { PLATFORM_COMMISSION_RATE } from '@/lib/tax-config';

interface PublicProfile {
  bio: string;
  city: string;
  genre: string;
  instagram: string;
  spotify: string;
  soundcloud: string;
  youtube: string;
  website: string;
}

const emptyProfile: PublicProfile = {
  bio: '', city: '', genre: '', instagram: '', spotify: '', soundcloud: '', youtube: '', website: '',
};

export default function ReglagesPage() {
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const logout = useAppStore((state) => state.logout);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profile, setProfile] = useState<PublicProfile>(emptyProfile);
  const [editProfile, setEditProfile] = useState<PublicProfile>(emptyProfile);
  const [studioId, setStudioId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const isStudioOwner = user?.role === 'studio_owner';
  const publicPath = isStudioOwner ? (studioId ? `/studio/${studioId}` : null) : `/artiste/${user?.id}`;

  useEffect(() => {
    if (!user) return;
    fetch('/api/user').then(res => res.json()).then(data => {
      if (data.user) {
        setProfile({
          bio: data.user.bio || '', city: data.user.city || '', genre: data.user.genre || '',
          instagram: data.user.instagram || '', spotify: data.user.spotify || '',
          soundcloud: data.user.soundcloud || '', youtube: data.user.youtube || '', website: data.user.website || '',
        });
      }
    }).catch(() => {});

    if (isStudioOwner) {
      fetch('/api/studios').then(res => res.json()).then(data => {
        const owned = data.studios?.find((s: any) => s.ownerId === user.id || s.owner?.id === user.id);
        if (owned) setStudioId(owned.id);
      }).catch(() => {});
    }
  }, [user, isStudioOwner]);

  useEffect(() => {
    if (!publicPath) return;
    const qrEndpoint = isStudioOwner ? `/api/studios/${studioId}/qrcode` : `/api/artists/${user?.id}/qrcode`;
    fetch(qrEndpoint).then(res => res.json()).then(data => setQrDataUrl(data.dataUrl || null)).catch(() => {});
  }, [publicPath, isStudioOwner, studioId, user?.id]);

  const copyPublicLink = () => {
    if (!publicPath) return;
    navigator.clipboard.writeText(`${window.location.origin}${publicPath}`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleEdit = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditProfile(profile);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          ...(!isStudioOwner ? editProfile : {}),
        })
      });

      if (!res.ok) {
        throw new Error('Échec de la mise à jour');
      }

      const data = await res.json();
      if (user) {
        setUser({ ...user, name: data.user.name, phone: data.user.phone });
      }
      if (!isStudioOwner) {
        setProfile(editProfile);
      }
      setMessage('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Erreur lors de la mise à jour du profil');
    } finally {
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    }
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
        { icon: Phone, label: 'Téléphone', value: user?.phone || 'Non renseigné' },
        { icon: Lock, label: 'Mot de passe', value: '••••••••' },
      ],
    },
    {
      title: 'Paiement',
      items: [
        { icon: CreditCard, label: 'Paramètres de paiement' },
        { icon: CreditCard, label: 'Moyens de paiement' },
        ...(user?.role === 'studio_owner'
          ? [{ icon: Percent, label: 'Commission plateforme', value: `${(PLATFORM_COMMISSION_RATE * 100).toFixed(0)}%` }]
          : []),
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

            {!isStudioOwner && (
              <>
                <div className="pt-2 border-t border-[#2a2a2a]">
                  <p className="text-gray-400 text-sm mb-3">Fiche publique artiste</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Bio</label>
                  <textarea
                    value={editProfile.bio}
                    onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                    className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full min-h-[80px]"
                    placeholder="Courte présentation visible sur votre fiche publique..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Ville</label>
                    <input
                      type="text"
                      value={editProfile.city}
                      onChange={(e) => setEditProfile({ ...editProfile, city: e.target.value })}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full"
                      placeholder="Paris"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Genre musical</label>
                    <input
                      type="text"
                      value={editProfile.genre}
                      onChange={(e) => setEditProfile({ ...editProfile, genre: e.target.value })}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full"
                      placeholder="Rap, Pop, Electro..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Instagram</label>
                    <input
                      type="text"
                      value={editProfile.instagram}
                      onChange={(e) => setEditProfile({ ...editProfile, instagram: e.target.value })}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full"
                      placeholder="@pseudo"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Site web</label>
                    <input
                      type="text"
                      value={editProfile.website}
                      onChange={(e) => setEditProfile({ ...editProfile, website: e.target.value })}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Spotify</label>
                    <input
                      type="text"
                      value={editProfile.spotify}
                      onChange={(e) => setEditProfile({ ...editProfile, spotify: e.target.value })}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full"
                      placeholder="https://open.spotify.com/artist/..."
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">SoundCloud</label>
                    <input
                      type="text"
                      value={editProfile.soundcloud}
                      onChange={(e) => setEditProfile({ ...editProfile, soundcloud: e.target.value })}
                      className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full"
                      placeholder="https://soundcloud.com/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">YouTube</label>
                  <input
                    type="text"
                    value={editProfile.youtube}
                    onChange={(e) => setEditProfile({ ...editProfile, youtube: e.target.value })}
                    className="bg-[#2a2a2a] text-white rounded-lg px-3 py-2 w-full"
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Fiche publique / QR code */}
      {publicPath && (
        <div className="mb-8 bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
          <h2 className="text-white font-semibold mb-4">
            {isStudioOwner ? 'Ma vitrine publique' : 'Ma fiche publique'}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => qrDataUrl && setShowQrModal(true)}
              className="w-20 h-20 rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0"
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR code" className="w-full h-full object-cover" />
              ) : (
                <QrCode className="w-7 h-7 text-gray-400" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-sm mb-2">
                {isStudioOwner
                  ? 'Cette page est visible par tous, sans connexion. Partagez-la ou affichez son QR code.'
                  : 'Votre fiche artiste est visible par tous, sans connexion. Partagez-la ou affichez son QR code.'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={publicPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6366f1] hover:text-[#818cf8] text-sm font-medium"
                >
                  Voir la page →
                </a>
                <button
                  onClick={copyPublicLink}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {linkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {linkCopied ? 'Lien copié' : 'Copier le lien'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* QR Code Modal */}
      {showQrModal && qrDataUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setShowQrModal(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center">
            <img src={qrDataUrl} alt="QR code" className="w-full rounded-xl mb-4" />
            <p className="text-[#121212] font-semibold mb-4">{user?.name}</p>
            <a
              href={qrDataUrl}
              download={`qrcode-${(user?.name || 'studiolib').toLowerCase().replace(/\s+/g, '-')}.png`}
              className="inline-block w-full bg-[#121212] text-white py-3 rounded-xl font-medium hover:bg-black transition-colors"
            >
              Télécharger le QR code
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
