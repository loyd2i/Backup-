'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Logo from './logo';
import { User, Building2 } from 'lucide-react';

export default function LoginPage() {
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const login = useAppStore((state) => state.login);
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  // Quick login with demo account
  const handleDemoLogin = async (type: 'artiste' | 'studio') => {
    setError('');
    setIsLoading(true);
    
    const credentials = type === 'artiste' 
      ? { email: 'demo@studiolib.fr', password: 'demo123' }
      : { email: 'studio@studiolib.fr', password: 'demo123' };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        setIsLoading(false);
        return;
      }

      login(data.user);
    } catch (err) {
      setError('Erreur de connexion au serveur');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister 
        ? { ...formData, role: 'artiste' }
        : { email: formData.email, password: formData.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        setIsLoading(false);
        return;
      }

      // Login success
      login(data.user);
    } catch (err) {
      setError('Erreur de connexion au serveur');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center px-6 relative">
      {/* Subtle background image */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.15,
          filter: 'blur(0.5px)',
        }}
      />
      {/* Dark overlay for better contrast */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#121212]/20 via-transparent to-[#121212]/40" />
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
      {/* Logo */}
      <div className="mb-10">
        <Logo variant="full" size="lg" />
      </div>

      {/* Demo Access Cards */}
      <div className="w-full max-w-md mb-6">
        <p className="text-gray-500 text-sm text-center mb-3">Accès rapide (mode démo)</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDemoLogin('artiste')}
            disabled={isLoading}
            className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl hover:border-[#6366f1] hover:bg-[#6366f1]/10 transition-all group"
          >
            <div className="w-10 h-10 bg-[#6366f1] rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">Artiste</p>
              <p className="text-gray-500 text-xs">demo@studiolib.fr</p>
            </div>
          </button>
          <button
            onClick={() => handleDemoLogin('studio')}
            disabled={isLoading}
            className="flex items-center gap-3 p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl hover:border-[#f59e0b] hover:bg-[#f59e0b]/10 transition-all group"
          >
            <div className="w-10 h-10 bg-[#f59e0b] rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">Studio</p>
              <p className="text-gray-500 text-xs">studio@studiolib.fr</p>
            </div>
          </button>
        </div>
        <p className="text-gray-600 text-xs text-center mt-2">Mot de passe: demo123</p>
      </div>

      {/* Divider */}
      <div className="w-full max-w-md flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-[#2a2a2a]" />
        <span className="text-gray-500 text-sm">ou</span>
        <div className="flex-1 h-px bg-[#2a2a2a]" />
      </div>

      {/* Form */}
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            {isRegister ? 'Créer un compte' : 'Connexion'}
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            {isRegister 
              ? 'Rejoignez la communauté Studiolib' 
              : 'Accédez à votre espace personnel'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white text-sm font-medium">
                  Nom complet
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#1a1a1a] border-0 text-white placeholder:text-gray-500 h-12 rounded-lg focus:ring-2 focus:ring-[#6366f1]"
                  placeholder="Votre nom"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white text-sm font-medium">
                  Téléphone (optionnel)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-[#1a1a1a] border-0 text-white placeholder:text-gray-500 h-12 rounded-lg focus:ring-2 focus:ring-[#6366f1]"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-[#1a1a1a] border-0 text-white placeholder:text-gray-500 h-12 rounded-lg focus:ring-2 focus:ring-[#6366f1]"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white text-sm font-medium">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-[#1a1a1a] border-0 text-white placeholder:text-gray-500 h-12 rounded-lg focus:ring-2 focus:ring-[#6366f1]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black hover:bg-gray-200 h-12 rounded-lg font-semibold text-base transition-all disabled:opacity-50"
          >
            {isLoading ? 'Chargement...' : isRegister ? 'Créer mon compte' : 'Connexion'}
          </Button>
        </form>

        {!isRegister && (
          <div className="text-center">
            <button className="text-gray-400 text-sm hover:text-white transition-colors">
              Mot de passe oublié ?
            </button>
          </div>
        )}

        <p className="text-center text-gray-400 text-sm">
          {isRegister ? 'Déjà inscrit ?' : "Pas encore inscrit ?"}{' '}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-white hover:text-[#6366f1] transition-colors font-medium"
          >
            {isRegister ? 'Se connecter' : 'Créer un compte'}
          </button>
        </p>
      </div>
      </div>
    </div>
  );
}
