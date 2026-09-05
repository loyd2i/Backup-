'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft, Eye, CheckCircle2, PenLine, Trash2, Link2, Check, QrCode, Download,
  Plus, X, FileSignature, Package, Users, ExternalLink, Clock, ChevronUp, ChevronDown, Disc, ListMusic, ImageUp, Share2,
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

interface TrackEntry {
  id: string;
  order: number;
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

interface Collection {
  id: string;
  title: string;
  kind: string; // album, playlist
  description: string | null;
  coverUrl: string | null;
  slug: string;
  status: string; // draft, scheduled, published
  scheduledAt: string | null;
  publishedAt: string | null;
  views: number;
  authorLegalName: string | null;
  authorSignedAt: string | null;
  tracks: TrackEntry[];
  collaborators: Collaborator[];
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

interface OnelibCollectionDetailProps {
  collectionId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export default function OnelibCollectionDetail({ collectionId, onBack, onDeleted }: OnelibCollectionDetailProps) {
  const user = useAppStore((state) => state.user);
  const accentColor = user?.role === 'studio_owner' ? '#f59e0b' : '#6366f1';

  const [detail, setDetail] = useState<Collection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eligibleTracks, setEligibleTracks] = useState<EligibleTrack[]>([]);
  const [description, setDescription] = useState('');
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
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAtInput, setScheduledAtInput] = useState('');
  const [selectedTrackToAdd, setSelectedTrackToAdd] = useState('');
  const [isAddingTrack, setIsAddingTrack] = useState(false);

