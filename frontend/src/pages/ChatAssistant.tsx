import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  BookOpen, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Loader2,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { ChatMessage, MemoryCitation, AgentStepEvent } from '../types';

interface ChatAssistantProps {
  initialQuery?: string;
  onClearInitialQuery?: () => void;
  onNavigateToMemory?: (memId: string) => void;
}

const SUGGESTED_QUESTIONS = [
  "What did Sarah and I agree on regarding latency?",
  "What pending action items were extracted from my syncs?",
  "Who is responsible for the revised pricing deck?",
  "What was decided about the Q4 beta launch date?"
];

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ initialQuery, onClearInitialQuery }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: "Hello! I am your **EchoVault Memory Assistant**.\n\nI answer your questions using semantic vector search in Qdrant Cloud and reasoning from your Lyzr Memory Assistant Agent. Ask me anything about previous voice conversations, decisions, or commitments.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle incoming query passed from dashboard
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSend(initialQuery.trim());
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  const handleSend = async (questionText?: string, retryMessageId?: string) => {
    const textToSend = questionText || input.trim();
    if (!textToSend || isLoading) return;

    if (!retryMessageId) {
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: textToSend,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      if (!questionText) setInput('');
    } else {
      // Retrying: remove prior error message
      setMessages(prev => prev.filter(m => m.id !== retryMessageId));
    }

    setIsLoading(true);

    try {
      const response = await api.sendChatMessage(textToSend);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        citations: response.citations,
        steps: response.execution?.steps,
        correlation_id: response.correlation_id,
        execution_id: response.execution?.execution_id
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      let errorText = err?.message || 'EchoVault could not reach the backend. Check that the server is running.';
      
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        error: errorText,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto p-4 md:p-6">
      {/* Suggested Quick Prompts Bar */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Suggested queries from your memory index
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-indigo-300 transition-all shrink-0 whitespace-nowrap text-left shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isTraceOpen = expandedTraceId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-2xl space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                {msg.content && (
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.content}</div>
                  </div>
                )}

                {/* Inline Error State with Retry Button */}
                {msg.error && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-900">Request Failed</div>
                        <p className="text-[11px] text-rose-700 mt-0.5">{msg.error}</p>
                      </div>
                    </div>
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => {
                          const lastUser = [...messages].reverse().find(m => m.role === 'user');
                          if (lastUser) handleSend(lastUser.content, msg.id);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry Query</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Citations Card if present */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-semibold">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <BookOpen className="w-3.5 h-3.5" />
                        Memory Citations ({msg.citations.length})
                      </span>
                      {msg.correlation_id && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {msg.correlation_id}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {msg.citations.map((c, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-1 hover:border-indigo-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{c.title || 'Conversation'}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-semibold border border-emerald-200">
                              Similarity: {(c.similarity_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] italic">"{c.excerpt}"</p>
                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : ''}
                            </span>
                            <span className="uppercase text-[9px] font-bold text-slate-500">
                              Source: {c.source}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multi-Agent Execution Steps Trace */}
                {msg.steps && msg.steps.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                    <button
                      onClick={() => setExpandedTraceId(isTraceOpen ? null : msg.id)}
                      className="w-full px-3 py-2 flex items-center justify-between text-slate-600 hover:text-slate-900 bg-slate-50/70"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                        Agent Execution Trace ({msg.steps.length} steps)
                      </span>
                      {isTraceOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isTraceOpen && (
                      <div className="p-3 space-y-2 border-t border-slate-100">
                        {msg.steps.map((st, idx) => (
                          <div key={idx} className="flex items-start justify-between text-[11px] gap-2 p-1.5 rounded bg-slate-50">
                            <div>
                              <strong className="text-slate-800">{st.agent_name}</strong>
                              <span className="text-slate-500 ml-1">({st.role})</span>
                              {st.output_preview && (
                                <p className="text-slate-600 text-[10px] mt-0.5">{st.output_preview}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {st.duration_ms !== undefined && (
                                <span className="text-emerald-700 font-mono font-semibold">{st.duration_ms}ms</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs shrink-0">
                  AR
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 rounded-bl-none flex items-center gap-3 shadow-2xs">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span>Querying Qdrant Cloud vectors and reasoning via Memory Assistant Agent...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-4 pt-3 border-t border-slate-200"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask about previous meetings, decisions, deadlines, or topics..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-slate-400">
          <span>Qdrant Cloud RAG with Lyzr Reasoning</span>
          <span>Press Enter to send</span>
        </div>
      </form>
    </div>
  );
};
