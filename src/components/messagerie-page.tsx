'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  FileText, Download, Calendar, MessageSquare, Send, Plus, X, 
  Paperclip, Image as ImageIcon, Music, File, Video, Mic, Check, CheckCheck,
  Smile, MoreVertical, Search, Camera, FileAudio, FileVideo, FileText as FileDoc,
  ChevronLeft, Phone, VideoIcon, Play
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize?: number | null;
}

interface Message {
  id: string;
  content: string;
  subject?: string | null;
  type: string;
  amount?: number | null;
  description?: string | null;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; name: string; role: string };
  receiver: { id: string; name: string; role: string };
  attachments?: Attachment[];
}

interface Conversation {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatar?: string;
}

interface FilePreview {
  file: File;
  preview: string | null;
  type: 'image' | 'audio' | 'video' | 'document';
}

export default function MessageriePage() {
  const currentUser = useAppStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [newMessage, setNewMessage] = useState({ receiverId: '', content: '', subject: '', type: 'message' });
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Handle drag and drop
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = Array.from(e.dataTransfer?.files || []);
      handleFiles(files);
    };

    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener('dragover', handleDragOver);
      dropZone.addEventListener('dragleave', handleDragLeave);
      dropZone.addEventListener('drop', handleDrop);
    }

    return () => {
      if (dropZone) {
        dropZone.removeEventListener('dragover', handleDragOver);
        dropZone.removeEventListener('dragleave', handleDragLeave);
        dropZone.removeEventListener('drop', handleDrop);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      setMessages(data.messages || []);
      
      // Generate conversations from messages
      const convos: Conversation[] = [];
      const seenSenders = new Set<string>();
      
      data.messages?.forEach((msg: Message) => {
        if (!seenSenders.has(msg.sender.id)) {
          seenSenders.add(msg.sender.id);
          convos.push({
            id: msg.sender.id,
            name: msg.sender.name,
            role: msg.sender.role,
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unreadCount: 0,
          });
        }
      });
      
      setConversations(convos);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiles = (files: File[]) => {
    const newFiles: FilePreview[] = files.map(file => {
      let preview: string | null = null;
      let type: FilePreview['type'] = 'document';
      
      if (file.type.startsWith('image/')) {
        type = 'image';
        preview = URL.createObjectURL(file);
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
        preview = URL.createObjectURL(file);
      }
      
      return { file, preview, type };
    });
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setShowAttachMenu(false);
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('content', messageInput || newMessage.content);
      formData.append('receiverId', selectedConversation || 'demo-studio');
      formData.append('subject', newMessage.subject);
      formData.append('type', 'message');
      
      // Add files if selected
      selectedFiles.forEach((filePreview, index) => {
        formData.append(`file-${index}`, filePreview.file);
      });

      const res = await fetch('/api/messages', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        setMessageInput('');
        setSelectedFiles([]);
        setShowNewMessage(false);
        setNewMessage({ receiverId: '', content: '', subject: '', type: 'message' });
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const getFileColor = (fileType: string) => {
    switch (fileType) {
      case 'image': return 'bg-green-500';
      case 'audio': return 'bg-orange-500';
      case 'video': return 'bg-red-500';
      default: return 'bg-[#6366f1]';
    }
  };

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return '';
    const sizes = ['o', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const allConversations = conversations;

  return (
    <div className="h-[calc(100vh-120px)] lg:h-[calc(100vh-80px)] flex bg-[#121212]" ref={dropZoneRef}>
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-[#6366f1]/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border-2 border-dashed border-[#6366f1] text-center">
            <Paperclip className="w-12 h-12 text-[#6366f1] mx-auto mb-3" />
            <p className="text-white font-medium text-lg">Déposez vos fichiers ici</p>
            <p className="text-gray-500 text-sm mt-1">Images, audio, vidéo, documents</p>
          </div>
        </div>
      )}

      {/* Conversations List - Desktop */}
      <div className="hidden lg:flex flex-col w-80 border-r border-[#2a2a2a]">
        {/* Header */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <h1 className="text-xl font-bold text-white mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              className="w-full bg-[#1a1a1a] text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            />
          </div>
        </div>

        {/* New Message Button */}
        <div className="p-3">
          <button
            onClick={() => setShowNewMessage(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#6366f1] text-white py-3 rounded-xl hover:bg-[#5558e3] transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nouvelle conversation
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {allConversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => setSelectedConversation(convo.id)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors text-left border-b border-[#1a1a1a] ${
                selectedConversation === convo.id ? 'bg-[#1a1a1a]' : ''
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {convo.name[0]}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium truncate">{convo.name}</p>
                  <span className="text-gray-500 text-xs">{formatTime(convo.lastMessageTime)}</span>
                </div>
                <p className="text-gray-500 text-sm truncate mt-0.5">{convo.lastMessage}</p>
              </div>
              {convo.unreadCount > 0 && (
                <span className="bg-[#6366f1] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {convo.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between bg-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-full flex items-center justify-center text-white font-bold">
                    {allConversations.find(c => c.id === selectedConversation)?.name[0]}
                  </div>
                </div>
                <div>
                  <p className="text-white font-medium">
                    {allConversations.find(c => c.id === selectedConversation)?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-full transition-colors">
                  <VideoIcon className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0d0d0d]">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">
                  Aucun message échangé pour le moment.
                </p>
              ) : (
                messages.map((msg) => {
                  const isSentByMe = msg.sender.id === currentUser?.id;
                  return (
                    <div key={msg.id} className={isSentByMe ? 'flex justify-end' : 'flex gap-2 max-w-[85%]'}>
                      {!isSentByMe && (
                        <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          {msg.sender.name[0]}
                        </div>
                      )}
                      <div className={isSentByMe ? 'max-w-[85%]' : ''}>
                        <div className={`rounded-2xl p-3 ${isSentByMe ? 'bg-[#6366f1] rounded-tr-sm' : 'bg-[#2a2a2a] rounded-tl-sm'}`}>
                          <p className="text-white">{msg.content}</p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.attachments.map((att) => (
                                <div key={att.id} className="bg-[#1a1a1a] rounded-xl p-3 flex items-center gap-3">
                                  <div className={`w-10 h-10 ${getFileColor(att.fileType)} rounded-lg flex items-center justify-center text-white`}>
                                    {getFileIcon(att.fileType)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{att.fileName}</p>
                                    <p className="text-gray-500 text-xs">{formatFileSize(att.fileSize)}</p>
                                  </div>
                                  <button className="text-[#6366f1] hover:bg-[#6366f1]/10 p-2 rounded-lg transition-colors">
                                    <Download className="w-5 h-5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isSentByMe ? 'justify-end' : ''}`}>
                          <span className="text-gray-500 text-xs">{formatTime(msg.createdAt)}</span>
                          {isSentByMe && (
                            <CheckCheck className={`w-4 h-4 ${msg.isRead ? 'text-[#6366f1]' : 'text-gray-500'}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File Previews - WhatsApp style */}
            {selectedFiles.length > 0 && (
              <div className="p-3 border-t border-[#2a2a2a] bg-[#1a1a1a]">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {selectedFiles.map((filePreview, index) => (
                    <div key={index} className="relative flex-shrink-0 group">
                      {filePreview.type === 'image' && filePreview.preview ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden relative">
                          <img src={filePreview.preview} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <div className="w-24 h-20 bg-[#2a2a2a] rounded-xl flex flex-col items-center justify-center p-2">
                          <div className={`w-10 h-10 ${getFileColor(filePreview.type)} rounded-lg flex items-center justify-center text-white mb-1`}>
                            {getFileIcon(filePreview.type)}
                          </div>
                          <p className="text-white text-[10px] truncate max-w-full">{filePreview.file.name}</p>
                        </div>
                      )}
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-1">{selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné{selectedFiles.length > 1 ? 's' : ''}</p>
              </div>
            )}

            {/* Input Area - WhatsApp style */}
            <div className="p-3 border-t border-[#2a2a2a] bg-[#1a1a1a]">
              <form onSubmit={handleSubmitMessage} className="flex items-end gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-2.5 text-gray-400 hover:text-[#6366f1] hover:bg-[#2a2a2a] rounded-full transition-all"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  {/* Attachment Menu - WhatsApp style */}
                  {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-3 bg-[#2a2a2a] rounded-2xl p-2 shadow-xl border border-[#3a3a3a] min-w-[180px]">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.mp3,.wav,.flac"
                      />
                      
                      {[
                        { icon: FileDoc, label: 'Document', color: 'bg-[#6366f1]', accept: '' },
                        { icon: ImageIcon, label: 'Photos', color: 'bg-purple-500', accept: 'image/*' },
                        { icon: Music, label: 'Audio', color: 'bg-orange-500', accept: 'audio/*' },
                        { icon: Video, label: 'Vidéo', color: 'bg-red-500', accept: 'video/*' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#3a3a3a] rounded-xl text-left transition-colors"
                        >
                          <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center`}>
                            <item.icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-white text-sm font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-[#2a2a2a] rounded-2xl flex items-end">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1 bg-transparent text-white placeholder:text-gray-500 p-3.5 resize-none focus:outline-none min-h-[48px] max-h-32"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitMessage(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="p-3 text-gray-400 hover:text-white transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="p-3 text-gray-400 hover:text-white transition-colors lg:hidden"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!messageInput.trim() && selectedFiles.length === 0}
                  className="w-12 h-12 bg-[#6366f1] text-white rounded-full hover:bg-[#5558e3] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-[#6366f1]/30"
                >
                  {messageInput.trim() || selectedFiles.length > 0 ? (
                    <Send className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#0d0d0d]">
            <div className="w-24 h-24 bg-[#6366f1]/20 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-12 h-12 text-[#6366f1]" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Vos messages</h2>
            <p className="text-gray-400 mb-8 max-w-md">
              Envoyez des messages, partagez des fichiers audio, images et collaborez avec les studios
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowNewMessage(true)}
                className="flex items-center gap-2 bg-[#6366f1] text-white px-8 py-3.5 rounded-xl hover:bg-[#5558e3] transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Commencer une conversation
              </button>
              <p className="text-gray-600 text-sm">Glissez-déposez des fichiers pour les envoyer</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Conversations List */}
      {selectedConversation === null && (
        <div className="lg:hidden absolute inset-0 bg-[#121212] flex flex-col">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h1 className="text-xl font-bold text-white mb-4">Messages</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full bg-[#1a1a1a] text-white pl-10 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="p-3">
            <button
              onClick={() => setShowNewMessage(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#6366f1] text-white py-3 rounded-xl font-medium"
            >
              <Plus className="w-5 h-5" />
              Nouvelle conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {allConversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConversation(convo.id)}
                className="w-full p-4 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors text-left border-b border-[#1a1a1a]"
              >
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {convo.name[0]}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium truncate">{convo.name}</p>
                    <span className="text-gray-500 text-xs">{formatTime(convo.lastMessageTime)}</span>
                  </div>
                  <p className="text-gray-500 text-sm truncate mt-0.5">{convo.lastMessage}</p>
                </div>
                {convo.unreadCount > 0 && (
                  <span className="bg-[#6366f1] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                    {convo.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouvelle conversation</h2>
              <button onClick={() => setShowNewMessage(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmitMessage} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Destinataire</label>
                <select className="w-full bg-[#2a2a2a] text-white rounded-xl p-3 border border-[#3a3a3a] focus:outline-none focus:border-[#6366f1]">
                  <option value="">Sélectionner un studio ou contact</option>
                  {allConversations.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Message</label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({...newMessage, content: e.target.value})}
                  className="w-full bg-[#2a2a2a] text-white rounded-xl p-3 border border-[#3a3a3a] min-h-[120px] focus:outline-none focus:border-[#6366f1]"
                  placeholder="Votre message..."
                  required
                />
              </div>
              
              {/* File attachment */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Pièces jointes</label>
                <div className="border-2 border-dashed border-[#3a3a3a] rounded-xl p-6 text-center hover:border-[#6366f1] transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Paperclip className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Cliquez ou glissez-déposez</p>
                    <p className="text-gray-600 text-xs mt-1">Images, audio, vidéo, documents</p>
                  </label>
                </div>
              </div>
              
              <button type="submit" className="w-full bg-[#6366f1] text-white py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#5558e3] transition-colors">
                <Send className="w-4 h-4" />
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
