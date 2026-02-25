import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../App";
import { useNotifications } from "../contexts/NotificationContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { MessageCircle, Send, ArrowLeft, Image, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { notify, setUnreadCount } = useNotifications();
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const lastMessageCountRef = useRef({});

  // Poll for new messages every 10 seconds
  const checkNewMessages = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${API_URL}/api/conversations`, {
        withCredentials: true
      });
      const newConversations = response.data.conversations || [];
      
      // Check for new messages
      let totalUnread = 0;
      newConversations.forEach(conv => {
        const prevCount = lastMessageCountRef.current[conv.conversation_id] || 0;
        const currentCount = conv.message_count || 0;
        totalUnread += conv.unread_count || 0;
        
        // If we have more messages than before and it's not our current conversation
        if (currentCount > prevCount && conv.conversation_id !== selectedConversation) {
          const senderName = conv.other_user_name || 'Cineva';
          notify.newMessage(senderName, conv.last_message || 'Mesaj nou', `/messages`);
        }
        
        lastMessageCountRef.current[conv.conversation_id] = currentCount;
      });
      
      setUnreadCount(totalUnread);
      setConversations(newConversations);
    } catch (error) {
      console.error("Error polling messages:", error);
    }
  }, [user, selectedConversation, notify, setUnreadCount]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchConversations();
    
    // Check if we need to start a new conversation
    const adId = searchParams.get("ad");
    const receiverId = searchParams.get("to");
    if (adId && receiverId) {
      startNewConversation(adId, receiverId);
    }
    
    // Set up polling for new messages
    const pollInterval = setInterval(checkNewMessages, 10000);
    return () => clearInterval(pollInterval);
  }, [user, navigate, searchParams, checkNewMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/conversations`, {
        withCredentials: true
      });
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = async (adId, receiverId) => {
    // Send an initial message to create the conversation
    try {
      const response = await axios.post(
        `${API_URL}/api/messages`,
        {
          ad_id: adId,
          receiver_id: receiverId,
          content: "Bună! Sunt interesat de anunțul tău."
        },
        { withCredentials: true }
      );
      
      // Refresh conversations and select the new one
      await fetchConversations();
      selectConversation(response.data.conversation_id);
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const selectConversation = async (conversationId) => {
    setSelectedConversation(conversationId);
    try {
      const response = await axios.get(
        `${API_URL}/api/conversations/${conversationId}`,
        { withCredentials: true }
      );
      setMessages(response.data.messages || []);
      setOtherUser(response.data.other_user);
      
      // Mark as read in the list
      setConversations(prev => 
        prev.map(c => 
          c.conversation_id === conversationId 
            ? { ...c, unread_count: 0 } 
            : c
        )
      );
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Fast polling when a conversation is open (every 3 seconds)
  useEffect(() => {
    if (!selectedConversation) return;
    
    const pollMessages = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/conversations/${selectedConversation}`,
          { withCredentials: true }
        );
        
        const newMessages = response.data.messages || [];
        // Only update if there are new messages
        if (newMessages.length !== messages.length) {
          setMessages(newMessages);
          // Play notification sound for new messages
          if (newMessages.length > messages.length) {
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.sender_id !== user.user_id) {
              // Notify for new incoming message
              notify.newMessage(otherUser?.name || 'Cineva', lastMsg.content, `/messages`);
            }
          }
        }
      } catch (error) {
        console.error("Error polling messages:", error);
      }
    };

    // Poll every 3 seconds when conversation is open
    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedConversation, messages.length, user?.user_id, notify, otherUser]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const conv = conversations.find(c => c.conversation_id === selectedConversation);
    if (!conv) return;

    setSending(true);
    try {
      const receiverId = conv.participants.find(p => p !== user.user_id);
      await axios.post(
        `${API_URL}/api/messages`,
        {
          ad_id: conv.ad_id,
          receiver_id: receiverId,
          content: newMessage
        },
        { withCredentials: true }
      );
      
      // Add message to local state
      setMessages(prev => [...prev, {
        message_id: `temp_${Date.now()}`,
        sender_id: user.user_id,
        content: newMessage,
        created_at: new Date().toISOString()
      }]);
      
      setNewMessage("");
      
      // Update conversation's last message
      setConversations(prev =>
        prev.map(c =>
          c.conversation_id === selectedConversation
            ? { ...c, last_message: newMessage, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (error) {
      toast.error("Eroare la trimitere");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ro });
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="messages-page">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mesaje</h1>
            <p className="text-slate-400">{conversations.length} conversații</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Conversations List */}
          <div className="lg:col-span-1 rounded-2xl bg-[#0A0A0A] border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-white font-medium">Conversații</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="p-4 border-b border-white/5">
                    <div className="h-12 bg-[#121212] rounded animate-pulse" />
                  </div>
                ))
              ) : conversations.length > 0 ? (
                conversations.map((conv) => (
                  <button
                    key={conv.conversation_id}
                    onClick={() => selectConversation(conv.conversation_id)}
                    className={`w-full p-4 border-b border-white/5 text-left hover:bg-white/5 transition-colors ${
                      selectedConversation === conv.conversation_id ? "bg-white/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#121212] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {conv.other_user?.picture ? (
                          <img src={conv.other_user.picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-white font-medium truncate">{conv.other_user?.name || "Utilizator"}</p>
                          {conv.unread_count > 0 && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 truncate">{conv.ad_title}</p>
                        <p className="text-xs text-slate-500 truncate mt-1">{conv.last_message}</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">Nicio conversație</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2 rounded-2xl bg-[#0A0A0A] border border-white/5 overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-2 rounded-lg hover:bg-white/5"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-[#121212] flex items-center justify-center overflow-hidden">
                    {otherUser?.picture ? (
                      <img src={otherUser.picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{otherUser?.name || "Utilizator"}</p>
                    <p className="text-xs text-slate-400">
                      {conversations.find(c => c.conversation_id === selectedConversation)?.ad_title}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`flex ${msg.sender_id === user.user_id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.sender_id === user.user_id
                            ? "bg-blue-600 text-white"
                            : "bg-[#121212] text-white"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === user.user_id ? "text-blue-200" : "text-slate-500"
                        }`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-white/5">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Scrie un mesaj..."
                      className="flex-1 bg-[#121212] border-white/10 text-white"
                    />
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() || sending}
                      className="bg-blue-600 hover:bg-blue-500"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">Selectează o conversație</p>
                  <p className="text-slate-400 text-sm">Alege o conversație din listă pentru a vedea mesajele</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
