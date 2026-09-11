'use client';

import { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';

interface Review {
  id: string;
  direction: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface ReviewModalProps {
  appointmentId: string;
  direction: 'artist_to_studio' | 'studio_to_artist';
  targetLabel: string; // "ce studio" ou "cet artiste"
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function ReviewModal({ appointmentId, direction, targetLabel, onClose, onSubmitted }: ReviewModalProps) {
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        const own = (data.reviews || []).find((r: Review) => r.direction === direction);
        if (own) setExistingReview(own);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [appointmentId, direction]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Choisis une note avant d\'envoyer');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (res.ok) {
        setExistingReview(data.review);
        onSubmitted?.();
      } else {
        setError(data.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      setError('Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedReview = existingReview;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">
            {displayedReview ? 'Ton avis' : `Comment s'est passée la session ?`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm">Chargement...</p>
        ) : displayedReview ? (
          <div>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${star <= displayedReview.rating ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-gray-600'}`}
                />
              ))}
            </div>
            {displayedReview.comment && (
              <p className="text-gray-300 text-sm">{displayedReview.comment}</p>
            )}
            <p className="text-gray-500 text-xs mt-3">Merci pour ton retour sur {targetLabel} !</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 text-sm mb-3">Note {targetLabel} :</p>
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating) ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Un commentaire (optionnel)..."
              rows={3}
              className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none resize-none text-sm mb-3"
            />
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#6366f1] text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer l\'avis'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
