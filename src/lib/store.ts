import { create } from 'zustand';

export type PageType = 'login' | 'register' | 'accueil' | 'rendezvous' | 'creations' | 'messagerie' | 'reglages' | 'forum' | 'e-studio' | 'onelib';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
}

interface Studio {
  id: string;
  name: string;
  location: string;
  type: string;
  pricePerHour: number;
  rating: number;
  description?: string | null;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  duration: number;
  status: string;
  notes?: string | null;
  totalPrice?: number | null;
  studio: { id: string; name: string; location: string };
}

interface Track {
  id: string;
  title: string;
  artist: string;
  bpm?: number | null;
  key?: string | null;
  studioName?: string | null;
  status: string;
  createdAt: string;
}

interface Text {
  id: string;
  title: string;
  artist: string;
  content?: string | null;
  createdAt: string;
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

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  _count?: { posts: number };
}

interface AppState {
  // Navigation
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  isLoggedIn: boolean;
  
  // Data
  studios: Studio[];
  setStudios: (studios: Studio[]) => void;
  
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  
  tracks: Track[];
  setTracks: (tracks: Track[]) => void;
  
  texts: Text[];
  setTexts: (texts: Text[]) => void;
  
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  
  forumPosts: ForumPost[];
  setForumPosts: (posts: ForumPost[]) => void;
  
  forumCategories: ForumCategory[];
  setForumCategories: (categories: ForumCategory[]) => void;
  
  selectedForumCategory: string | null;
  setSelectedForumCategory: (categoryId: string | null) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  fetchData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentPage: 'login',
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // User
  user: null,
  setUser: (user) => set({ user, isLoggedIn: !!user }),
  isLoggedIn: false,
  
  // Data
  studios: [],
  setStudios: (studios) => set({ studios }),
  
  appointments: [],
  setAppointments: (appointments) => set({ appointments }),
  
  tracks: [],
  setTracks: (tracks) => set({ tracks }),
  
  texts: [],
  setTexts: (texts) => set({ texts }),
  
  messages: [],
  setMessages: (messages) => set({ messages }),
  
  forumPosts: [],
  setForumPosts: (posts) => set({ forumPosts: posts }),
  
  forumCategories: [],
  setForumCategories: (categories) => set({ forumCategories: categories }),
  
  selectedForumCategory: null,
  setSelectedForumCategory: (categoryId) => set({ selectedForumCategory: categoryId }),
  
  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Actions
  login: (user) => set({ user, isLoggedIn: true, currentPage: 'accueil' }),
  logout: () => set({ 
    user: null, 
    isLoggedIn: false, 
    currentPage: 'login',
    studios: [],
    appointments: [],
    tracks: [],
    texts: [],
    messages: [],
    forumPosts: []
  }),
  
  fetchData: async () => {
    const { isLoggedIn } = get();
    if (!isLoggedIn) return;
    
    set({ isLoading: true });
    
    try {
      // Fetch all data in parallel
      const [studiosRes, appointmentsRes, tracksRes, textsRes, messagesRes, categoriesRes] = await Promise.all([
        fetch('/api/studios'),
        fetch('/api/appointments'),
        fetch('/api/tracks'),
        fetch('/api/texts'),
        fetch('/api/messages'),
        fetch('/api/forum/categories')
      ]);
      
      const [studiosData, appointmentsData, tracksData, textsData, messagesData, categoriesData] = await Promise.all([
        studiosRes.json(),
        appointmentsRes.json(),
        tracksRes.json(),
        textsRes.json(),
        messagesRes.json(),
        categoriesRes.json()
      ]);
      
      set({
        studios: studiosData.studios || [],
        appointments: appointmentsData.appointments || [],
        tracks: tracksData.tracks || [],
        texts: textsData.texts || [],
        messages: messagesData.messages || [],
        forumCategories: categoriesData.categories || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      set({ isLoading: false });
    }
  }
}));
