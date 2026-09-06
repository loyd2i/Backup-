'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import OnelibCollectionDetail from './onelib-collection-detail';
import CoverDropzone from './cover-dropzone';
import EmptyState from './ui/empty-state';
import {
  Share2, Music2, ArrowLeft, Eye, CheckCircle2, PenLine, Trash2,
  Link2, Check, Music, Youtube, QrCode, Download, Plus, X, FileSignature, Package, Users, ExternalLink, Clock,
  Disc, ListMusic, Radio,
} from 'lucide-react';

interface EligibleTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  genre: string | null;
}

interface Collaborator {
  id: string;
  name: string;
  role: string;
}

interface Release {
  id: string;
  trackId: string;
  slug: string;
  status: string; // draft, scheduled, published
  scheduledAt: string | null;
  description: string | null;
  soundcloudUrl: string | null;
  coverUrl: string | null;
  views: number;
  publishedAt: string | null;
  createdAt: string;
  authorLegalName: string | null;
  authorSignedAt: string | null;
  distributionStatus: string; // none, requested, in_review, live
  distributionRequestedAt: string | null;
  collaborators: Collaborator[];
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

interface CollectionSummary {
  id: string;
  title: string;
  kind: string; // album, playlist
  status: string; // draft, scheduled, published
  slug: string;
  views: number;
  tracks: { id: string }[];
}

const COLLABORATOR_ROLES = [
  { value: 'compositeur', label: 'Compositeur' },
  { value: 'auteur', label: 'Auteur' },
  { value: 'featuring', label: 'Featuring' },
  { value: 'producteur', label: 'Producteur' },
  { value: 'ingenieur_son', label: 'Ingénieur son' },
];

function roleLabel(role: string) {
  return COLLABORATOR_ROLES.find(r => r.value === role)?.label || role;
}

export default function OnelibPage() {
  const user = useAppStore((state) => state.user);
  const [releases, setReleases] = useState<Release[]>([]);
  const [eligibleTracks, setEligibleTracks] = useState<EligibleTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingTrackId, setCreatingTrackId] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [newCollectionKind, setNewCollectionKind] = useState<'album' | 'playlist'>('album');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Release | null>(null);
  const [description, setDescription] = useState('');
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [newCollabName, setNewCollabName] = useState('');
  const [newCollabRole, setNewCollabRole] = useState('compositeur');
  const [isAddingCollab, setIsAddingCollab] = useState(false);
  const [legalNameInput, setLegalNameInput] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isDownloadingKit, setIsDownloadingKit] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAtInput, setScheduledAtInput] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isRequestingDistribution, setIsRequestingDistribution] = useState(false);

  const accentColor = user?.role === 'studio_owner' ? '#f59e0b' : '#6366f1';

  const fetchAll = async () => {
    try {
      const [releasesRes, tracksRes, collectionsRes] = await Promise.all([
        fetch('/api/onelib/releases'),
        fetch('/api/onelib/eligible-tracks'),
        fetch('/api/onelib/collections'),
      ]);
      const releasesData = await releasesRes.json();
      const tracksData = await tracksRes.json();
      const collectionsData = await collectionsRes.json();
      setReleases(releasesData.releases || []);
      setEligibleTracks(tracksData.tracks || []);
      setCollections(collectionsData.collections || []);
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
    setNewCollabName('');
    setNewCollabRole('compositeur');
    setLegalNameInput(release.authorLegalName || '');
    setPublishError(null);
    setShowScheduler(false);
    setScheduledAtInput('');
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

  const handleAddCollaborator = async () => {
    if (!detail || !newCollabName.trim()) return;
    setIsAddingCollab(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollabName, role: newCollabRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(prev => prev ? { ...prev, collaborators: [...prev.collaborators, data.collaborator] } : prev);
        setNewCollabName('');
        setNewCollabRole('compositeur');
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
    } finally {
      setIsAddingCollab(false);
    }
  };

  const handleDeleteCollaborator = async (collaboratorId: string) => {
    if (!detail) return;
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDetail(prev => prev ? { ...prev, collaborators: prev.collaborators.filter(c => c.id !== collaboratorId) } : prev);
      }
    } catch (error) {
      console.error('Error deleting collaborator:', error);
    }
  };

  const handleSign = async () => {
    if (!detail || !legalNameInput.trim()) return;
    setIsSigning(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalName: legalNameInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.release);
        setReleases(prev => prev.map(r => (r.id === data.release.id ? data.release : r)));
      }
    } catch (error) {
      console.error('Error signing attestation:', error);
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadKit = async () => {
    if (!detail) return;
    setIsDownloadingKit(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}/kit`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onelib-${detail.slug}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading distribution kit:', error);
    } finally {
      setIsDownloadingKit(false);
    }
  };

  const handleRequestDistribution = async () => {
    if (!detail) return;
    setIsRequestingDistribution(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}/request-distribution`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.release);
        setReleases(prev => prev.map(r => (r.id === data.release.id ? data.release : r)));
      } else {
        alert(data.error || 'Erreur lors de la demande');
      }
    } catch (error) {
      console.error('Error requesting distribution:', error);
    } finally {
      setIsRequestingDistribution(false);
    }
  };

  const handleCancelDistributionRequest = async () => {
    if (!detail) return;
    setIsRequestingDistribution(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}/request-distribution`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.release);
        setReleases(prev => prev.map(r => (r.id === data.release.id ? data.release : r)));
      }
    } catch (error) {
      console.error('Error cancelling distribution request:', error);
    } finally {
      setIsRequestingDistribution(false);
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

  const handleCreateCollection = async () => {
    if (!newCollectionTitle.trim()) return;
    setIsCreatingCollection(true);
    try {
      const res = await fetch('/api/onelib/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCollectionTitle, kind: newCollectionKind }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateCollection(false);
        setNewCollectionTitle('');
        setNewCollectionKind('album');
        await fetchAll();
        setSelectedCollectionId(data.collection.id);
      } else {
        alert(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!detail) return;
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/onelib/releases/${detail.id}/cover`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.release);
        setReleases(prev => prev.map(r => (r.id === data.release.id ? data.release : r)));
      } else {
        alert(data.error || 'Erreur lors du téléversement');
      }
    } catch (error) {
      console.error('Error uploading cover:', error);
    } finally {
      setIsUploadingCover(false);
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

  const hasAnyDistributionLink = (release: Release) =>
    !!(release.track.spotifyUrl || release.track.youtubeUrl || release.track.appleMusicUrl ||
       release.track.deezerUrl || release.soundcloudUrl);

  const handleTogglePublish = async () => {
    if (!detail) return;
    setPublishError(null);
    const nextStatus = detail.status === 'published' ? 'draft' : 'published';

    if (nextStatus === 'published' && !hasAnyDistributionLink(detail)) {
      setPublishError('Ajoute au moins un lien de diffusion (Spotify, YouTube, Apple Music, Deezer ou SoundCloud) avant de publier.');
      return;
    }

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
      } else {
        setPublishError(data.error || 'Erreur lors de la publication');
      }
    } catch (error) {
      console.error('Error toggling publish state:', error);
      setPublishError('Erreur lors de la publication');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!detail || !scheduledAtInput) return;
    setPublishError(null);

    if (!hasAnyDistributionLink(detail)) {
      setPublishError('Ajoute au moins un lien de diffusion (Spotify, YouTube, Apple Music, Deezer ou SoundCloud) avant de programmer.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'scheduled', scheduledAt: new Date(scheduledAtInput).toISOString() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.release);
        setReleases(prev => prev.map(r => (r.id === data.release.id ? data.release : r)));
        setShowScheduler(false);
      } else {
        setPublishError(data.error || 'Erreur lors de la programmation');
      }
    } catch (error) {
      console.error('Error scheduling release:', error);
      setPublishError('Erreur lors de la programmation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (!detail) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/onelib/releases/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.release);
        setReleases(prev => prev.map(r => (r.id === data.release.id ? data.release : r)));
      }
    } catch (error) {
      console.error('Error cancelling schedule:', error);
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
  const artistPageUrl = detail && user
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?public=onelib-artist&artist=${user.id}&slug=${detail.slug}`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(smartLinkUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // ignore
    }
  };

  const shareArtistPage = async () => {
    try {
      await navigator.clipboard.writeText(artistPageUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
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

  // ─── Vue détail d'un album/playlist ───
  if (selectedCollectionId) {
    return (
      <OnelibCollectionDetail
        collectionId={selectedCollectionId}
        onBack={() => setSelectedCollectionId(null)}
        onDeleted={() => { setSelectedCollectionId(null); fetchAll(); }}
      />
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
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#121212] border border-[#2a2a2a] flex-shrink-0 flex items-center justify-center">
                {(detail.coverUrl || detail.track.coverUrl) ? (
                  <img src={detail.coverUrl || detail.track.coverUrl || ''} alt={detail.track.title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-white">{detail.track.title}</h1>
                  {detail.status === 'published' ? (
                    <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Publiée
                    </span>
                  ) : detail.status === 'scheduled' ? (
                    <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">
                      <Clock className="w-3.5 h-3.5" /> Programmée
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-500/15 text-gray-400">
                      <PenLine className="w-3.5 h-3.5" /> Brouillon
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">{detail.track.artist}{detail.track.genre ? ` • ${detail.track.genre}` : ''}</p>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              title="Supprimer la release"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {detail.status === 'scheduled' && detail.scheduledAt && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl p-3 text-sm mb-4 flex items-center justify-between gap-3 flex-wrap">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Publication programmée le {new Date(detail.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à {new Date(detail.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={handleCancelSchedule}
                disabled={isSaving}
                className="text-xs underline hover:no-underline disabled:opacity-50"
              >
                Annuler la programmation
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <button
              onClick={handleTogglePublish}
              disabled={isSaving}
              style={{ backgroundColor: accentColor }}
              className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {detail.status === 'published' ? 'Dépublier' : 'Publier maintenant'}
            </button>
            {detail.status !== 'published' && (
              <button
                onClick={() => setShowScheduler(prev => !prev)}
                disabled={isSaving}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                Programmer
              </button>
            )}
            <span className="flex items-center gap-1 text-gray-500 text-sm">
              <Eye className="w-4 h-4" /> {detail.views} vue{detail.views > 1 ? 's' : ''}
            </span>
          </div>

          {showScheduler && (
            <div className="flex items-center gap-2 flex-wrap bg-[#121212] rounded-xl p-3 border border-[#2a2a2a] mb-4">
              <input
                type="datetime-local"
                value={scheduledAtInput}
                onChange={(e) => setScheduledAtInput(e.target.value)}
                className="flex-1 min-w-[180px] bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
              />
              <button
                onClick={handleSchedule}
                disabled={isSaving || !scheduledAtInput}
                style={{ backgroundColor: accentColor }}
                className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
              >
                Confirmer la programmation
              </button>
            </div>
          )}

          {publishError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-4">
              {publishError}
            </div>
          )}

          {detail.status === 'draft' && !detail.authorSignedAt && (
            <div className="bg-[#121212] border border-[#2a2a2a] text-gray-400 rounded-xl p-3 text-xs mb-4">
              💡 Pense à signer l&apos;attestation d&apos;auteur (plus bas) avant de publier, pour une preuve
              d&apos;antériorité datée dès la mise en ligne.
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap bg-[#121212] rounded-xl p-3 border border-[#2a2a2a]">
            <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              readOnly
              value={smartLinkUrl}
              className="flex-1 min-w-0 bg-transparent text-gray-300 text-sm outline-none truncate"
            />
            {detail.status === 'published' && (
              <a
                href={smartLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
                Voir
              </a>
            )}
            <button
              onClick={copyLink}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors flex-shrink-0"
            >
              {copySuccess ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copySuccess ? 'Copié !' : 'Copier'}
            </button>
          </div>

          {detail.status === 'published' && (
            <button
              onClick={shareArtistPage}
              style={{ backgroundColor: accentColor }}
              className="flex items-center gap-2 text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity mt-3"
            >
              {shareSuccess ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {shareSuccess ? 'Lien copié !' : 'Partager ma page artiste'}
            </button>
          )}

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

        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Pochette</h2>
          <CoverDropzone
            currentUrl={detail.coverUrl || detail.track.coverUrl}
            onFileSelected={handleCoverUpload}
            isUploading={isUploadingCover}
            accentColor={accentColor}
          />
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

        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 space-y-4 mt-6">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Collaborateurs
          </h2>
          <p className="text-gray-500 text-xs -mt-2">
            Tous les collaborateurs crédités sur ce titre doivent figurer ici : ils apparaîtront sur la page
            de diffusion publique et dans l&apos;attestation d&apos;auteur.
          </p>

          {detail.collaborators.length > 0 && (
            <div className="space-y-2">
              {detail.collaborators.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-[#121212] rounded-lg p-3 border border-[#2a2a2a]">
                  <div>
                    <span className="text-white text-sm font-medium">{c.name}</span>
                    <span className="text-gray-500 text-xs ml-2">{roleLabel(c.role)}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCollaborator(c.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Retirer ce collaborateur"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={newCollabName}
              onChange={(e) => setNewCollabName(e.target.value)}
              placeholder="Nom du collaborateur"
              className="flex-1 min-w-[140px] bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
            />
            <select
              value={newCollabRole}
              onChange={(e) => setNewCollabRole(e.target.value)}
              className="bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] text-sm flex-shrink-0"
            >
              {COLLABORATOR_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={handleAddCollaborator}
              disabled={isAddingCollab || !newCollabName.trim()}
              className="flex items-center gap-1 text-sm px-3 py-2.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 space-y-4 mt-6">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FileSignature className="w-4 h-4" /> Attestation d&apos;auteur
          </h2>
          <p className="text-gray-500 text-xs -mt-2">
            Déclaration écrite et horodatée attestant que tu es l&apos;auteur(e) de cette œuvre (avec les
            collaborateurs listés ci-dessus). Il s&apos;agit d&apos;une preuve d&apos;antériorité auto-déclarée,
            pas d&apos;un dépôt officiel auprès de la SACEM ou d&apos;un huissier.
          </p>

          {detail.authorLegalName && detail.authorSignedAt ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-sm">
              <p className="text-green-400 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Signée par {detail.authorLegalName}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                le {new Date(detail.authorSignedAt).toLocaleDateString('fr-FR')} à {new Date(detail.authorSignedAt).toLocaleTimeString('fr-FR')}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={legalNameInput}
                onChange={(e) => setLegalNameInput(e.target.value)}
                placeholder="Ton nom légal complet"
                className="flex-1 min-w-[140px] bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none"
              />
              <button
                onClick={handleSign}
                disabled={isSigning || !legalNameInput.trim()}
                style={{ backgroundColor: accentColor }}
                className="flex items-center gap-2 text-white px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
              >
                Signer
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 mt-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-1">
            <Package className="w-4 h-4" /> Kit de distribution
          </h2>
          <p className="text-gray-500 text-xs mb-4">
            Pochette, liens de diffusion, QR code, fiche technique et attestation d&apos;auteur (si signée),
            réunis dans un fichier ZIP.
          </p>
          <button
            onClick={handleDownloadKit}
            disabled={isDownloadingKit}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isDownloadingKit ? 'Préparation...' : 'Télécharger le kit de distribution'}
          </button>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 mt-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4" /> Distribution sur les plateformes de streaming
          </h2>
          <p className="text-gray-500 text-xs mb-4">
            Envoie une demande d&apos;hébergement à l&apos;équipe Studiolib pour lancer la mise en ligne sur
            Spotify, Apple Music, Deezer... Il ne s&apos;agit pas d&apos;une soumission automatique : une
            personne traite ta demande manuellement, ce qui permet de t&apos;y prendre à l&apos;avance
            (les plateformes demandent généralement plusieurs semaines de délai).
          </p>
          {detail.distributionStatus === 'none' && (
            <button
              onClick={handleRequestDistribution}
              disabled={isRequestingDistribution}
              style={{ backgroundColor: accentColor }}
              className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isRequestingDistribution ? 'Envoi...' : 'Demander la distribution'}
            </button>
          )}
          {detail.distributionStatus === 'requested' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
              <span className="text-amber-400">
                Demande envoyée{detail.distributionRequestedAt ? ` le ${new Date(detail.distributionRequestedAt).toLocaleDateString('fr-FR')}` : ''} — en attente de traitement
              </span>
              <button
                onClick={handleCancelDistributionRequest}
                disabled={isRequestingDistribution}
                className="text-xs underline hover:no-underline disabled:opacity-50 text-gray-400"
              >
                Annuler la demande
              </button>
            </div>
          )}
          {detail.distributionStatus === 'in_review' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-sm text-blue-400">
              Demande en cours de traitement par l&apos;équipe Studiolib
            </div>
          )}
          {detail.distributionStatus === 'live' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-sm text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> En ligne sur les plateformes de streaming
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Vue liste ───
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
            <Share2 className="w-7 h-7" style={{ color: accentColor }} />
            Onelib
          </h1>
          <p className="text-gray-400 mt-1">
            Le hub de diffusion de tes sorties : smart link, QR code et kit de distribution
          </p>
          {(releases.length > 0 || collections.length > 0) && (
            <p className="flex items-center gap-1.5 text-gray-400 text-sm mt-3">
              <Eye className="w-4 h-4" />
              {releases.reduce((sum, r) => sum + r.views, 0) + collections.reduce((sum, c) => sum + c.views, 0)} vue{(releases.reduce((sum, r) => sum + r.views, 0) + collections.reduce((sum, c) => sum + c.views, 0)) > 1 ? 's' : ''} au total sur tes sorties
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreateCollection(true)}
          style={{ backgroundColor: accentColor }}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Créer un album/playlist
        </button>
      </div>

      {collections.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-semibold mb-4">Mes albums & playlists</h2>
          <div className="space-y-3">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 hover:border-[#3a3a3a] transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#6366f1]/15 text-[#818cf8] flex-shrink-0">
                      {collection.kind === 'album' ? <Disc className="w-3 h-3" /> : <ListMusic className="w-3 h-3" />}
                      {collection.kind === 'album' ? 'Album' : 'Playlist'}
                    </span>
                    <h3 className="text-white font-semibold truncate">{collection.title}</h3>
                    {collection.status === 'published' ? (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Publiée
                      </span>
                    ) : collection.status === 'scheduled' ? (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">
                        <Clock className="w-3.5 h-3.5" /> Programmée
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-500/15 text-gray-400">
                        <PenLine className="w-3.5 h-3.5" /> Brouillon
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm">{collection.tracks.length} titre{collection.tracks.length > 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setSelectedCollectionId(collection.id)}
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
                    ) : release.status === 'scheduled' ? (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400">
                        <Clock className="w-3.5 h-3.5" /> Programmée
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
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a]">
            <EmptyState
              icon={Music2}
              title="Aucune track terminée disponible"
              description="Passe une track au statut « Terminée » dans Créations pour pouvoir la publier sur Onelib"
              size="lg"
            />
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

      {showCreateCollection && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="text-xl font-bold text-white">Créer un album ou une playlist</h2>
              <button onClick={() => setShowCreateCollection(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Titre</label>
                <input
                  type="text"
                  value={newCollectionTitle}
                  onChange={(e) => setNewCollectionTitle(e.target.value)}
                  placeholder="Ex: Nuits Polaires (EP)"
                  className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewCollectionKind('album')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${
                      newCollectionKind === 'album'
                        ? 'border-[#6366f1] bg-[#6366f1]/10 text-white'
                        : 'border-[#3a3a3a] text-gray-400 hover:border-[#4a4a4a]'
                    }`}
                  >
                    <Disc className="w-4 h-4" /> Album
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCollectionKind('playlist')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${
                      newCollectionKind === 'playlist'
                        ? 'border-[#6366f1] bg-[#6366f1]/10 text-white'
                        : 'border-[#3a3a3a] text-gray-400 hover:border-[#4a4a4a]'
                    }`}
                  >
                    <ListMusic className="w-4 h-4" /> Playlist
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreateCollection}
                disabled={isCreatingCollection || !newCollectionTitle.trim()}
                style={{ backgroundColor: accentColor }}
                className="w-full text-white px-5 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isCreatingCollection ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
