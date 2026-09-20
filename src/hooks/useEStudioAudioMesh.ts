'use client';

/**
 * Mesh audio WebRTC complet (chacun connecté à chacun) d'une session
 * E-Studio - extrait de la page E-Studio pour être réutilisable ailleurs
 * (l'outil public de normalisation, en mode "Live", doit pouvoir activer le
 * son d'une session depuis sa propre page plutôt que depuis E-Studio).
 *
 * Le "détail" de session (participants, iceServers) reste sous la
 * responsabilité de l'appelant, qui le poll déjà pour ses propres besoins -
 * ce hook ne fait que gérer les connexions peer-to-peer et la signalisation
 * une fois qu'on lui fournit ces informations.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export interface AudioMeshParticipant {
  userId: string;
  connectionState: string;
  isMuted: boolean;
}

export interface UseEStudioAudioMeshOptions {
  sessionId: string | null;
  myUserId: string | null;
  // Mon propre enregistrement participant (nécessaire pour PATCH mon état
  // côté serveur - connectionState/isMuted - visible par les autres).
  myParticipantId: string | null;
  iceServers?: RTCIceServer[];
  // Fourni par l'appelant, qui poll déjà le détail de session.
  participants: AudioMeshParticipant[];
  // Appelé après un join/leave/mute pour permettre à l'appelant de
  // rafraîchir immédiatement son propre polling de détail de session.
  onParticipantUpdated?: () => void;
}

export function useEStudioAudioMesh({
  sessionId,
  myUserId,
  myParticipantId,
  iceServers = DEFAULT_ICE_SERVERS,
  participants,
  onParticipantUpdated,
}: UseEStudioAudioMeshOptions) {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [connectionStates, setConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateParticipant = useCallback(async (data: Record<string, unknown>) => {
    if (!sessionId || !myParticipantId) return;
    try {
      await fetch(`/api/e-studio/sessions/${sessionId}/participants/${myParticipantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      onParticipantUpdated?.();
    } catch (e) {
      console.error('Error updating participant:', e);
    }
  }, [sessionId, myParticipantId, onParticipantUpdated]);

  const sendSignal = useCallback(async (toUserId: string, type: string, payload: unknown) => {
    if (!sessionId) return;
    try {
      await fetch(`/api/e-studio/sessions/${sessionId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId, type, payload, kind: 'audio' }),
      });
    } catch (e) {
      console.error('Error sending audio signal:', e);
    }
  }, [sessionId]);

  const createPeerConnection = useCallback((peerUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers });
    peerConnectionsRef.current.set(peerUserId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => new Map(prev).set(peerUserId, e.streams[0]));
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(peerUserId, 'ice-candidate', e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      setConnectionStates((prev) => new Map(prev).set(peerUserId, pc.connectionState));
      if (pc.connectionState === 'failed') {
        pc.close();
        peerConnectionsRef.current.delete(peerUserId);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(peerUserId);
          return next;
        });
      }
    };

    return pc;
  }, [iceServers, sendSignal]);

  const initiateOffer = useCallback(async (peerUserId: string) => {
    const pc = createPeerConnection(peerUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal(peerUserId, 'offer', pc.localDescription);
  }, [createPeerConnection, sendSignal]);

  const handleOffer = useCallback(async (fromUserId: string, sdp: RTCSessionDescriptionInit) => {
    peerConnectionsRef.current.get(fromUserId)?.close();
    const pc = createPeerConnection(fromUserId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal(fromUserId, 'answer', pc.localDescription);
  }, [createPeerConnection, sendSignal]);

  const handleAnswer = useCallback(async (fromUserId: string, sdp: RTCSessionDescriptionInit) => {
    const pc = peerConnectionsRef.current.get(fromUserId);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }, []);

  const handleIceCandidate = useCallback(async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionsRef.current.get(fromUserId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding audio ICE candidate:', e);
      }
    }
  }, []);

  // Polling de la signalisation pendant que le son est actif.
  useEffect(() => {
    if (!sessionId || !isJoined) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/e-studio/sessions/${sessionId}/signals?kind=audio`);
        if (!res.ok) return;
        const data = await res.json();
        for (const sig of data.signals || []) {
          const payload = JSON.parse(sig.payload);
          if (sig.type === 'offer') await handleOffer(sig.fromUserId, payload);
          else if (sig.type === 'answer') await handleAnswer(sig.fromUserId, payload);
          else if (sig.type === 'ice-candidate') await handleIceCandidate(sig.fromUserId, payload);
        }
      } catch (e) {
        console.error('Error polling audio signals:', e);
      }
    };

    poll();
    signalPollRef.current = setInterval(poll, 1500);
    return () => {
      if (signalPollRef.current) clearInterval(signalPollRef.current);
    };
  }, [sessionId, isJoined, handleOffer, handleAnswer, handleIceCandidate]);

  // Découverte du mesh : connexion à tout nouveau participant "connected".
  // Règle anti-glare : seul celui dont l'userId est le plus petit envoie l'offre.
  useEffect(() => {
    if (!isJoined || !myUserId) return;

    const connectedPeers = participants.filter((p) => p.userId !== myUserId && p.connectionState === 'connected');

    for (const p of connectedPeers) {
      if (!peerConnectionsRef.current.has(p.userId) && myUserId < p.userId) {
        initiateOffer(p.userId);
      }
    }

    for (const peerId of Array.from(peerConnectionsRef.current.keys())) {
      if (!connectedPeers.some((p) => p.userId === peerId)) {
        peerConnectionsRef.current.get(peerId)?.close();
        peerConnectionsRef.current.delete(peerId);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
        setConnectionStates((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, myUserId, isJoined]);

  // Synchronise mon micro avec l'état serveur (mon propre toggle, ou un mute
  // forcé par l'hôte à distance).
  useEffect(() => {
    if (!isJoined || !myUserId || !localStreamRef.current) return;
    const mine = participants.find((p) => p.userId === myUserId);
    if (!mine) return;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !mine.isMuted; });
    setIsMuted((prev) => (prev !== mine.isMuted ? mine.isMuted : prev));
  }, [participants, myUserId, isJoined]);

  const join = useCallback(async (stream: MediaStream) => {
    localStreamRef.current = stream;
    setIsJoined(true);
    setIsMuted(false);
    setError(null);
    await updateParticipant({ connectionState: 'connected', isMuted: false });
  }, [updateParticipant]);

  const leave = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());
    setConnectionStates(new Map());
    setIsJoined(false);
    await updateParticipant({ connectionState: 'new' });
  }, [updateParticipant]);

  const toggleMute = useCallback(async () => {
    if (!localStreamRef.current) return;
    const next = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setIsMuted(next);
    await updateParticipant({ isMuted: next });
  }, [isMuted, updateParticipant]);

  // Nettoyage au démontage.
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, []);

  return { isJoined, isMuted, remoteStreams, connectionStates, error, join, leave, toggleMute };
}
