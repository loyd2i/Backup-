'use client';

import { useEffect, useState } from 'react';
import { Flag, X } from 'lucide-react';

interface Report {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface ReportModalProps {
  appointmentId: string;
  onClose: () => void;
}

export default function ReportModal({ appointmentId, onClose }: ReportModalProps) {
  const [existingReport, setExistingReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}/reports`)
      .then((res) => res.json())
      .then((data) => setExistingReport(data.report || null))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [appointmentId]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Merci de décrire le problème');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setExistingReport(data.report);
      } else {
        setError(data.error || "Erreur lors de l'envoi");
      }
    } catch {
      setError("Erreur lors de l'envoi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" />
            Signaler un problème
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm">Chargement...</p>
        ) : existingReport ? (
          <div>
            <p className="text-gray-300 text-sm mb-2">{existingReport.reason}</p>
            <p className="text-gray-500 text-xs">
              Signalement envoyé le {new Date(existingReport.createdAt).toLocaleDateString('fr-FR')} — notre équipe va l&apos;examiner.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 text-sm mb-3">
              Décris le problème rencontré sur cette session (no-show, comportement, matériel...). Notre équipe traite chaque signalement manuellement.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Décris ce qui s'est passé..."
              rows={4}
              className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none resize-none text-sm mb-3"
            />
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
