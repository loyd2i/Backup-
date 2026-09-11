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
  Sparkles,
  Bell,
  Gift,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { PLATFORM_COMMISSION_RATE, ARTIST_COMMISSION_RATE } from '@/lib/tax-config';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/lib/subscription-config';
import { isPushSupported, getCurrentPushSubscription, subscribeToPush, unsubscribeFromPush } from '@/lib/push-client';

interface StudioSubscriptionState {
  plan: SubscriptionPlan;
  monthlyPrice: number;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

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
  const [subscription, setSubscription] = useState<StudioSubscriptionState | null>(null);
  const [subActionLoading, setSubActionLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [referralData, setReferralData] = useState<{
    referralCode: string;
    referrals: { id: string; referredUserName: string; referredUserRole: string; isActive: boolean; createdAt: string }[];
  } | null>(null);
  const [referralLinkCopied, setReferralLinkCopied] = useState(false);
  const [referralOffer, setReferralOffer] = useState('');
  const [isSavingReferralOffer, setIsSavingReferralOffer] = useState(false);
  const [referralOfferSaved, setReferralOfferSaved] = useState(false);

  const isStudioOwner = user?.role === 'studio_owner';
  const publicPath = isStudioOwner ? (studioId ? `/studio/${studioId}` : null) : `/artiste/${user?.id}`;

  useEffect(() => {
    if (!user) return;
    fetch('/api/referrals').then(res => res.json()).then(data => {
      if (data.referralCode) setReferralData(data);
    }).catch(() => {});
  }, [user]);

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
    if (!isStudioOwner || !studioId) return;
    fetch(`/api/studios/${studioId}/subscription`)
      .then(res => res.json())
      .then(data => setSubscription(data.subscription || null))
      .catch(() => {});
  }, [isStudioOwner, studioId]);

  useEffect(() => {
    if (!isStudioOwner || !studioId) return;
    fetch(`/api/studios/${studioId}`)
      .then(res => res.json())
      .then(data => setReferralOffer(data.studio?.referralOffer || ''))
      .catch(() => {});
  }, [isStudioOwner, studioId]);

  const saveReferralOffer = async () => {
    if (!studioId) return;
    setIsSavingReferralOffer(true);
    try {
      const res = await fetch(`/api/studios/${studioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralOffer }),
      });
      if (res.ok) {
        setReferralOfferSaved(true);
        setTimeout(() => setReferralOfferSaved(false), 2000);
      }
    } finally {
      setIsSavingReferralOffer(false);
    }
  };

  useEffect(() => {
    setPushSupported(isPushSupported());
    getCurrentPushSubscription().then((sub) => setPushEnabled(!!sub)).catch(() => {});
  }, []);

  const togglePush = async () => {
    setPushLoading(true);
    setPushError(null);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const result = await subscribeToPush();
        if (result.success) {
          setPushEnabled(true);
        } else {
          setPushError(result.error || 'Erreur inconnue');
        }
      }
    } finally {
      setPushLoading(false);
    }
  };

  const subscribeToPlan = async (plan: SubscriptionPlan) => {
    if (!studioId) return;
    setSubActionLoading(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error subscribing:', error);
    } finally {
      setSubActionLoading(false);
    }
  };

  const setCancelAtPeriodEnd = async (cancelAtPeriodEnd: boolean) => {
    if (!studioId) return;
    setSubActionLoading(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtPeriodEnd }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    } finally {
      setSubActionLoading(false);
    }
  };

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

  const copyReferralLink = () => {
    if (!referralData) return;
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${referralData.referralCode}`).then(() => {
      setReferralLinkCopied(true);
      setTimeout(() => setReferralLinkCopied(false), 2000);
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
          : [{ icon: Percent, label: 'Frais de service par réservation', value: `${(ARTIST_COMMISSION_RATE * 100).toFixed(0)}%` }]),
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

      {/* Notifications push */}
      {pushSupported && (
        <div className="mb-8 bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-[#6366f1]" />
              </div>
              <div>
                <p className="text-white font-semibold">Notifications push</p>
                <p className="text-gray-500 text-sm">
                  Reçois une notification sur cet appareil pour tes réservations (confirmation, rappel, fin de session).
                </p>
              </div>
            </div>
            <button
              onClick={togglePush}
              disabled={pushLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex-shrink-0 ${
                pushEnabled ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]' : 'bg-[#6366f1] text-white'
              }`}
            >
              {pushLoading ? '...' : pushEnabled ? 'Désactiver' : 'Activer'}
            </button>
          </div>
          {pushError && <p className="text-red-400 text-xs mt-3">{pushError}</p>}
        </div>
      )}

      {/* Abonnement studio */}
      {isStudioOwner && studioId && (
        <div className="mb-8 bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6366f1]" />
            Abonnement studio
          </h2>

          {subscription && subscription.status === 'active' ? (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <p className="text-white font-medium">
                    Plan {subscription.plan === 'annual' ? 'annuel' : 'mensuel sans engagement'} — {subscription.monthlyPrice}€/mois
                  </p>
                  <p className="text-gray-500 text-sm">
                    {subscription.cancelAtPeriodEnd
                      ? `Résiliation prévue le ${new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : `Prochaine échéance le ${new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                  </p>
                </div>
                {subscription.cancelAtPeriodEnd ? (
                  <button
                    onClick={() => setCancelAtPeriodEnd(false)}
                    disabled={subActionLoading}
                    className="bg-[#6366f1] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Réactiver
                  </button>
                ) : (
                  <button
                    onClick={() => setCancelAtPeriodEnd(true)}
                    disabled={subActionLoading}
                    className="bg-[#2a2a2a] text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3a3a3a] disabled:opacity-50"
                  >
                    Résilier à l'échéance
                  </button>
                )}
              </div>
              <p className="text-gray-500 text-xs">
                S'ajoute à la commission plateforme sur chaque réservation, ne la remplace pas.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-sm mb-4">
                Aucun abonnement actif. L'abonnement s'engage sur 1 an pour soutenir durablement la plateforme.
              </p>
              <button
                onClick={() => subscribeToPlan('annual')}
                disabled={subActionLoading}
                className="text-left bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg p-4 transition-colors disabled:opacity-50 w-full sm:w-auto"
              >
                <p className="text-white font-semibold">{SUBSCRIPTION_PLANS[0].label}</p>
                <p className="text-2xl font-bold text-white my-1">{SUBSCRIPTION_PLANS[0].monthlyPrice}€<span className="text-sm text-gray-400 font-normal">/mois</span></p>
                <p className="text-gray-500 text-xs">{SUBSCRIPTION_PLANS[0].description}</p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Parrainage */}
      {referralData && (
        <div className="mb-8 bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#6366f1]" />
            Parrainage
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Partage ton lien : on te préviendra dès qu'un studio ou artiste parrainé mène sa première session à terme. Studiolib ne garantit ni ne finance aucune récompense — c'est entre toi et la personne que tu parraines.
          </p>

          <div className="flex items-center gap-2 bg-[#2a2a2a] rounded-lg p-3 mb-4">
            <p className="flex-1 text-gray-300 text-sm truncate">
              {typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralData.referralCode}` : ''}
            </p>
            <button
              onClick={copyReferralLink}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#3a3a3a] text-white hover:bg-[#454545] transition-colors flex-shrink-0"
            >
              {referralLinkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {referralLinkCopied ? 'Copié' : 'Copier'}
            </button>
          </div>

          {isStudioOwner && studioId && (
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">
                Ton offre de parrainage (optionnelle, affichée sur ta fiche publique)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referralOffer}
                  onChange={(e) => setReferralOffer(e.target.value)}
                  placeholder="Ex: 1h de studio offerte pour toi et ton filleul"
                  className="flex-1 bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
                />
                <button
                  onClick={saveReferralOffer}
                  disabled={isSavingReferralOffer}
                  className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-lg bg-[#3a3a3a] text-white hover:bg-[#454545] transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {referralOfferSaved ? <Check className="w-3.5 h-3.5 text-green-400" /> : null}
                  {referralOfferSaved ? 'Enregistré' : 'Enregistrer'}
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                C'est toi qui définis et honores cette offre directement avec l'artiste concerné — la plateforme ne prélève ni ne crédite rien.
              </p>
            </div>
          )}

          {referralData.referrals.length > 0 && (
            <div className="divide-y divide-[#2a2a2a] border-t border-[#2a2a2a]">
              {referralData.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <span className="text-gray-300 text-sm">{r.referredUserName}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${r.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {r.isActive ? 'Filleul actif' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          )}
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
            <button disabled className="flex items-center justify-between w-full p-4 text-left opacity-50 cursor-not-allowed">
              <span className="text-white">Politique de confidentialité</span>
              <span className="text-[10px] uppercase tracking-wide bg-[#2a2a2a] text-gray-400 px-1.5 py-0.5 rounded">
                Bientôt disponible
              </span>
            </button>
            <button disabled className="flex items-center justify-between w-full p-4 text-left opacity-50 cursor-not-allowed">
              <span className="text-white">Conditions d'utilisation</span>
              <span className="text-[10px] uppercase tracking-wide bg-[#2a2a2a] text-gray-400 px-1.5 py-0.5 rounded">
                Bientôt disponible
              </span>
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
