'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Heart, Eye, Clock, Plus, X, Send, LogIn } from 'lucide-react';
import EmptyState from './ui/empty-state';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  _count?: { posts: number };
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  views: number;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; name: string; avatar?: string | null };
  category: { id: string; name: string; slug: string };
  _count?: { comments: number; likes: number };
}

export default function PublicForumPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', categoryId: '' });

  useEffect(() => {
    fetch('/api/user').then(res => res.json()).then(data => setIsLoggedIn(!!data.user)).catch(() => {});
    fetchData();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/forum/categories');
      const data = await res.json();
      setCategories(data.categories || []);
      if (data.categories?.length > 0) {
        setNewPost(prev => ({ ...prev, categoryId: data.categories[0].id }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const url = selectedCategory
        ? `/api/forum/posts?categoryId=${selectedCategory}`
        : '/api/forum/posts';
      const res = await fetch(url);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content || !newPost.categoryId) return;

    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost)
      });

      if (res.ok) {
        setNewPost({ title: '', content: '', categoryId: categories[0]?.id || '' });
        setShowNewPost(false);
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <div className="p-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2 rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2a2a2a] font-semibold"
        >
          Studiolib
        </a>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-[#6366f1]" />
              Forum Amateurs de Son
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Échangez avec la communauté sur le mixage, le mastering et la production
            </p>
          </div>
          {isLoggedIn ? (
            <button
              onClick={() => setShowNewPost(true)}
              className="hidden md:flex items-center gap-2 bg-[#6366f1] text-white px-4 py-2 rounded-lg hover:bg-[#5558e3] transition-colors flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
              Nouveau sujet
            </button>
          ) : (
            <a
              href="/"
              className="hidden md:flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2 rounded-lg hover:border-[#3a3a3a] transition-colors flex-shrink-0"
            >
              <LogIn className="w-4 h-4" />
              Se connecter pour publier
            </a>
          )}
        </div>

        {/* New Post Modal */}
        {showNewPost && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Nouveau sujet</h2>
                <button onClick={() => setShowNewPost(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitPost} className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Catégorie</label>
                  <select
                    value={newPost.categoryId}
                    onChange={(e) => setNewPost({ ...newPost, categoryId: e.target.value })}
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1]"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Titre</label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="Titre de votre sujet..."
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1]"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Contenu</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    placeholder="Décrivez votre sujet..."
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1] min-h-[150px]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#6366f1] text-white py-3 rounded-lg font-medium hover:bg-[#5558e3] transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Publier
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-[#6366f1] text-white'
                  : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
              }`}
            >
              Tous les sujets
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-[#6366f1] text-white'
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#1a1a1a] rounded-xl p-5 animate-pulse">
                <div className="h-5 bg-[#2a2a2a] rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-[#2a2a2a] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl">
            <EmptyState
              icon={MessageCircle}
              title="Aucun sujet pour le moment"
              description="Soyez le premier à lancer une discussion !"
              size="lg"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <a
                key={post.id}
                href={`/forum/${post.slug}`}
                className="block bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#6366f1] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold">
                      {post.author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-xs bg-[#2a2a2a] text-gray-400 px-2 py-1 rounded mb-2 inline-block">
                      {post.category.name}
                    </span>

                    <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
                      {post.isPinned && <span className="text-yellow-400">📌</span>}
                      {post.title}
                    </h3>

                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="font-medium text-gray-300">{post.author.name}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post._count?.comments || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post._count?.likes || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Mobile New Post / Login Button */}
      {isLoggedIn ? (
        <button
          onClick={() => setShowNewPost(true)}
          className="md:hidden fixed bottom-6 right-6 z-30 bg-[#6366f1] text-white p-4 rounded-full shadow-lg hover:bg-[#5558e3] transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      ) : (
        <a
          href="/"
          className="md:hidden fixed bottom-6 right-6 z-30 bg-[#6366f1] text-white p-4 rounded-full shadow-lg hover:bg-[#5558e3] transition-colors"
        >
          <LogIn className="w-6 h-6" />
        </a>
      )}
    </div>
  );
}