  const fetchDetail = async () => {
    try {
      const [detailRes, tracksRes] = await Promise.all([
        fetch(`/api/onelib/collections/${collectionId}`),
        fetch(`/api/onelib/collections/${collectionId}/eligible-tracks`),
      ]);
      const detailData = await detailRes.json();
      const tracksData = await tracksRes.json();
      if (detailRes.ok) {
        setDetail(detailData.collection);
        setDescription(detailData.collection.description || '');
        setLegalNameInput(detailData.collection.authorLegalName || '');
      }
      setEligibleTracks(tracksData.tracks || []);
    } catch (error) {
      console.error('Error fetching collection detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  const hasAnyDistributionLink = (d: Collection) =>
    d.tracks.some(t => t.track.spotifyUrl || t.track.youtubeUrl || t.track.appleMusicUrl || t.track.deezerUrl);

  const handleSaveMeta = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (res.ok) setDetail(data.collection);
    } catch (error) {
      console.error('Error saving collection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/onelib/collections/${collectionId}/cover`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) setDetail(data.collection);
      else alert(data.error || 'Erreur lors du téléversement');
    } catch (error) {
      console.error('Error uploading cover:', error);
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleTogglePublish = async () => {
    if (!detail) return;
    setPublishError(null);
    const nextStatus = detail.status === 'published' ? 'draft' : 'published';

    if (nextStatus === 'published' && !hasAnyDistributionLink(detail)) {
      setPublishError('Au moins une track de la collection doit avoir un lien de diffusion (Spotify, YouTube, Apple Music ou Deezer).');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) setDetail(data.collection);
      else setPublishError(data.error || 'Erreur lors de la publication');
    } catch (error) {
      console.error('Error toggling publish:', error);
      setPublishError('Erreur lors de la publication');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!detail || !scheduledAtInput) return;
    setPublishError(null);
    if (!hasAnyDistributionLink(detail)) {
      setPublishError('Au moins une track de la collection doit avoir un lien de diffusion avant de programmer.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'scheduled', scheduledAt: new Date(scheduledAtInput).toISOString() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDetail(data.collection);
        setShowScheduler(false);
      } else {
        setPublishError(data.error || 'Erreur lors de la programmation');
      }
    } catch (error) {
      console.error('Error scheduling collection:', error);
      setPublishError('Erreur lors de la programmation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSchedule = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      const data = await res.json();
      if (res.ok) setDetail(data.collection);
    } catch (error) {
      console.error('Error cancelling schedule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cet album/playlist Onelib ? Cette action est définitive.')) return;
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}`, { method: 'DELETE' });
      if (res.ok) onDeleted();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  const handleAddTrack = async () => {
    if (!selectedTrackToAdd) return;
    setIsAddingTrack(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: selectedTrackToAdd }),
      });
      if (res.ok) {
        setSelectedTrackToAdd('');
        await fetchDetail();
      }
    } catch (error) {
      console.error('Error adding track:', error);
    } finally {
      setIsAddingTrack(false);
    }
  };

  const handleRemoveTrack = async (entryId: string) => {
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}/tracks/${entryId}`, { method: 'DELETE' });
      if (res.ok) await fetchDetail();
    } catch (error) {
      console.error('Error removing track:', error);
    }
  };

  const moveTrack = async (index: number, direction: -1 | 1) => {
    if (!detail) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= detail.tracks.length) return;
    const reordered = [...detail.tracks];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setDetail({ ...detail, tracks: reordered });
    try {
      await fetch(`/api/onelib/collections/${collectionId}/tracks/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: reordered.map(t => t.id) }),
      });
    } catch (error) {
      console.error('Error reordering tracks:', error);
      await fetchDetail();
    }
  };

  const loadQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}/qrcode`);
      const data = await res.json();
      if (res.ok) setQrDataUrl(data.dataUrl);
    } catch (error) {
      console.error('Error loading QR code:', error);
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!newCollabName.trim()) return;
    setIsAddingCollab(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}/collaborators`, {
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
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}/collaborators/${collaboratorId}`, { method: 'DELETE' });
      if (res.ok) {
        setDetail(prev => prev ? { ...prev, collaborators: prev.collaborators.filter(c => c.id !== collaboratorId) } : prev);
      }
    } catch (error) {
      console.error('Error deleting collaborator:', error);
    }
  };

  const handleSign = async () => {
    if (!legalNameInput.trim()) return;
    setIsSigning(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalName: legalNameInput }),
      });
      const data = await res.json();
      if (res.ok) setDetail(data.collection);
    } catch (error) {
      console.error('Error signing attestation:', error);
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadKit = async () => {
    setIsDownloadingKit(true);
    try {
      const res = await fetch(`/api/onelib/collections/${collectionId}/kit`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onelib-${detail?.slug}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading kit:', error);
    } finally {
      setIsDownloadingKit(false);
    }
  };

  if (isLoading || !detail) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  const smartLinkUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?public=onelib&slug=${detail.slug}`;
  const artistPageUrl = user
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

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à Onelib
      </button>

      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploadingCover}
              className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#121212] border border-[#2a2a2a] flex-shrink-0 group"
              title="Changer la pochette"
            >
              {detail.coverUrl ? (
                <img src={detail.coverUrl} alt={detail.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {detail.kind === 'album' ? <Disc className="w-8 h-8 text-gray-600" /> : <ListMusic className="w-8 h-8 text-gray-600" />}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImageUp className="w-5 h-5 text-white" />
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#6366f1]/15 text-[#818cf8]">
                  {detail.kind === 'album' ? <Disc className="w-3.5 h-3.5" /> : <ListMusic className="w-3.5 h-3.5" />}
                  {detail.kind === 'album' ? 'Album' : 'Playlist'}
                </span>
                <h1 className="text-2xl font-bold text-white">{detail.title}</h1>
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
              <p className="text-gray-500 text-sm">{detail.tracks.length} titre{detail.tracks.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
            title="Supprimer"
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
            <button onClick={handleCancelSchedule} disabled={isSaving} className="text-xs underline hover:no-underline disabled:opacity-50">
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
              <img src={qrDataUrl} alt="QR code" className="w-32 h-32 rounded-xl border border-[#2a2a2a] bg-white p-2" />
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
              onClick={loadQrCode}
              disabled={isLoadingQr}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              {isLoadingQr ? 'Génération...' : 'Générer le QR code'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 space-y-4 mb-6">
        <h2 className="text-white font-semibold">Titres</h2>

        {detail.tracks.length > 0 && (
          <div className="space-y-2">
            {detail.tracks.map((entry, i) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 bg-[#121212] rounded-lg p-3 border border-[#2a2a2a]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-gray-600 text-sm w-5 flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{entry.track.title}</p>
                    <p className="text-gray-500 text-xs truncate">{entry.track.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => moveTrack(i, -1)} disabled={i === 0} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveTrack(i, 1)} disabled={i === detail.tracks.length - 1} className="p-1.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRemoveTrack(entry.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Retirer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTrackToAdd}
            onChange={(e) => setSelectedTrackToAdd(e.target.value)}
            className="flex-1 min-w-[160px] bg-[#2a2a2a] text-white rounded-lg p-2.5 border border-[#3a3a3a] text-sm"
          >
            <option value="">Sélectionner une track terminée...</option>
            {eligibleTracks.map(t => (
              <option key={t.id} value={t.id}>{t.title} — {t.artist}</option>
            ))}
          </select>
          <button
            onClick={handleAddTrack}
            disabled={isAddingTrack || !selectedTrackToAdd}
            className="flex items-center gap-1 text-sm px-3 py-2.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
        {eligibleTracks.length === 0 && (
          <p className="text-gray-500 text-xs">Aucune autre track terminée disponible à ajouter.</p>
        )}
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 space-y-4 mb-6">
        <h2 className="text-white font-semibold">Description</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Présente cet album/cette playlist en quelques mots..."
          rows={3}
          className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none resize-none"
        />
        <button
          onClick={handleSaveMeta}
          disabled={isSaving}
          style={{ backgroundColor: accentColor }}
          className="text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 space-y-4 mb-6">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" /> Collaborateurs
        </h2>
        <p className="text-gray-500 text-xs -mt-2">
          Tous les collaborateurs crédités sur cet album/cette playlist doivent figurer ici.
        </p>

        {detail.collaborators.length > 0 && (
          <div className="space-y-2">
            {detail.collaborators.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-[#121212] rounded-lg p-3 border border-[#2a2a2a]">
                <div>
                  <span className="text-white text-sm font-medium">{c.name}</span>
                  <span className="text-gray-500 text-xs ml-2">{roleLabel(c.role)}</span>
                </div>
                <button onClick={() => handleDeleteCollaborator(c.id)} className="text-gray-500 hover:text-red-400 transition-colors">
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

      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6 space-y-4 mb-6">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <FileSignature className="w-4 h-4" /> Attestation d&apos;auteur
        </h2>
        <p className="text-gray-500 text-xs -mt-2">
          Déclaration écrite et horodatée. Preuve d&apos;antériorité auto-déclarée — pas un dépôt officiel
          auprès de la SACEM ou d&apos;un huissier.
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

      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6">
        <h2 className="text-white font-semibold flex items-center gap-2 mb-1">
          <Package className="w-4 h-4" /> Kit de distribution
        </h2>
        <p className="text-gray-500 text-xs mb-4">
          Pochette, liens de diffusion, QR code, fiche technique (tracklist) et attestation d&apos;auteur
          (si signée), réunis dans un fichier ZIP.
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
    </div>
  );
}
