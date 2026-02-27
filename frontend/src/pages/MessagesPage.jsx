import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { 
  MessageCircle, Send, ArrowLeft, Search, Circle, 
  Image as ImageIcon, MoreVertical, Check, CheckCheck,
  Phone, Video, Info
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import Header from "../components/Header";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
        setUser(response.data);
      } catch (error) {
        navigate("/auth");
      }
    };
    fetchUser();
  }, [navigate]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!user) return;

    const getToken = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/token`, { withCredentials: true });
        return response.data.token;
      } catch {
        return null;
      }
    };

    const connectWebSocket = async () => {
      const token = await getToken();
      if (!token) return;

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = API_URL.replace(/^https?:\/\//, "");
      const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${user.user_id}?token=${token}`;

      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log("WebSocket connected");
        };

        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === "new_message") {
            // Add message to current conversation if active
            if (activeConversation?.conversation_id === data.message.conversation_id) {
              setMessages(prev => [...prev, data.message]);
            }
            // Update conversations list
            fetchConversations();
          } else if (data.type === "typing") {
            if (data.conversation_id === activeConversation?.conversation_id) {
              setOtherUserTyping(true);
              setTimeout(() => setOtherUserTyping(false), 3000);
            }
          } else if (data.type === "messages_read") {
            // Update read status for messages
            if (data.conversation_id === activeConversation?.conversation_id) {
              setMessages(prev => prev.map(msg => 
                msg.sender_id === user.user_id ? { ...msg, is_read: true } : msg
              ));
            }
          }
        };

        wsRef.current.onclose = () => {
          console.log("WebSocket disconnected");
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("WebSocket connection error:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, activeConversation]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API_URL}/api/conversations`, { withCredentials: true });
      setConversations(response.data.conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      setLoading(false);
    }
  }, [user, fetchConversations]);

  // Fetch conversation messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId || !user) return;
      
      try {
        const response = await axios.get(
          `${API_URL}/api/conversations/${conversationId}`,
          { withCredentials: true }
        );
        setActiveConversation(response.data.conversation);
        setMessages(response.data.messages);
        
        // Mark as read via WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "read",
            conversation_id: conversationId
          }));
        }
      } catch (error) {
        toast.error("Nu am putut încărca conversația");
        navigate("/messages");
      }
    };
    
    fetchMessages();
  }, [conversationId, user, navigate]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sendingMessage) return;

    setSendingMessage(true);
    const messageContent = newMessage;
    setNewMessage("");

    try {
      const otherUserId = activeConversation.participants.find(p => p !== user.user_id);
      await axios.post(
        `${API_URL}/api/messages`,
        {
          ad_id: activeConversation.ad_id,
          receiver_id: otherUserId,
          content: messageContent
        },
        { withCredentials: true }
      );
      // Message will be added via WebSocket
    } catch (error) {
      toast.error("Eroare la trimiterea mesajului");
      setNewMessage(messageContent);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (!isTyping) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify({
        type: "typing",
        conversation_id: activeConversation?.conversation_id
      }));
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => 
    conv.ad_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Ieri";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("ro-RO", { weekday: "short" });
    } else {
      return date.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="messages-page">
      <Header />
      
      <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex">
        {/* Conversations List */}
        <div className={`w-full md:w-96 border-r border-white/5 flex flex-col ${conversationId ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-white/5">
            <h1 className="text-xl font-bold text-white mb-4">Mesaje</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Caută conversații..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#121212] border-white/10 text-white"
                data-testid="search-conversations"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nicio conversație</p>
                <p className="text-slate-500 text-sm mt-2">
                  Conversațiile vor apărea aici când contactezi vânzătorii
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <Link
                  key={conv.conversation_id}
                  to={`/messages/${conv.conversation_id}`}
                  className={`flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 ${
                    conversationId === conv.conversation_id ? 'bg-white/5' : ''
                  }`}
                  data-testid={`conversation-${conv.conversation_id}`}
                >
                  {/* Ad Image or User Avatar */}
                  <div className="relative flex-shrink-0">
                    {conv.ad_image ? (
                      <img
                        src={conv.ad_image}
                        alt={conv.ad_title}
                        className="w-14 h-14 rounded-xl object-cover"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/56?text=X67";
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {conv.other_user?.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-xs font-bold text-white flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white truncate">
                        {conv.other_user?.name || "Utilizator"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {conv.last_message_at && formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 truncate">{conv.ad_title}</p>
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-slate-500'}`}>
                      {conv.last_message || "Conversație nouă"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {conversationId && activeConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white"
                onClick={() => navigate("/messages")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <Link to={`/ad/${activeConversation.ad_id}`} className="flex items-center gap-3 flex-1">
                {activeConversation.ad_image ? (
                  <img
                    src={activeConversation.ad_image}
                    alt={activeConversation.ad_title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
                )}
                <div>
                  <h2 className="font-medium text-white">{activeConversation.ad_title}</h2>
                  <p className="text-sm text-slate-400">
                    {activeConversation.ad_price ? `${activeConversation.ad_price.toLocaleString()} RON` : "Preț la cerere"}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Info className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === user?.user_id;
                const showDate = index === 0 || 
                  new Date(msg.created_at).toDateString() !== new Date(messages[index-1]?.created_at).toDateString();
                
                return (
                  <div key={msg.message_id}>
                    {showDate && (
                      <div className="text-center text-xs text-slate-500 my-4">
                        {new Date(msg.created_at).toLocaleDateString("ro-RO", {
                          weekday: "long",
                          day: "numeric",
                          month: "long"
                        })}
                      </div>
                    )}
                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-[#1A1A1A] text-white rounded-bl-md'
                        }`}
                      >
                        <p className="break-words">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs opacity-70">
                            {formatTime(msg.created_at)}
                          </span>
                          {isOwn && (
                            msg.is_read ? (
                              <CheckCheck className="w-4 h-4 text-blue-300" />
                            ) : (
                              <Check className="w-4 h-4 opacity-70" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#1A1A1A] rounded-2xl px-4 py-2 rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-white flex-shrink-0"
                >
                  <ImageIcon className="w-5 h-5" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Scrie un mesaj..."
                  className="flex-1 bg-[#121212] border-white/10 text-white"
                  data-testid="message-input"
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-blue-600 hover:bg-blue-500 text-white flex-shrink-0"
                  data-testid="send-message-btn"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* Empty State */
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-white mb-2">Mesajele tale</h2>
              <p className="text-slate-400">Selectează o conversație pentru a vedea mesajele</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
