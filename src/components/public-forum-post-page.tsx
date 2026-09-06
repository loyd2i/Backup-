'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Heart, Eye, Clock, Send, LogIn, ArrowLeft, Pencil, Trash2, X, Check } from 'lucide-react';

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
  likedByMe?: boolean;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  useEffect(() => {
    fetch('/api/user').then(res => res.json()).then(data => {
      setIsLoggedIn(!!data.user);
      setCurrentUserId(data.user?.id || null);
    }).catch(() => {});
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

  const handleToggleLike = async () => {
    if (!isLoggedIn || !post || isLiking) return;
    setIsLiking(true);
    try {
      const res = await fetch(`/api/forum/posts/${slug}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPost({
          ...post,
          likedByMe: data.liked,
          _count: { comments: post._count?.comments || 0, likes: data.likesCount }
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const startEditPost = () => {
    if (!post) return;
    setEditPostTitle(post.title);
    setEditPostContent(post.content);
    setIsEditingPost(true);
  };

  const handleSaveEditPost = async () => {
    if (!editPostTitle.trim() || !editPostContent.trim()) return;
    try {
      const res = await fetch(`/api/forum/posts/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editPostTitle, content: editPostContent })
      });
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
        setIsEditingPost(false);
      }
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Supprimer définitivement ce sujet et ses commentaires ?')) return;
    try {
      const res = await fetch(`/api/forum/posts/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        if (onBack) onBack();
        else window.location.href = '/forum';
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const startEditComment = (comment: ForumComment) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    try {
      const res = await fetch(`/api/forum/posts/${slug}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editCommentContent })
      });
      if (res.ok) {
        setEditingCommentId(null);
        fetchComments();
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      const res = await fetch(`/api/forum/posts/${slug}/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
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
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-xs bg-[#2a2a2a] text-gray-400 px-2 py-1 rounded inline-block">
              {post.category.name}
            </span>
            {currentUserId === post.author.id && !isEditingPost && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={startEditPost} className="p-1.5 text-gray-500 hover:text-white transition-colors" title="Modifier">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={handleDeletePost} className="p-1.5 text-gray-500 hover:text-red-500 transition-colors" title="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {isEditingPost ? (
            <div className="space-y-3 mb-4">
              <input
                type="text"
                value={editPostTitle}
                onChange={(e) => setEditPostTitle(e.target.value)}
                className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1] font-bold text-xl"
              />
              <textarea
                value={editPostContent}
                onChange={(e) => setEditPostContent(e.target.value)}
                className="w-full bg-[#2a2a2a] text-white rounded-lg p-3 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1] min-h-[120px]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEditPost}
                  className="flex items-center gap-2 bg-[#6366f1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#5558e3] transition-colors"
                >
                  <Check className="w-4 h-4" /> Enregistrer
                </button>
                <button
                  onClick={() => setIsEditingPost(false)}
                  className="flex items-center gap-2 bg-[#2a2a2a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3a3a3a] transition-colors"
                >
                  <X className="w-4 h-4" /> Annuler
                </button>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              {post.isPinned && <span className="text-yellow-400">📌</span>}
              {post.title}
            </h1>
          )}

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

          {!isEditingPost && (
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 mt-5 pt-5 border-t border-[#2a2a2a]">
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {post.views}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {comments.length}</span>
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={!isLoggedIn || isLiking}
              className={`flex items-center gap-1 transition-colors ${
                post.likedByMe ? 'text-red-500' : 'hover:text-white'
              } ${!isLoggedIn ? 'cursor-default' : ''}`}
            >
              <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-red-500' : ''}`} />
              {post._count?.likes || 0}
            </button>
          </div>
        </div>

        {/* Comments */}
        <h2 className="text-white font-bold text-lg mb-4">
          {comments.length} commentaire{comments.length > 1 ? 's' : ''}
        </h2>

        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#2a2a2a] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">
                      {comment.author.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white text-sm font-medium">{comment.author.name}</span>
                  <span className="text-gray-500 text-xs">{formatDate(comment.createdAt)}</span>
                </div>
                {currentUserId === comment.author.id && editingCommentId !== comment.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEditComment(comment)} className="p-1 text-gray-500 hover:text-white transition-colors" title="Modifier">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteComment(comment.id)} className="p-1 text-gray-500 hover:text-red-500 transition-colors" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editCommentContent}
                    onChange={(e) => setEditCommentContent(e.target.value)}
                    className="w-full bg-[#2a2a2a] text-white rounded-lg p-2 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1] text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEditComment(comment.id)}
                      className="flex items-center gap-1 bg-[#6366f1] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#5558e3] transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingCommentId(null)}
                      className="flex items-center gap-1 bg-[#2a2a2a] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#3a3a3a] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
              )}
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
