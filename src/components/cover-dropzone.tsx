'use client';

import { useRef, useState } from 'react';
import { ImageUp, AlertTriangle, X } from 'lucide-react';

const MIN_SIZE = 1400; // px, minimum acceptable (Apple Music/Spotify plancher)
const RECOMMENDED_SIZE = 3000; // px, taille recommandée pour un rendu net sur tous les écrans
const MAX_FILE_SIZE_MB = 10;

interface CoverDropzoneProps {
  currentUrl?: string | null;
  onFileSelected: (file: File) => void;
  isUploading?: boolean;
  accentColor: string;
  onRemove?: () => void;
}

export default function CoverDropzone({ currentUrl, onFileSelected, isUploading, accentColor, onRemove }: CoverDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = localPreview || currentUrl || null;

  const checkAndProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setWarning('Le fichier doit être une image (JPG ou PNG).');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setWarning(`Image trop lourde : ${(file.size / 1024 / 1024).toFixed(1)} Mo (max ${MAX_FILE_SIZE_MB} Mo).`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w !== h) {
        setWarning(`Image non carrée détectée (${w}×${h}px) : un format carré (1:1) est requis par la plupart des plateformes.`);
      } else if (w < MIN_SIZE) {
        setWarning(`Résolution trop faible (${w}×${h}px) : ${MIN_SIZE}×${MIN_SIZE}px minimum, ${RECOMMENDED_SIZE}×${RECOMMENDED_SIZE}px recommandé.`);
      } else {
        setWarning(null);
      }
      setLocalPreview(objectUrl);
      onFileSelected(file);
    };
    img.onerror = () => {
      setWarning('Impossible de lire cette image.');
    };
    img.src = objectUrl;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) checkAndProcess(file);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) checkAndProcess(file);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />

      {displayUrl ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#121212] border border-[#2a2a2a] flex-shrink-0 group"
            title="Changer la pochette"
          >
            <img src={displayUrl} alt="Pochette" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageUp className="w-5 h-5 text-white" />
            </div>
          </button>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="text-sm w-fit px-3 py-1.5 rounded-lg bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
            >
              {isUploading ? 'Envoi...' : 'Changer la pochette'}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => { setLocalPreview(null); setWarning(null); onRemove(); }}
                className="text-xs text-gray-500 hover:text-red-400 w-fit"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
            isDragging ? 'bg-opacity-10' : 'border-[#3a3a3a] hover:border-[#4a4a4a]'
          }`}
          style={isDragging ? { borderColor: accentColor, backgroundColor: `${accentColor}1a` } : undefined}
        >
          <ImageUp className="w-6 h-6 text-gray-500 mx-auto mb-2" />
          <p className="text-white text-sm font-medium">
            {isDragging ? 'Déposez l\'image ici' : 'Glissez-déposez une pochette, ou cliquez'}
          </p>
        </div>
      )}

      {warning && (
        <div className="flex items-start gap-2 mt-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      <p className="text-gray-500 text-xs mt-2">
        Format carré (1:1) • {MIN_SIZE}×{MIN_SIZE}px minimum, {RECOMMENDED_SIZE}×{RECOMMENDED_SIZE}px recommandé • JPG ou PNG, RVB • {MAX_FILE_SIZE_MB} Mo max
      </p>
    </div>
  );
}
