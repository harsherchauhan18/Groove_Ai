import React, { useState, useRef, useEffect } from 'react';
import aiService from '../../services/aiService';
import useChatStore from '../../store/useChatStore';
import '../../styles/Chat.css';

const ChatInterface = ({ repoId }) => {
  const { 
    threads, setThreads, addThread, 
    activeThreadId, setActiveThreadId, 
    messages, setMessages, addMessage, updateLastMessage, clearStore 
  } = useChatStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    return () => clearStore();
  }, [repoId, clearStore]);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const data = await aiService.getThreads(repoId);
        setThreads(data);
        if (data.length > 0) {
          handleSelectThread(data[0].id);
        } else {
          handleNewChat();
        }
      } catch (err) {
        console.error("Failed to load threads", err);
      }
    };
    if (repoId) {
      fetchThreads();
    }
  }, [repoId]);

  const handleNewChat = async () => {
    try {
      setLoading(true);
      const data = await aiService.createThread(repoId);
      const newThread = { id: data.thread_id, title: 'New Chat', created_at: new Date().toISOString() };
      addThread(newThread);
      setActiveThreadId(data.thread_id);
      setMessages([{ role: 'assistant', content: 'Hello! I am Groove AI. Ask me anything about this repository.' }]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectThread = async (threadId) => {
    if (activeThreadId === threadId) return;
    try {
      setLoading(true);
      setActiveThreadId(threadId);
      const data = await aiService.getMessages(threadId);
      if (data.length === 0) {
        setMessages([{ role: 'assistant', content: 'Hello! I am Groove AI. Ask me anything about this repository.' }]);
      } else {
        setMessages(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeThreadId) return;

    const userMsg = { role: 'user', content: input };
    addMessage(userMsg);
    addMessage({ role: 'assistant', content: '' }); // empty placeholder for stream
    
    setInput('');
    setLoading(true);

    try {
      await aiService.sendMessageStream(
        repoId, 
        activeThreadId, 
        userMsg.content,
        (chunk) => {
          updateLastMessage(chunk);
          scrollToBottom();
        },
        () => {
          setLoading(false);
          aiService.getThreads(repoId).then(setThreads);
        },
        (error) => {
          updateLastMessage('\n[Error: Connection Interrupted]');
          setLoading(false);
        }
      );
    } catch (error) {
      updateLastMessage('\nError: Could not start streaming.');
      setLoading(false);
    }
  };

  return (
    <div className="chat-container glass">
      
      {/* Sidebar for threads */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button onClick={handleNewChat} className="new-chat-btn">
            + New Chat
          </button>
        </div>
        <div className="chat-sidebar-list">
          {threads.map(t => (
            <div 
              key={t.id} 
              onClick={() => handleSelectThread(t.id)}
              className={`chat-thread-item ${activeThreadId === t.id ? 'active' : ''}`}
            >
              {t.title}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        <div className="chat-header">
          <h3>AI Repository Assistant</h3>
          <span className="status-badge pulse">Memory Active</span>
        </div>
        
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Groove AI..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? '...' : (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </form>
      </div>

    </div>
  );
};

export default ChatInterface;
