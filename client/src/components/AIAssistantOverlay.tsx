import React, { useState, useRef, useEffect } from 'react';
import { aiService } from '../ai/AIService';
import { SecurityEngine } from '../security/SecurityEngine';
import { AIToolRegistry } from '../ai/AIToolRegistry';

import { useNavigate, useLocation } from 'react-router-dom';

interface AIAssistantOverlayProps {
  securityEngine?: SecurityEngine;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function AIAssistantOverlay({ securityEngine: propSecurityEngine }: AIAssistantOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const defaultEngineRef = useRef(new SecurityEngine());
  const securityEngine = propSecurityEngine || defaultEngineRef.current;
  
  const navigate = useNavigate();
  const location = useLocation();

  // Phase 19: Keep AI context updated based on navigation
  useEffect(() => {
    aiService.setContext('currentRoute', location.pathname);
    if (location.pathname.startsWith('/room/')) {
        aiService.setContext('currentRoomId', location.pathname.split('/')[2]);
    } else {
        aiService.setContext('currentRoomId', null);
    }
  }, [location.pathname]);

  // Phase 18: Register navigation parser
  useEffect(() => {
    AIToolRegistry.registerTool('NAVIGATE', (payload) => {
        if (typeof payload === 'string') navigate(payload);
    });
    
    AIToolRegistry.registerTool('CREATE_ROOM', () => {
        navigate('/dashboard'); // in real app, we'd trigger room creation
        setTimeout(() => alert("AI is ready to create a room. Fill out your room details."), 500);
    });
  }, [navigate]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
        setMessages([{
            id: 'welcome',
            sender: 'ai',
            text: 'Hello! I am Nova, your secure WebRTC assistant. How can I help you today?',
            timestamp: new Date()
        }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'user',
        text: userText,
        timestamp: new Date()
    }]);

    setIsProcessing(true);

    try {
        const response = await aiService.processQuery(userText);
        
        let finalText = response.text;

        // Phase 15: AI Tool Registry & Permission Guard
        if (response.execution) {
            const isAllowed = securityEngine ? 
                securityEngine.evaluateAIPermission(response.execution.action, response.execution.riskLevel) : 
                true; // Allow if no guard provided (fallback)

            if (!isAllowed) {
                finalText += `\n\n[Security Block: The action '${response.execution.action}' was blocked because it violates the current security policy.]`;
            } else {
                const success = AIToolRegistry.executeTool(response.execution);
                if (success) {
                   finalText += `\n\n[Action Executed: ${response.execution.action}]`;
                }
            }
        }

        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: 'ai',
            text: finalText,
            timestamp: new Date()
        }]);

    } catch (err) {
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: 'ai',
            text: "I'm sorry, I encountered an error processing that.",
            timestamp: new Date()
        }]);
    } finally {
        setIsProcessing(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_0_30px_rgba(79,70,229,0.8)] flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_50px_rgba(79,70,229,1)] z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] bg-[#0A0A0B]/60 backdrop-blur-3xl border border-white/20 shadow-[0_0_50px_rgba(79,70,229,0.2)] ring-1 ring-white/10 rounded-3xl flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-b border-white/10 backdrop-blur-md flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-white font-bold text-sm tracking-wide">NOVA AI ASSISTANT</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white/10 text-gray-200 rounded-bl-none'
                }`}>
                    {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
                </div>
            </div>
        ))}
        {isProcessing && (
            <div className="flex justify-start">
                <div className="bg-white/10 text-gray-400 rounded-2xl rounded-bl-none px-4 py-2 text-sm flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-white/5 border-t border-white/10">
        <div className="relative">
            <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Nova to do something..."
                className="w-full bg-black/50 border border-white/10 rounded-full pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button 
                type="submit" 
                disabled={isProcessing || !input.trim()}
                className="absolute right-1 top-1 w-8 h-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-full flex items-center justify-center transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>
      </form>
    </div>
  );
}



