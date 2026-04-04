import React, { useState, useRef, useEffect } from 'react';
import aiService from '../../services/aiService';
import '../../styles/Chat.css';

const ChatInterface = ({ repoId }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am Groove AI. Ask me anything about this repository.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await aiService.queryRepository(repoId, input);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer,
        sources: data.sources 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error: Could not connect to the AI engine. Please ensure the backend is running.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container glass">
      <div className="chat-header">
        <h3>AI Repository Assistant</h3>
        <span className="status-badge pulse">Grok 3.0 Llama</span>
      </div>
      
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="message-bubble">
              <p>{m.content}</p>
              {m.sources && m.sources.length > 0 && (
                <div className="message-sources">
                  <strong>Sources:</strong>
                  <ul>
                    {m.sources.map((s, j) => <li key={j}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-bubble typing">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the code..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? '...' : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
