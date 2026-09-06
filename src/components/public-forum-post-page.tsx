'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Heart, Eye, Clock, Send, LogIn, ArrowLeft } from 'lucide-react';

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

interface ForumComment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatar?: string | null };
  _count?: { likes: number };
}

interface PublicForumPostPageProps {
  slug: string;
  onBack?: () => void;
}

export default function PublicForumPostPage({ slug, onBack }: PublicForumPostPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/user').then(res => res.json()).then(data => setIsLoggedIn(!!data.user)).catch(() => {});
    fetchPost();
    fetchComments();
  }, [slug]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/forum/posts/${slug}`);
      const data = await res.json();
      if (res.ok) {
        setPost(data.post);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/forum/posts/${slug}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/forum/posts/${slug}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121212] p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-48 bg-[#1a1a1a] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
        <div className="text-center">
          <MessageCircle className="w-14 h-14 text-gray-600 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Ce sujet n&apos;existe pas ou plus</p>
          {onBack ? (
            <button onClick={onBack} className="mt-4 inline-block text-[#6366f1] hover:text-[#818cf8] text-sm">
              ← Retour au forum
            </button>
          ) : (
            <a href="/forum" className="mt-4 inline-block text-[#6366f1] hover:text-[#818cf8] text-sm">
              ← Retour au forum
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      <div className="p-4">
        {onBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2 rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2a2a2a]"
          >
            <ArrowLeft className="w-4 h-4" /> Forum
          </button>
        ) : (
          <a
            href="/forum"
            className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2 rounded-xl hover:bg-[#2a2a2a] transition-colors border border-[#2a2a2a]"
          >
            <ArrowLeft className="w-4 h-4" /> Forum
          </a>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* Post */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] mb-6">
          <span className="text-xs bg-[#2a2a2a] text-gray-400 px-2 py-1 rounded mb-3 inline-block">
            {post.category.name}
          </span>
          <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            {post.isPinned && <span className="text-yellow-400">📌</span>}
            {post.title}
          </h1>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[#6366f1] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {post.author.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{post.author.name}</p>
              <p className="text-gray-500 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDate(post.createdAt)}
              </p>
            </div>
          </div>

          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          <div className="flex items-center gap-4 text-xs text-gray-500 mt-5 pt-5 border-t border-[#2a2a2a]">
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.views}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {comments.length}</span>
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post._count?.likes || 0}</span>
          </div>
        </div>

        {/* Comments */}
        <h2 className="text-white font-bold text-lg mb-4">
          {comments.length} commentaire{comments.length > 1 ? 's' : ''}
        </h2>

        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-[#2a2a2a] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-white text-sm font-medium">{comment.author.name}</span>
                <span className="text-gray-500 text-xs">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">Aucun commentaire pour le moment</p>
          )}
        </div>

        {/* New comment */}
        {isLoggedIn ? (
          <form onSubmit={handleSubmitComment} className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="flex-1 bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1]"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="bg-[#6366f1] text-white px-4 py-3 rounded-lg font-medium hover:bg-[#5558e3] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white py-3 rounded-lg hover:border-[#3a3a3a] transition-colors"
          >
            <LogIn className="w-4 h-4" /> Se connecter pour commenter
          </a>
        )}
      </div>
    </div>
  );
}
