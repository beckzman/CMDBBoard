import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, ArrowLeft, Loader } from 'lucide-react';
import { aiAPI } from '../../api/client';
import './AnalysisAI.css';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

const AnalysisAI: React.FC = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            text: 'Hello! I am your CMDB AI Assistant. I have access to your infrastructure data. How can I help you today?',
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: input.trim(),
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await aiAPI.query(userMessage.text);
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.answer,
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: error.response?.data?.detail || 'Sorry, I encountered an error. Please checks if the API Key is configured.',
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="analysis-ai-page">
            <header className="page-header">
                <button className="back-button" onClick={() => navigate('/analysis')}>
                    <ArrowLeft size={20} />
                    Back to Analysis
                </button>
                <h1>AI Insights</h1>
                <p className="subtitle">Ask questions about your infrastructure</p>
            </header>

            <div className="chat-container">
                <div className="messages-area">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                            <div className="message-avatar">
                                {msg.sender === 'ai' ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className="message-content">
                                <div className="message-text">
                                    {msg.text.split('\n').map((line, i) => (
                                        <p key={i}>{line}</p>
                                    ))}
                                </div>
                                <span className="message-time">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="message-wrapper ai">
                            <div className="message-avatar">
                                <Bot size={20} />
                            </div>
                            <div className="message-content loading">
                                <Loader className="spin" size={20} />
                                <span>Analyzing CMDB data...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="input-area" onSubmit={handleSend}>
                    <input
                        type="text"
                        placeholder="Ask about servers, databases, or dependencies..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={loading}
                        autoFocus
                    />
                    <button type="submit" disabled={!input.trim() || loading}>
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AnalysisAI;
