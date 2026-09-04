'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Share2, Music2, ArrowLeft, Eye, CheckCircle2, PenLine, Trash2,
  Link2, Check, Music, Youtube, QrCode, Download,
} from 'lucide-react';

interface EligibleTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  genre: string | null;
}

interface Release {
  id: string;
  trackId: string;
  slug: string;
  status: string; // draft, published
  description: string | null;
  soundcloudUrl: string | null;
  coverUrl: string | null;
  views: number;
  publishedAt: string | null;
  createdAt: string;
  track: {
    id: string;
    title: string;
    artist: string;
    coverUrl: string | null;
    genre: string | null;
    spotifyUrl?: string | null;
    youtubeUrl?: string | null;
    appleMusicUrl?: string | null;
    deezerUrl?: string | null;
  };
}

export default function OnelibPage() {
  const user = useAppStore((state) => state.user);
  const [releases, setReleases] = useState<Release[]>([]);
  const [eligibleTracks, setEligibleTracks] = useState<EligibleTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingTrackId, setCreatingTrackId] = useState<string | null>(null);

  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Release | null>(null);
  const [description, setDescription] = useState('');
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const accentColor = user?.role === 'studio_owner' ? '#f59e0b' : '#6366f1';

  const fetchAll = async () => {
    try {
      const [releasesRes, tracksRes] = await Promise.all([
        fetch('/api/onelib/releases'),
        fetch('/api/onelib/eligible-tracks'),
      ]);
      const releasesData = await releasesRes.json();
      const tracksData = await tracksRes.json();
      setReleases(releasesData.releases || []);
      setEligibleTracks(tracksData.tracks || []);
    } catch (error) {
      console.error('Error fetching Onelib data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openRelease = (release: Release) => {
    setSelectedReleaseId(release.id);
    setDetail(release);
    setDescription(release.description || '');
    setSoundcloudUrl(release.soundcloudUrl || '');
    setCopySuccess(false);
    setQrDataUrl(null);
  };

  const loadQrCode = async (releaseId: string) => {
    setIsLoadingQr(true);
    try {
      const res = await fetch(`/api/onelib/releases/${releaseId}/qrcode`);
      const data = await res.json();
      if (res.ok) setQrDataUrl(data.dataUrl);
    } catch (error) {
      console.error('Error loading QR code:', error);
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleCreate = async (trackId: string) => {
    setCreatingTrackId(trackId);
    try {
      const res = await fetch('/api/onelib/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchAll();
        openRelease(data.release);
      } else {
        alert(data.error || 'Erreur lors de la création de la release');
      }
    } catch (error) {
      console.error('Error creating release:', error);
    } finally {
      setCreatingTrackId(null);
    }
  };

  const handleSave = async () => {
    if (!detail) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, soundcloudUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.release);
        setReleases(prev => prev.map(r => (r.id === data.release.id ? data.release : r)));
      }
    } catch (error) {
      console.error('Error saving release:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!detail) return;
    const nextStatus = detail.status === 'published' ? 'draft' : 'published';
    setIsSaving(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.release);
        setReleases(prev => prev.map(r => (r.id === data.release.id ? data.release : r)));
      }
    } catch (error) {
      console.error('Error toggling publish state:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!confirm('Supprimer cette release Onelib ? Cette action est définitive.')) return;
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedReleaseId(null);
        setDetail(null);
        await fetchAll();
      }
    } catch (error) {
      console.error('Error deleting release:', error);
    }
  };

  const smartLinkUrl = detail ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?public=onelib&slug=${detail.slug}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(smartLinkUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  // ─── Vue détail d'une release ───
  if (selectedReleaseId && detail) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <button
          onClick={() => { setSelectedReleaseId(null); setDetail(null); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à Onelib
        </button>

        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-white">{detail.track.title}</h1>
                {detail.status === 'published' ? (
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Publiée
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-500/15 text-gray-400">
                    <PenLine className="w-3.5 h-3.5" /> Brouillon
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">{detail.track.artist}{detail.track.genre ? ` • ${detail.track.genre}` : ''}</p>
            </div>
            <button
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              title="Supprimer la release"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={handleTogglePublish}
              disabled={isSaving}
              style={{ backgroundColor: accentColor }}
              className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {detail.status === 'published' ? 'Dépublier' : 'Publier la release'}
            </button>
            <span className="flex items-center gap-1 text-gray-500 text-sm">
              <Eye className="w-4 h-4" /> {detail.views} vue{detail.views > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#121212] rounded-xl p-3 border border-[#2a2a2a]">
            <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              readOnly
              value={smartLinkUrl}
              className="flex-1 bg-transparent text-gray-300 text-sm outline-none truncate"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors flex-shrink-0"
            >
              {copySuccess ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copySuccess ? 'Copié !' : 'Copier'}
            </button>
          </div>

          <div className="mt-4">
            {qrDataUrl ? (
              <div className="flex items-center gap-4">
                <img
                  src={qrDataUrl}
                  alt="QR code de la release"
                  className="w-32 h-32 rounded-xl border border-[#2a2a2a] bg-white p-2"
                />
                <div className="flex flex-col gap-2">
                  <p className="text-gray-400 text-sm">Scanne ou télécharge le QR code pour partager la page de diffusion.</p>
                  <a
                    href={qrDataUrl}
                    download={`onelib-${detail.slug}.png`}
                    className="flex items-center gap-2 w-fit text-sm px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger le PNG
                  </a>
                </div>
              </div>
            ) : (
              <button
                onClick={() => loadQrCode(detail.id)}
                disabled={isLoadingQr}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
              >
                <QrCode className="w-4 h-4" />
                {isLoadingQr ? 'Génération...' : 'Générer le QR code'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 space-y-4">
          <h2 className="text-white font-semibold">Informations de la page de diffusion</h2>

          <div>
            <label className="text-gray-400 text-sm mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Présente ta sortie en quelques mots..."
              rows={3}
              className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-2 block flex items-center gap-2">
              <Music className="w-4 h-4" /> Lien SoundCloud
            </label>
            <input
              type="url"
              value={soundcloudUrl}
              onChange={(e) => setSoundcloudUrl(e.target.value)}
              placeholder="https://soundcloud.com/..."
              className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
            <div className="bg-[#121212] rounded-xl p-3">
              <p>Spotify</p>
              <p className="text-white text-sm mt-1">{detail.track.spotifyUrl ? 'Renseigné' : '—'}</p>
            </div>
            <div className="bg-[#121212] rounded-xl p-3">
              <p className="flex items-center gap-1"><Youtube className="w-3.5 h-3.5" /> YouTube</p>
              <p className="text-white text-sm mt-1">{detail.track.youtubeUrl ? 'Renseigné' : '—'}</p>
            </div>
            <div className="bg-[#121212] rounded-xl p-3">
              <p>Apple Music</p>
              <p className="text-white text-sm mt-1">{detail.track.appleMusicUrl ? 'Renseigné' : '—'}</p>
            </div>
            <div className="bg-[#121212] rounded-xl p-3">
              <p>Deezer</p>
              <p className="text-white text-sm mt-1">{detail.track.deezerUrl ? 'Renseigné' : '—'}</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs">
            Les liens Spotify/YouTube/Apple Music/Deezer se modifient depuis la fiche release de la track, dans Créations.
          </p>

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{ backgroundColor: accentColor }}
            className="text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Vue liste ───
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
          <Share2 className="w-7 h-7" style={{ color: accentColor }} />
          Onelib
        </h1>
        <p className="text-gray-400 mt-1">
          Le hub de diffusion de tes sorties : smart link, QR code et kit de distribution
        </p>
      </div>

      {releases.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-semibold mb-4">Mes releases</h2>
          <div className="space-y-3">
            {releases.map((release) => (
              <div
                key={release.id}
                className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 hover:border-[#3a3a3a] transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h3 className="text-white font-semibold truncate">{release.track.title}</h3>
                    {release.status === 'published' ? (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Publiée
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-500/15 text-gray-400">
                        <PenLine className="w-3.5 h-3.5" /> Brouillon
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm">{release.track.artist}</p>
                </div>
                <button
                  onClick={() => openRelease(release)}
                  style={{ backgroundColor: accentColor }}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
                >
                  Gérer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-white font-semibold mb-4">Tracks prêtes à publier</h2>
        {eligibleTracks.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-12 text-center">
            <Music2 className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Aucune track terminée disponible</p>
            <p className="text-gray-500 text-sm mt-1">
              Passe une track au statut « Terminée » dans Créations pour pouvoir la publier sur Onelib
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {eligibleTracks.map((track) => (
              <div
                key={track.id}
                className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <h3 className="text-white font-semibold truncate">{track.title}</h3>
                  <p className="text-gray-500 text-sm">{track.artist}{track.genre ? ` • ${track.genre}` : ''}</p>
                </div>
                <button
                  onClick={() => handleCreate(track.id)}
                  disabled={creatingTrackId === track.id}
                  className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#3a3a3a] transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  {creatingTrackId === track.id ? 'Création...' : 'Créer la release'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
