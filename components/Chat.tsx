import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronRight, PanelRightClose, FolderPlus, Trash2, LayoutDashboard, Kanban as KanbanIcon, Rocket, Settings, Plus, Search } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading, isCollapsed, onToggleCollapse }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  if (isCollapsed) return null;

  return (
    <div className="flex flex-col h-full bg-brand-surface border-l border-brand-light w-[350px] shadow-2xl relative">
      {/* Header */}
      <div className="p-4 border-b border-brand-light flex items-center justify-between bg-brand-surface z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-green" size={18} />
          <h3 className="font-bold text-white">Agente SAAD</h3>
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-white transition-colors"
          title="Recolher Chat"
        >
          <PanelRightClose size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-brand-light/40 p-3 rounded-lg border border-brand-light text-sm text-gray-300">
          Olá! Eu sou sua IA de gestão. <br />
          Cole suas Regras de Negócio (RN) e prazos para eu criar o cronograma e o Kanban.
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''
              }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-brand-base text-brand-green border border-brand-green/30' : 'bg-brand-light text-gray-300'
                }`}
            >
              {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user'
                ? 'bg-brand-green text-brand-base font-medium rounded-br-none'
                : 'bg-brand-light/50 border border-brand-light text-gray-200 rounded-bl-none'
                }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span className={`text-[10px] mt-1 block ${msg.role === 'user' ? 'text-brand-base/70' : 'text-gray-500'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-base text-brand-green border border-brand-green/30 flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-brand-light/50 border border-brand-light rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
              <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-brand-surface border-t border-brand-light">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva tarefas ou cole RNs..."
            className="w-full bg-brand-base border border-brand-light text-white rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent text-sm placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 bg-brand-green hover:bg-brand-green-hover text-brand-base font-bold p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;