import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "../../css/MessagingPage.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

const MessagingPage = ({ userId, username }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [userLastMessage, setUserLastMessage] = useState(() => {
    // Load from localStorage if available
    try {
      const stored = localStorage.getItem("msg_last_times");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState([]); // for group messaging
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all"); // all, role
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Whenever userLastMessage changes, persist to localStorage
  useEffect(() => {
    localStorage.setItem("msg_last_times", JSON.stringify(userLastMessage));
  }, [userLastMessage]);

  // Always keep users sorted by last message time
  useEffect(() => {
    setUsers((prev) => {
      const updated = [...prev];
      updated.sort(
        (a, b) => (userLastMessage[b.id] || 0) - (userLastMessage[a.id] || 0)
      );
      return updated;
    });
  }, [userLastMessage, users.length]);

  // Socket.IO setup
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    if (userId) {
      socket.emit("join", userId);
    }
    socket.on("online-users", (userIds) => {
      setOnlineUsers(userIds.map((id) => parseInt(id)));
    });
    socket.on("receive-message", (data) => {
      // Only add if message is for this user
      if (data.to === userId) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender_id: data.from,
            receiver_id: data.to,
            content: data.content,
            sent_at: new Date().toISOString(),
            is_read: false,
          },
        ]);
        // Toast notification
        toast.info(
          `New message from ${
            users.find((u) => u.id === data.from)?.username || "User"
          }`
        );
        // Increment unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [data.from]: (prev[data.from] || 0) + 1,
        }));
        // Update last message time and sort users
        const now = Date.now();
        setUserLastMessage((prev) => ({ ...prev, [data.from]: now }));
        setUsers((prev) => {
          const updated = [...prev];
          updated.sort(
            (a, b) =>
              (userLastMessage[b.id] || 0) - (userLastMessage[a.id] || 0)
          );
          return updated;
        });
      }
    });
    socket.on("typing", (data) => {
      if (data.to === userId) {
        setTypingUsers((prev) => [...new Set([...prev, data.from])]);
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== data.from));
        }, 2000);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // Fetch all users (except current user)
  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers((data.users || []).filter((u) => u.id !== userId));
        // Optionally, fetch last message times here for all users
      })
      .catch(() => setError("Failed to load users."));
  }, [userId]);

  // Fetch messages when selectedUser changes
  useEffect(() => {
    if (!selectedUser) return;
    setLoading(true);
    fetch(`/api/admin/messages?user1=${userId}&user2=${selectedUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
        // Mark unread messages as read
        (data.messages || []).forEach((m) => {
          if (!m.is_read && m.receiver_id === userId) {
            fetch(`/api/admin/messages/${m.id}/read`, { method: "POST" });
          }
        });
      })
      .catch(() => setError("Failed to load messages."))
      .finally(() => setLoading(false));
  }, [selectedUser, userId]);

  // When user selects a chat, reset unread count
  useEffect(() => {
    if (selectedUser) {
      setUnreadCounts((prev) => ({ ...prev, [selectedUser.id]: 0 }));
    }
  }, [selectedUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || (!selectedUser && selectedGroup.length === 0))
      return;
    setSending(true);
    // Group send (not yet real-time)
    if (selectedGroup.length > 0) {
      Promise.all(
        selectedGroup.map((u) =>
          axios
            .post("/api/messages", {
              sender_id: userId,
              receiver_id: u.id,
              content: newMessage.trim(),
            })
            .then(() => {
              socketRef.current.emit("send-message", {
                from: userId,
                to: u.id,
                content: newMessage.trim(),
              });
            })
        )
      )
        .then(() => {
          setNewMessage("");
        })
        .catch(() => setError("Failed to send group message."))
        .finally(() => setSending(false));
    } else {
      axios
        .post("/api/messages", {
          sender_id: userId,
          receiver_id: selectedUser.id,
          content: newMessage.trim(),
        })
        .then((res) => {
          if (res.data.success) {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                sender_id: userId,
                receiver_id: selectedUser.id,
                content: newMessage.trim(),
                sent_at: new Date().toISOString(),
                is_read: false,
              },
            ]);
            socketRef.current.emit("send-message", {
              from: userId,
              to: selectedUser.id,
              content: newMessage.trim(),
            });
            setNewMessage("");
            const now = Date.now();
            setUserLastMessage((prev) => ({ ...prev, [selectedUser.id]: now }));
            setUsers((prev) => {
              const updated = [...prev];
              updated.sort(
                (a, b) =>
                  (userLastMessage[b.id] || 0) - (userLastMessage[a.id] || 0)
              );
              return updated;
            });
          }
        })
        .catch(() => setError("Failed to send message."))
        .finally(() => setSending(false));
    }
  };

  // Typing indicator
  const handleTyping = () => {
    if (!selectedUser && selectedGroup.length === 0) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current.emit("typing", {
      from: userId,
      to: selectedUser ? selectedUser.id : selectedGroup[0]?.id,
    });
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  // Filter and search users
  let filteredUsers = users.filter((u) => {
    if (userFilter !== "all" && u.role !== userFilter) return false;
    if (
      userSearch &&
      !u.username.toLowerCase().includes(userSearch.toLowerCase())
    )
      return false;
    return true;
  });
  // Always sort filtered users by last message time
  filteredUsers = filteredUsers.sort(
    (a, b) => (userLastMessage[b.id] || 0) - (userLastMessage[a.id] || 0)
  );
  const uniqueRoles = Array.from(new Set(users.map((u) => u.role)));

  return (
    <div className="msg-page-container">
      <div style={{ position: "relative" }}>
        <button
          className="messaging-back-btn"
          onClick={() => navigate(-1)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            margin: 8,
            padding: "4px 10px",
            borderRadius: 6,
            background: "#f4f8fc",
            color: "#174ea6",
            border: "1px solid #e3f0ff",
            fontWeight: 500,
            fontSize: 14,
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          ← Back
        </button>
        {/* Main chat content below, not hidden or overlapped */}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="msg-users-list">
        <h3>Chats</h3>
        <div className="msg-users-list-search">
          <input
            type="text"
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            style={{ width: "100%", marginBottom: 4 }}
          />
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <ul>
          {filteredUsers.map((u) => (
            <li
              key={u.id}
              className={
                selectedUser && selectedUser.id === u.id ? "active" : ""
              }
              onClick={() => {
                setSelectedUser(u);
                setSelectedGroup([]);
              }}
            >
              <input
                type="checkbox"
                checked={selectedGroup.some((g) => g.id === u.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedGroup((prev) => [...prev, u]);
                  } else {
                    setSelectedGroup((prev) =>
                      prev.filter((g) => g.id !== u.id)
                    );
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ marginRight: 6 }}
              />
              {u.username} <span className="msg-role">({u.role})</span>
              {onlineUsers.includes(u.id) && (
                <span className="msg-online-dot" title="Online"></span>
              )}
              {unreadCounts[u.id] > 0 && (
                <span className="msg-unread-badge">{unreadCounts[u.id]}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="msg-conversation">
        {selectedUser || selectedGroup.length > 0 ? (
          <>
            <div className="msg-conv-header">
              <span>
                {selectedGroup.length > 0
                  ? `Message group (${selectedGroup
                      .map((u) => u.username)
                      .join(", ")})`
                  : `Chat with ${selectedUser.username}`}
              </span>
            </div>
            <div className="msg-messages-list">
              {loading ? (
                <div className="msg-loading">Loading...</div>
              ) : (
                <ul>
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      className={
                        m.sender_id === userId ? "msg-sent" : "msg-received"
                      }
                    >
                      <div className="msg-content">{m.content}</div>
                      <div className="msg-meta">
                        {new Date(m.sent_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {m.is_read && m.sender_id === userId && (
                          <span className="msg-read">✓</span>
                        )}
                      </div>
                    </li>
                  ))}
                  {typingUsers.length > 0 && (
                    <li className="msg-typing-indicator">
                      {typingUsers
                        .map((id) => {
                          const u = users.find((u) => u.id === id);
                          return u
                            ? `${u.username} is typing...`
                            : "Someone is typing...";
                        })
                        .join(" ")}
                    </li>
                  )}
                  <div ref={messagesEndRef} />
                </ul>
              )}
            </div>
            <form className="msg-input-form" onSubmit={handleSend}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onInput={handleTyping}
                placeholder="Type a message..."
                disabled={sending}
                autoFocus
                rows={1}
                style={{ resize: "none", minHeight: 36, maxHeight: 120 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim() && !sending) handleSend(e);
                  }
                }}
              />
            </form>
          </>
        ) : (
          <div className="msg-select-user">
            Select a user or group to start chatting.
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingPage;
