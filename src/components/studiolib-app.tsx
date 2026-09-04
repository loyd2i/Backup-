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
import AppLayout from './app-layout';
import StudioDashboard from './studio-dashboard';
import StudioMessages from './studio-messages';
import PublicCreationsPage from './public-creations-page';
import PublicStudiosPage from './public-studios-page';
import PublicVitrinePage from './public-vitrine-page';

export default function StudiolibApp() {
  const currentPage = useAppStore((state) => state.currentPage);
  const isLoggedIn = useAppStore((state) => state.isLoggedIn);
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const login = useAppStore((state) => state.login);

  // Public page state from URL query params
  const [publicPage, setPublicPage] = useState<string | null>(null);
  const [publicStudioId, setPublicStudioId] = useState<string | null>(null);

  // Parse URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const publicParam = params.get('public');
    const studioParam = params.get('studio');
    
    if (publicParam) {
      setPublicPage(publicParam);
      if (studioParam) setPublicStudioId(studioParam);
    }
  }, []);

  // Listen for URL changes (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const publicParam = params.get('public');
      const studioParam = params.get('studio');
      
      if (publicParam) {
        setPublicPage(publicParam);
        if (studioParam) setPublicStudioId(studioParam);
      } else {
        setPublicPage(null);
        setPublicStudioId(null);
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
      
      default:
        return <PublicCreationsPage />;
    }
  }

  // ─── Auth Check ───
  // Check for existing session on mount
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
      default:
        return <AccueilPage />;
    }
  };

  return <AppLayout>{renderPage()}</AppLayout>;
}
