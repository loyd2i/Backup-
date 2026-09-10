'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';

interface Banner {
  id: string;
  position: string;
  advertiserName: string;
  imageUrl: string | null;
  linkUrl: string;
}

function BannerCard({ banner, compact }: { banner: Banner; compact?: boolean }) {
  return (
    <a
      href={banner.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`block rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden hover:border-[#6366f1]/50 transition-colors ${compact ? 'flex-1' : 'w-[160px]'}`}
    >
      {banner.imageUrl ? (
        <img src={banner.imageUrl} alt={banner.advertiserName} className="w-full h-auto" />
      ) : (
        <div className={`flex flex-col items-center text-center gap-2 ${compact ? 'p-3' : 'p-4'}`}>
          <Megaphone className="w-5 h-5 text-[#6366f1]" />
          <span className="text-white text-sm font-medium">{banner.advertiserName}</span>
        </div>
      )}
      <p className="text-gray-600 text-[10px] uppercase tracking-wide text-center py-1 border-t border-[#2a2a2a]">
        Partenaire
      </p>
    </a>
  );
}

/**
 * Deux emplacements publicitaires latéraux (gauche/droite), prévus au plan
 * d'affaires : partenariats directs à forfait fixe, pas de pub programmatique.
 * Rendu vide (aucun DOM) si aucune bannière active n'est configurée.
 *
 * variant "fixed" : flotte dans les marges de la page (pages publiques pleine
 * largeur, sans barre latérale de navigation) — masqué sous xl faute de place.
 * variant "inline" : rangée compacte dans le flux de la page (pages internes
 * où la barre de navigation occupe déjà la marge gauche fixe).
 */
export default function AdBanners({ variant = 'fixed' }: { variant?: 'fixed' | 'inline' }) {
  const [left, setLeft] = useState<Banner | null>(null);
  const [right, setRight] = useState<Banner | null>(null);

  useEffect(() => {
    fetch('/api/ads')
      .then((res) => res.json())
      .then((data) => {
        setLeft(data.left || null);
        setRight(data.right || null);
      })
      .catch(() => {});
  }, []);

  if (!left && !right) return null;

  if (variant === 'inline') {
    return (
      <div className="flex gap-3 mb-6">
        {left && <BannerCard banner={left} compact />}
        {right && <BannerCard banner={right} compact />}
      </div>
    );
  }

  return (
    <>
      {left && (
        <div className="hidden xl:block fixed left-4 top-24 z-10">
          <BannerCard banner={left} />
        </div>
      )}
      {right && (
        <div className="hidden xl:block fixed right-4 top-24 z-10">
          <BannerCard banner={right} />
        </div>
      )}
    </>
  );
}
