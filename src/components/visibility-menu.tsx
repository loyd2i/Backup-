'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe, Lock, Link2, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type VisibilityMode = 'public' | 'link' | 'private';

interface VisibilityMenuProps {
  isPublic: boolean;
  linkToken?: string | null;
  onChange: (mode: VisibilityMode) => void;
  // Régénère le jeton de lien (invalide l'ancien lien déjà distribué) sans
  // avoir à repasser par "Privée". Le bouton dédié n'apparaît que si fourni.
  onRegenerate?: () => void;
}

const OPTIONS: { value: VisibilityMode; label: string; shortLabel: string; icon: typeof Globe; hint: string }[] = [
  { value: 'public', label: 'Publique', shortLabel: 'Publique', icon: Globe, hint: 'Visible par tous dans le flux Créations' },
  { value: 'link', label: 'Lien uniquement', shortLabel: 'Lien', icon: Link2, hint: 'Visible sans compte par quiconque a le lien' },
  { value: 'private', label: 'Privée', shortLabel: 'Privée', icon: Lock, hint: 'Visible par vous et les personnes invitées' },
];

// Menu de visibilité à 3 états pour une track terminée. Le mode "Lien
// uniquement" génère un jeton d'accès côté serveur (linkToken) : dès qu'il
// arrive (ou change, après une régénération) via les props, le lien est
// automatiquement copié dans le presse-papier et confirmé par un toast.
export default function VisibilityMenu({ isPublic, linkToken, onChange, onRegenerate }: VisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pendingActionRef = useRef<'generate' | 'regenerate' | null>(null);
  const previousTokenRef = useRef<string | null | undefined>(linkToken);

  const mode: VisibilityMode = isPublic ? 'public' : linkToken ? 'link' : 'private';
  const current = OPTIONS.find((o) => o.value === mode) || OPTIONS[2];

  const copyLink = (token: string, message = 'Lien copié dans le presse-papier') => {
    const url = `${window.location.origin}/?public=track&token=${token}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ description: message });
    }).catch(() => {
      toast({ description: "Impossible de copier le lien automatiquement, copie-le manuellement.", variant: 'destructive' });
    });
  };

  // Se déclenche quand le jeton apparaît (première génération) ou change
  // (régénération) suite à une action en attente initiée par ce composant.
  useEffect(() => {
    const tokenChanged = linkToken !== previousTokenRef.current;
    previousTokenRef.current = linkToken;
    if (!tokenChanged || !linkToken || !pendingActionRef.current) return;
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    copyLink(linkToken, action === 'regenerate' ? 'Nouveau lien généré et copié (l\'ancien ne fonctionne plus)' : 'Lien créé et copié dans le presse-papier');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken]);

  const handleSelect = (value: VisibilityMode) => {
    setOpen(false);
    if (value === 'link') {
      if (linkToken) {
        copyLink(linkToken);
        if (mode !== 'link') onChange(value);
        return;
      }
      pendingActionRef.current = 'generate';
    }
    if (value !== mode) onChange(value);
  };

  const handleRegenerate = () => {
    if (!onRegenerate) return;
    pendingActionRef.current = 'regenerate';
    onRegenerate();
  };

  return (
    <div className="relative flex items-center gap-1">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          mode === 'public'
            ? 'bg-[#6366f1] text-white'
            : mode === 'link'
              ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]'
              : 'bg-[#2a2a3a] text-gray-400 hover:text-white'
        }`}
        title={current.hint}
      >
        <current.icon className="w-3 h-3" />
        <span>{current.shortLabel}</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {mode === 'link' && linkToken && (
        <>
          <button
            onClick={() => copyLink(linkToken)}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-[#2a2a3a] rounded-lg transition-all"
            title="Copier le lien de partage"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
          </button>
          {onRegenerate && (
            <button
              onClick={handleRegenerate}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-[#2a2a3a] rounded-lg transition-all"
              title="Régénérer le lien (l'ancien cessera de fonctionner)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl overflow-hidden shadow-xl z-20 min-w-[230px]">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-start gap-2 ${
                  option.value === mode ? 'bg-[#6366f1]/15 text-white' : 'text-gray-300 hover:bg-[#3a3a3a]'
                }`}
              >
                <option.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{option.hint}</span>
                </span>
                {option.value === mode && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
