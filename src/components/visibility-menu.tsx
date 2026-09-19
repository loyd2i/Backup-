'use client';

import { useEffect, useState } from 'react';
import { Globe, Lock, Link2, Check, ChevronDown } from 'lucide-react';

type VisibilityMode = 'public' | 'link' | 'private';

interface VisibilityMenuProps {
  isPublic: boolean;
  linkToken?: string | null;
  onChange: (mode: VisibilityMode) => void;
}

const OPTIONS: { value: VisibilityMode; label: string; icon: typeof Globe; hint: string }[] = [
  { value: 'public', label: 'Publique', icon: Globe, hint: 'Visible par tous dans le flux Créations' },
  { value: 'link', label: 'Lien uniquement', icon: Link2, hint: 'Visible sans compte par quiconque a le lien' },
  { value: 'private', label: 'Privée', icon: Lock, hint: 'Visible par vous et les personnes invitées' },
];

// Menu de visibilité à 3 états pour une track terminée. Le mode "Lien
// uniquement" génère un jeton d'accès côté serveur (linkToken) : dès qu'il
// arrive via les props, le lien est automatiquement copié dans le
// presse-papier pour permettre un partage en un clic.
export default function VisibilityMenu({ isPublic, linkToken, onChange }: VisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingCopy, setPendingCopy] = useState(false);

  const mode: VisibilityMode = isPublic ? 'public' : linkToken ? 'link' : 'private';
  const current = OPTIONS.find((o) => o.value === mode) || OPTIONS[2];

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/?public=track&token=${token}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  useEffect(() => {
    if (pendingCopy && linkToken) {
      copyLink(linkToken);
      setPendingCopy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken, pendingCopy]);

  const handleSelect = (value: VisibilityMode) => {
    setOpen(false);
    if (value === 'link') {
      if (linkToken) {
        copyLink(linkToken);
        if (mode !== 'link') onChange(value);
        return;
      }
      setPendingCopy(true);
    }
    if (value !== mode) onChange(value);
  };

  return (
    <div className="relative flex items-center gap-1">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          mode === 'public'
            ? 'bg-[#6366f1] text-white'
            : mode === 'link'
              ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]'
              : 'bg-[#2a2a3a] text-gray-400 hover:text-white'
        }`}
        title={current.hint}
      >
        <current.icon className="w-3 h-3" />
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {mode === 'link' && linkToken && (
        <button
          onClick={() => copyLink(linkToken)}
          className="p-1.5 text-gray-500 hover:text-white hover:bg-[#2a2a3a] rounded-lg transition-all"
          title="Copier le lien de partage"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
        </button>
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
