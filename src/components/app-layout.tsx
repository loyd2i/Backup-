'use client';

import { useState } from 'react';
import { useAppStore, PageType } from '@/lib/store';
import { Home, Calendar, Music, MessageSquare, Settings, Menu, X, MessageCircle, Building2, Users, FileText, BarChart3, Cast, Share2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  isStudioMode?: boolean;
}

const artistNavItems: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'rendezvous', label: 'Rendez-vous', icon: Calendar },
  { id: 'creations', label: 'Créations', icon: Music },
  { id: 'messagerie', label: 'Messagerie', icon: MessageSquare },
  { id: 'reglages', label: 'Réglages', icon: Settings },
];

const studioNavItems: { id: PageType; label: string; icon: React.ElementType }[] = [
  { id: 'accueil', label: 'Tableau de bord', icon: BarChart3 },
  { id: 'rendezvous', label: 'Rendez-vous', icon: Calendar },
  { id: 'creations', label: 'Projets', icon: Music },
  { id: 'messagerie', label: 'Messages Clients', icon: Users },
  { id: 'reglages', label: 'Réglages', icon: Settings },
];

export default function AppLayout({ children, isStudioMode = false }: Props) {
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const user = useAppStore((state) => state.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = isStudioMode ? studioNavItems : artistNavItems;

  const handleNavClick = (page: PageType) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  const goToMenu = () => {
    setCurrentPage('accueil');
    setSidebarOpen(false);
  };

  // Background image based on mode
  const bgImage = isStudioMode ? '/background-studio.jpg' : '/background.jpg';
  const bgOverlay = isStudioMode 
    ? 'from-[#121212]/30 via-transparent to-[#121212]/50' 
    : 'from-[#121212]/20 via-transparent to-[#121212]/40';

  return (
    <div className="min-h-screen bg-[#121212] relative">
      {/* Subtle background image */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.15,
          filter: 'blur(0.5px)',
        }}
      />
      {/* Dark overlay for better contrast */}
      <div className={`fixed inset-0 z-0 pointer-events-none bg-gradient-to-b ${bgOverlay}`} />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex-col z-40">
        {/* Logo - Cliquable pour revenir au menu */}
        <button
          onClick={goToMenu}
          className="p-6 border-b border-[#2a2a2a] hover:bg-[#222] transition-colors cursor-pointer"
        >
          <img src="/logo-text.png" alt="Studiolib" width={150} height={52} />
        </button>

        {/* Studio Badge */}
        {isStudioMode && (
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2 bg-[#f59e0b]/10 text-[#f59e0b] px-3 py-2 rounded-xl">
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">Mode Studio</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#6366f1] text-white'
                        : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          
          {/* Forum + E-Studio Buttons */}
          <div className="mt-6 pt-6 border-t border-[#2a2a2a] space-y-2">
            <button
              onClick={() => handleNavClick('forum')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                currentPage === 'forum'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                  : 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Forum Son</span>
            </button>
            <button
              onClick={() => handleNavClick('e-studio')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                currentPage === 'e-studio'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                  : 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'
              }`}
            >
              <Cast className="w-5 h-5" />
              <span className="font-medium">E-Studio</span>
            </button>
            <button
              onClick={() => handleNavClick('onelib')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                currentPage === 'onelib'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                  : 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium">Onelib</span>
            </button>
          </div>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-[#2a2a2a]">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={`w-10 h-10 ${isStudioMode ? 'bg-[#f59e0b]' : 'bg-[#6366f1]'} rounded-full flex items-center justify-center`}>
              <span className="text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user?.name || 'Utilisateur'}</p>
              <p className="text-gray-500 text-sm capitalize">
                {isStudioMode ? 'Propriétaire Studio' : user?.role || 'artiste'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Header - logo centré : rond sur desktop (texte déjà dans la sidebar), texte sur mobile (rond déjà dans le menu) */}
      <header className="fixed top-0 left-0 right-0 lg:left-64 bg-[#1a1a1a] border-b border-[#2a2a2a] z-40">
        <div className="flex items-center justify-end px-4 py-3">
          {/* Center: Logo (clickable) */}
          <button
            onClick={goToMenu}
            className="absolute left-1/2 -translate-x-1/2 hover:opacity-80 transition-opacity"
          >
            <img src="/logo-icon.png" alt="Studiolib" width={40} height={40} className="hidden lg:block" />
            <img src="/logo-text.png" alt="Studiolib" width={110} height={38} className="lg:hidden" />
          </button>

          {/* Right: Forum + Menu buttons */}
          <div className="flex items-center gap-2">
            {isStudioMode && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-1 rounded-lg text-xs font-medium">
                <Building2 className="w-3 h-3" />
                Studio
              </span>
            )}
            <button
              onClick={() => handleNavClick('forum')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'forum'
                  ? 'bg-[#6366f1] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavClick('e-studio')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'e-studio'
                  ? 'bg-[#6366f1] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
              title="E-Studio"
            >
              <Cast className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavClick('onelib')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'onelib'
                  ? 'bg-[#6366f1] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
              title="Onelib"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-white hover:bg-[#2a2a2a] rounded-lg transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 right-0 bottom-0 w-64 bg-[#1a1a1a] z-50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-[#2a2a2a]">
          <button onClick={goToMenu} className="hover:opacity-80">
            <img src="/logo-icon.png" alt="Studiolib" width={56} height={56} />
          </button>
        </div>
        
        {/* Studio Badge Mobile */}
        {isStudioMode && (
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2 bg-[#f59e0b]/10 text-[#f59e0b] px-3 py-2 rounded-xl">
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">Mode Studio</span>
            </div>
          </div>
        )}
        
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#6366f1] text-white'
                        : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          
          {/* Forum + E-Studio in mobile menu */}
          <div className="mt-4 pt-4 border-t border-[#2a2a2a] space-y-2">
            <button
              onClick={() => handleNavClick('forum')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                currentPage === 'forum'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                  : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">Forum Son</span>
            </button>
            <button
              onClick={() => handleNavClick('e-studio')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                currentPage === 'e-studio'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                  : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
              }`}
            >
              <Cast className="w-5 h-5" />
              <span className="font-medium">E-Studio</span>
            </button>
            <button
              onClick={() => handleNavClick('onelib')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                currentPage === 'onelib'
                  ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                  : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
              }`}
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium">Onelib</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 pb-20 lg:pb-6 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] px-2 py-2 z-40">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg transition-all ${
                  isActive
                    ? isStudioMode ? 'text-[#f59e0b]' : 'text-[#6366f1]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
