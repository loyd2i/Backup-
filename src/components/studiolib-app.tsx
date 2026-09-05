'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import LoginPage from './login-page';
import AccueilPage from './accueil-page';
import RendezvousPage from './rendezvous-page';
import CreationsPage from './creations-page';
import MessageriePage from './messagerie-page';
import ReglagesPage from './reglages-page';
import ForumPage from './forum-page';
import EStudioPage from './e-studio-page';
import OnelibPage from './onelib-page';
import AppLayout from './app-layout';
import StudioDashboard from './studio-dashboard';
import StudioMessages from './studio-messages';
import PublicCreationsPage from './public-creations-page';
import PublicStudiosPage from './public-studios-page';
import PublicVitrinePage from './public-vitrine-page';
import PublicOnelibPage from './public-onelib-page';
import PublicOnelibArtistPage from './public-onelib-artist-page';

export default function StudiolibApp() {
  const currentPage = useAppStore((state) => state.currentPage);
  const isLoggedIn = useAppStore((state) => state.isLoggedIn);
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const login = useAppStore((state) => state.login);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);

  // Public page state from URL query params
  const [publicPage, setPublicPage] = useState<string | null>(null);
  const [publicStudioId, setPublicStudioId] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [publicArtistId, setPublicArtistId] = useState<string | null>(null);

  // Parse URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const publicParam = params.get('public');
    const studioParam = params.get('studio');
    const slugParam = params.get('slug');
    const artistParam = params.get('artist');

    if (publicParam) {
      setPublicPage(publicParam);
      if (studioParam) setPublicStudioId(studioParam);
      if (slugParam) setPublicSlug(slugParam);
      if (artistParam) setPublicArtistId(artistParam);
    }
  }, []);

  // Listen for URL changes (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const publicParam = params.get('public');
      const studioParam = params.get('studio');
      const slugParam = params.get('slug');
      const artistParam = params.get('artist');

      if (publicParam) {
        setPublicPage(publicParam);
        if (studioParam) setPublicStudioId(studioParam);
        if (slugParam) setPublicSlug(slugParam);
        if (artistParam) setPublicArtistId(artistParam);
      } else {
        setPublicPage(null);
        setPublicStudioId(null);
        setPublicSlug(null);
        setPublicArtistId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate to a public page (update URL)
  const navigatePublic = (page: string, studioId?: string) => {
    let url = `?public=${page}`;
    if (studioId) url += `&studio=${studioId}`;
    window.history.pushState({}, '', url);
    setPublicPage(page);
    if (studioId) setPublicStudioId(studioId);
    else setPublicStudioId(null);
  };

  // Navigate to a smart link page (release ou collection) depuis la page artiste
  const navigateToOnelibSlug = (slug: string) => {
    const url = `?public=onelib&slug=${slug}`;
    window.history.pushState({}, '', url);
    setPublicPage('onelib');
    setPublicSlug(slug);
    setPublicArtistId(null);
  };

  // ─── Auth Check ───
  // Check for existing session on mount
  // (doit s'exécuter avant tout retour anticipé pour respecter l'ordre des hooks)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/user');
        const data = await res.json();
        if (data.user) {
          login(data.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    checkSession();
  }, [login]);

  // Lien d'invitation E-Studio (?e-studio=join&token=xxx) : une fois connecté,
  // ouvrir directement la page E-Studio (qui traitera le join côté client)
  useEffect(() => {
    if (!isLoggedIn) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('e-studio') === 'join' && params.get('token')) {
      setCurrentPage('e-studio');
    }
  }, [isLoggedIn, setCurrentPage]);

  // ─── Public Pages (no auth required) ───
  if (publicPage) {
    switch (publicPage) {
      case 'creations':
        return <PublicCreationsPage />;
      
      case 'vitrine':
        if (publicStudioId) {
          return (
            <PublicVitrinePage
              studioId={publicStudioId}
              onBack={() => navigatePublic('vitrine')}
            />
          );
        }
        return (
          <PublicStudiosPage
            onSelectStudio={(id) => navigatePublic('vitrine', id)}
          />
        );
      
      case 'forum':
        return <ForumPage />;

      case 'onelib':
        if (publicSlug) {
          return (
            <PublicOnelibPage
              slug={publicSlug}
              onBack={() => navigatePublic('creations')}
            />
          );
        }
        return <PublicCreationsPage />;

      case 'onelib-artist':
        if (publicArtistId) {
          return (
            <PublicOnelibArtistPage
              userId={publicArtistId}
              currentSlug={publicSlug}
              onBack={() => navigatePublic('creations')}
              onNavigate={navigateToOnelibSlug}
            />
          );
        }
        return <PublicCreationsPage />;

      default:
        return <PublicCreationsPage />;
    }
  }

  // Show login page if not logged in
  if (!isLoggedIn || currentPage === 'login') {
    return <LoginPage />;
  }

  // Check if user is studio owner
  const isStudioOwner = user?.role === 'studio_owner';

  // Render studio-specific pages
  if (isStudioOwner) {
    const renderStudioPage = () => {
      switch (currentPage) {
        case 'accueil':
          return <StudioDashboard />;
        case 'rendezvous':
          return <StudioDashboard />; // Dashboard includes appointments
        case 'creations':
          return <CreationsPage isStudioMode={true} />; // Projects - studio mode
        case 'messagerie':
          return <StudioMessages />; // Studio-specific messaging
        case 'reglages':
          return <ReglagesPage />;
        case 'forum':
          return <ForumPage />;
        case 'e-studio':
          return <EStudioPage />;
        case 'onelib':
          return <OnelibPage />;
        default:
          return <StudioDashboard />;
      }
    };

    return <AppLayout isStudioMode={true}>{renderStudioPage()}</AppLayout>;
  }

  // Render artist/regular user pages
  const renderPage = () => {
    switch (currentPage) {
      case 'accueil':
        return <AccueilPage />;
      case 'rendezvous':
        return <RendezvousPage />;
      case 'creations':
        return <CreationsPage />;
      case 'messagerie':
        return <MessageriePage />;
      case 'reglages':
        return <ReglagesPage />;
      case 'forum':
        return <ForumPage />;
      case 'e-studio':
        return <EStudioPage />;
      case 'onelib':
        return <OnelibPage />;
      default:
        return <AccueilPage />;
    }
  };

  return <AppLayout>{renderPage()}</AppLayout>;
}
