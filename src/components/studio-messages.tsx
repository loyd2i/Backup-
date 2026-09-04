'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Search, Send, Plus, X, Paperclip, Image as ImageIcon, Music, File, 
  Video, Mic, CheckCheck, Smile, Phone, VideoIcon, MoreVertical, 
  ChevronLeft, Clock, Calendar
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  lastAppointment?: {
    date: string;
    startTime: string;
  };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
  attachments?: {
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize?: number;
  }[];
}

export default function StudioMessages() {
  const [clients, setClients] = useState<Client[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchClients = async () => {
    try {
      // Fetch clients who have booked appointments with this studio
      const res = await fetch('/api/studio/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (clientId: string) => {
    try {
      const res = await fetch(`/api/messages?userId=${clientId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    fetchMessages(client.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedClient) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageInput,
          receiverId: selectedClient.id,
          type: 'message'
        })
      });

      if (res.ok) {
        setMessageInput('');
        fetchMessages(selectedClient.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  };

  const allClients = clients;

  return (
    <div className="h-[calc(100vh-120px)] lg:h-[calc(100vh-80px)] flex bg-[#121212]">
      {/* Clients List - Desktop */}
      <div className="hidden lg:flex flex-col w-80 border-r border-[#2a2a2a]">
        <div className="p-4 border-b border-[#2a2a2a]">
          <h1 className="text-xl font-bold text-white mb-4">Messages Clients</h1>
          <p className="text-gray-500 text-sm">Uniquement les clients ayant réservé</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-14 bg-[#2a2a2a] rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : allClients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Aucun client encore</p>
              <p className="text-gray-600 text-sm mt-1">Les clients apparaîtront après leur première réservation</p>
            </div>
          ) : (
            allClients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelectClient(client)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors text-left border-b border-[#1a1a1a] ${
                  selectedClient?.id === client.id ? 'bg-[#1a1a1a]' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-full flex items-center justify-center text-white font-bold">
                    {client.name[0]}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#121212]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{client.name}</p>
                  <p className="text-gray-500 text-sm truncate">{client.email}</p>
                  {client.lastAppointment && (
                    <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Dernier: {new Date(client.lastAppointment.date).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedClient ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between bg-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-11 h-11 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-full flex items-center justify-center text-white font-bold">
                  {selectedClient.name[0]}
                </div>
                <div>
                  <p className="text-white font-medium">{selectedClient.name}</p>
                  <p className="text-gray-500 text-sm">{selectedClient.email}</p>
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
              <div className="text-center py-4">
                <span className="text-gray-500 text-xs bg-[#2a2a2a] px-4 py-1.5 rounded-full">
                  Conversation avec {selectedClient.name}
                </span>
              </div>

              {messages.length === 0 ? (
                <p className="text-center text-gray-500 text-sm">
                  Aucun message échangé avec {selectedClient.name} pour le moment.
                </p>
              ) : (
                messages.map((msg) => {
                  const isFromClient = msg.senderId === selectedClient.id;
                  return isFromClient ? (
                    <div key={msg.id} className="flex gap-2 max-w-[85%]">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        {selectedClient.name[0]}
                      </div>
                      <div>
                        <div className="bg-[#2a2a2a] rounded-2xl rounded-tl-sm p-3">
                          <p className="text-white">{msg.content}</p>
                        </div>
                        <span className="text-gray-500 text-xs mt-1 block">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%]">
                        <div className="bg-[#6366f1] rounded-2xl rounded-tr-sm p-3">
                          <p className="text-white">{msg.content}</p>
                        </div>
                        <div className="flex justify-end items-center gap-1 mt-1">
                          <span className="text-gray-500 text-xs">{formatTime(msg.createdAt)}</span>
                          <CheckCheck className={`w-4 h-4 ${msg.isRead ? 'text-[#6366f1]' : 'text-gray-500'}`} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-[#2a2a2a] bg-[#1a1a1a]">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <button
                  type="button"
                  className="p-2.5 text-gray-400 hover:text-[#6366f1] hover:bg-[#2a2a2a] rounded-full transition-all"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

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
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="p-3 text-gray-400 hover:text-white transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="w-12 h-12 bg-[#6366f1] text-white rounded-full hover:bg-[#5558e3] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-[#6366f1]/30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#0d0d0d]">
            <div className="w-24 h-24 bg-[#6366f1]/20 rounded-full flex items-center justify-center mb-6">
              <Calendar className="w-12 h-12 text-[#6366f1]" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Messages Clients</h2>
            <p className="text-gray-400 mb-4 max-w-md">
              Communiquez uniquement avec les clients qui ont réservé une session dans votre studio
            </p>
            <p className="text-gray-600 text-sm">
              Sélectionnez un client dans la liste pour commencer une conversation
            </p>
          </div>
        )}
      </div>

      {/* Mobile Clients List */}
      {selectedClient === null && (
        <div className="lg:hidden absolute inset-0 bg-[#121212] flex flex-col">
          <div className="p-4 border-b border-[#2a2a2a]">
            <h1 className="text-xl font-bold text-white mb-2">Messages Clients</h1>
            <p className="text-gray-500 text-sm">Uniquement les clients ayant réservé</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {allClients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelectClient(client)}
                className="w-full p-4 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors text-left border-b border-[#1a1a1a]"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {client.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{client.name}</p>
                  <p className="text-gray-500 text-sm truncate">{client.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
