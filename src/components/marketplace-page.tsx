'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { MARKETPLACE_COMMISSION_RATE } from '@/lib/tax-config';
import EmptyState from './ui/empty-state';
import { ShoppingBag, Music4, Disc3, Upload, X, Wallet, Download, User as UserIcon } from 'lucide-react';

interface MarketplaceItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price: number;
  audioUrl: string;
  coverUrl: string | null;
  createdAt: string;
  seller: { id: string; name: string; avatar: string | null };
  _count?: { purchases: number };
}

interface Purchase {
  id: string;
  pricePaid: number;
  createdAt: string;
  item: MarketplaceItem;
}

const CATEGORIES = [
  { value: 'sample_pack', label: 'Sample pack' },
  { value: 'instru', label: 'Instru' },
];

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

export default function MarketplacePage() {
  const user = useAppStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'browse' | 'purchases' | 'sell'>('browse');
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [ownedItemIds, setOwnedItemIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  // Formulaire de publication
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<'sample_pack' | 'instru'>('sample_pack');
  const [newPrice, setNewPrice] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  useEffect(() => {
    fetchItems();
    fetchPurchases();
    fetchMyListings();
    fetchWallet();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/marketplace');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      const res = await fetch('/api/marketplace/my-purchases');
      const data = await res.json();
      const list: Purchase[] = data.purchases || [];
      setPurchases(list);
      setOwnedItemIds(new Set(list.map((p) => p.item.id)));
    } catch {
      // best-effort
    }
  };

  const fetchMyListings = async () => {
    try {
      const res = await fetch('/api/marketplace?sellerId=me');
      const data = await res.json();
      setMyListings(data.items || []);
    } catch {
      // best-effort
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/marketplace/wallet');
      const data = await res.json();
      setWalletBalance(data.walletBalance || 0);
      setSalesCount(data.salesCount || 0);
    } catch {
      // best-effort
    }
  };

  const handlePurchase = async (itemId: string) => {
    setPurchasingId(itemId);
    try {
      const res = await fetch(`/api/marketplace/${itemId}/purchase`, { method: 'POST' });
      if (res.ok) {
        await fetchPurchases();
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de l\'achat');
      }
    } finally {
      setPurchasingId(null);
    }
  };

  const handlePublish = async () => {
    setPublishError('');
    if (!newTitle || !newPrice || !newFile) {
      setPublishError('Titre, prix et fichier audio sont requis');
      return;
    }
    setIsPublishing(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle);
      formData.append('description', newDescription);
      formData.append('category', newCategory);
      formData.append('price', newPrice);
      formData.append('audioFile', newFile);

      const res = await fetch('/api/marketplace', { method: 'POST', body: formData });
      if (res.ok) {
        setNewTitle('');
        setNewDescription('');
        setNewPrice('');
        setNewFile(null);
        fetchMyListings();
        fetchItems();
      } else {
        const data = await res.json();
        setPublishError(data.error || 'Erreur lors de la publication');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteListing = async (itemId: string) => {
    if (!window.confirm('Retirer cette annonce ? Les achats déjà effectués restent valides.')) return;
    await fetch(`/api/marketplace/${itemId}`, { method: 'DELETE' });
    fetchMyListings();
    fetchItems();
  };

  const filteredItems = items.filter((item) => {
    if (item.seller.id === user?.id) return false;
    return categoryFilter === 'all' || item.category === categoryFilter;
  });

  const renderItemCard = (item: MarketplaceItem, options?: { showBuy?: boolean }) => {
    const isOwned = ownedItemIds.has(item.id);
    return (
      <div key={item.id} className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
        <div className="aspect-square bg-[#2a2a2a] flex items-center justify-center relative">
          {item.coverUrl ? (
            <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <Disc3 className="w-12 h-12 text-gray-600" />
          )}
          <span className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded-full bg-black/60 text-white">
            {categoryLabel(item.category)}
          </span>
        </div>
        <div className="p-4">
          <p className="text-white font-medium truncate">{item.title}</p>
          <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
            <UserIcon className="w-3 h-3" /> {item.seller.name}
          </p>
          {item.description && (
            <p className="text-gray-500 text-sm mt-2 line-clamp-2">{item.description}</p>
          )}
          {(isOwned || item.seller.id === user?.id) && (
            <audio controls src={item.audioUrl} className="w-full mt-3 h-9" />
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[#6366f1] font-bold">{item.price}€</span>
            {options?.showBuy && (
              isOwned ? (
                <a
                  href={item.audioUrl}
                  download
                  className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg bg-green-500/20 text-green-400"
                >
                  <Download className="w-4 h-4" /> Télécharger
                </a>
              ) : (
                <button
                  onClick={() => handlePurchase(item.id)}
                  disabled={purchasingId === item.id}
                  className="text-sm px-3 py-2 rounded-lg bg-[#6366f1] text-white hover:bg-[#5558e3] transition-colors disabled:opacity-50"
                >
                  {purchasingId === item.id ? 'Achat...' : 'Acheter'}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 bg-[#6366f1] rounded-xl flex items-center justify-center">
          <ShoppingBag className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-gray-500 text-sm">Sample packs et instrus entre artistes</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'browse' as const, label: 'Parcourir' },
          { id: 'purchases' as const, label: 'Mes achats' },
          { id: 'sell' as const, label: 'Vendre' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'browse' && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            {[{ value: 'all', label: 'Tout' }, ...CATEGORIES].map((c) => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  categoryFilter === c.value
                    ? 'bg-[#6366f1]/20 text-[#6366f1]'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="text-gray-500 text-sm">Chargement...</p>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={Music4}
              title="Aucun article pour le moment"
              description="Reviens plus tard ou publie le premier sample pack !"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredItems.map((item) => renderItemCard(item, { showBuy: true }))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'purchases' && (
        purchases.length === 0 ? (
          <EmptyState
            icon={Download}
            title="Aucun achat pour le moment"
            description="Les sample packs et instrus que tu achètes apparaissent ici, toujours téléchargeables."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {purchases.map((p) => renderItemCard(p.item, { showBuy: true }))}
          </div>
        )
      )}

      {activeTab === 'sell' && (
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] flex items-center gap-6">
            <div className="w-12 h-12 bg-[#6366f1]/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-[#6366f1]" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Solde disponible</p>
              <p className="text-white text-2xl font-bold">{walletBalance.toFixed(2)}€</p>
            </div>
            <div className="text-gray-500 text-sm ml-auto text-right">
              <p>{salesCount} vente{salesCount !== 1 ? 's' : ''}</p>
              <p>Commission plateforme {(MARKETPLACE_COMMISSION_RATE * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#6366f1]" />
              Publier un article
            </h2>

            {publishError && (
              <p className="text-red-400 text-sm mb-3">{publishError}</p>
            )}

            <div className="space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titre (ex: Trap Drums Vol.1)"
                className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optionnel)"
                className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm min-h-[80px]"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as 'sample_pack' | 'instru')}
                  className="bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Prix (€)"
                  className="w-32 bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:border-[#6366f1] focus:outline-none text-sm"
                />
                <label className="flex items-center gap-2 text-sm px-3 py-3 rounded-lg bg-[#2a2a2a] text-gray-300 hover:text-white cursor-pointer border border-[#3a3a3a]">
                  <Upload className="w-4 h-4" />
                  {newFile ? newFile.name : 'Choisir un fichier audio'}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-[#6366f1] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50"
              >
                {isPublishing ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Mes annonces</h2>
            {myListings.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Aucune annonce publiée" size="sm" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {myListings.map((item) => (
                  <div key={item.id} className="relative">
                    {renderItemCard(item)}
                    <button
                      onClick={() => handleDeleteListing(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                      title="Retirer cette annonce"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
