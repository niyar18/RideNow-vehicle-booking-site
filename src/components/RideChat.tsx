"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCheck, Clock, ChevronDown, Sparkles, X } from "lucide-react";
import axios from "axios";
import { getSocket } from "@/lib/socket";

interface Message {
  id: string;
  text: string;
  sender: "user" | "driver";
  createdAt: Date | string;
  status?: "sent" | "delivered" | "read";
}

interface RideChatProps {
  currentRole: "user" | "driver";
  driverName?: string;
  userName?: string;
  rideId: string;
}

const QUICK_REPLIES = ["On my way!", "5 mins away", "At the gate", "Please wait", "Almost there"];

const AI_SUGGESTIONS = [
  "I'm stuck in traffic, will be 10 mins late.",
  "Please share your exact location.",
  "I've arrived at the pickup point.",
  "Can you come to the main gate?",
];

export default function RideChat({
  currentRole,
  rideId,
  driverName = "Driver",
  userName = "Passenger",
}: RideChatProps) {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showAI, setShowAI]           = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    axios
      .post(`/api/chat/get-all`, { rideId })
      .then(res => setMessages(res.data.messages));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on("chat-message", (message: Message) => {
      setMessages(prev => [...prev, message]);
    });
    return () => { socket.off("chat-message"); };
  }, []);

  const sendMessage = async (text: string) => {
    const socket = getSocket();
    if (!text.trim()) return;

    const res = await axios.post("/api/chat/send", {
      rideId,
      text,
      sender: currentRole,
    });

    const message = res.data.message;
    socket.emit("chat-message", message);
   
    setInput("");
    setShowAI(false);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 80);
  };

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const formatTime = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateInput: Date | string) => {
    const date      = new Date(dateInput);
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString())     return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const grouped = messages.reduce((acc, msg) => {
    const d = formatDate(msg.createdAt);
    if (!acc[d]) acc[d] = [];
    acc[d].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const otherName    = currentRole === "user" ? driverName : userName;
  const otherInitial = otherName.charAt(0).toUpperCase();
  const myInitial    = (currentRole === "user" ? userName : driverName).charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full min-h-0 bg-white rounded-2xl overflow-hidden border border-zinc-100">

      {/* ── HEADER ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-100">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center text-white text-xs font-bold">
            {otherInitial}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-900 leading-none">{otherName}</p>
          <p className="text-[11px] text-emerald-500 font-semibold mt-0.5">Active now</p>
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-zinc-50"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Send size={18} className="text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-400 font-medium">No messages yet</p>
            <p className="text-xs text-zinc-300">Start the conversation below</p>
          </div>
        )}

        {Object.entries(grouped).map(([date, dateMessages]) => (
          <div key={date} className="space-y-2">

            {/* Date separator */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-zinc-200" />
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-widest">
                {date}
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>

            {dateMessages.map((msg, idx) => {
              const isMine = msg.sender === currentRole;
              const isLast = idx === dateMessages.length - 1 ||
                dateMessages[idx + 1]?.sender !== msg.sender;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  {/* Their avatar */}
                  {!isMine && (
                    <div className="w-6 flex-shrink-0 self-end mb-0.5">
                      {isLast ? (
                        <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-[9px] font-bold">
                          {otherInitial}
                        </div>
                      ) : <div className="w-6" />}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`max-w-[72%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl shadow-sm ${
                    isMine
                      ? "bg-zinc-950 text-white rounded-br-sm"
                      : "bg-white border border-zinc-200 text-zinc-900 rounded-bl-sm"
                  }`}>
                    <p className="break-words">{msg.text}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMine ? "text-zinc-500" : "text-zinc-400"
                    }`}>
                      <span>{formatTime(msg.createdAt)}</span>
                      {isMine && (
                        <>
                          {msg.status === "sent"      && <Clock size={9} />}
                          {msg.status === "delivered" && <CheckCheck size={10} className="text-zinc-500" />}
                          {msg.status === "read"      && <CheckCheck size={10} className="text-emerald-400" />}
                        </>
                      )}
                    </div>
                  </div>

                  {/* My avatar */}
                  {isMine && (
                    <div className="w-6 flex-shrink-0 self-end mb-0.5">
                      {isLast ? (
                        <div className="w-6 h-6 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-600 text-[9px] font-bold">
                          {myInitial}
                        </div>
                      ) : <div className="w-6" />}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-end gap-2"
            >
              <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                {otherInitial}
              </div>
              <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-3">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="block w-1.5 h-1.5 bg-zinc-400 rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15, ease: "easeInOut" }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />

        {/* Scroll to bottom */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="sticky bottom-2 ml-auto flex items-center justify-center w-7 h-7 bg-zinc-900 text-white rounded-full shadow-lg hover:bg-zinc-800 transition-colors"
            >
              <ChevronDown size={13} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── AI SUGGESTIONS PANEL ── */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 overflow-hidden border-t border-zinc-100 bg-white"
          >
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-violet-500" />
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    AI Suggestions
                  </span>
                </div>
                <button onClick={() => setShowAI(false)}>
                  <X size={14} className="text-zinc-400 hover:text-zinc-600" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {AI_SUGGESTIONS.map(s => (
                  <motion.button
                    key={s}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setInput(s); setShowAI(false); }}
                    className="text-left text-sm text-zinc-700 bg-zinc-50 hover:bg-violet-50 hover:text-violet-700 border border-zinc-100 hover:border-violet-200 px-3 py-2 rounded-xl transition-all"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QUICK REPLIES ── */}
      <div
        className="flex-shrink-0 flex gap-2 px-4 pt-3 pb-2 bg-white border-t border-zinc-100 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {QUICK_REPLIES.map(reply => (
          <button
            key={reply}
            onClick={() => sendMessage(reply)}
            className="flex-shrink-0 text-[11px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 active:scale-95 px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* ── INPUT ── */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-white">
        <div className="flex items-center gap-2 bg-zinc-100 rounded-2xl pl-3 pr-1.5 py-1.5">

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAI(v => !v)}
            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              showAI
                ? "bg-violet-600 text-white"
                : "bg-white text-violet-500 hover:bg-violet-50 border border-zinc-200"
            }`}
          >
            <Sparkles size={14} />
          </motion.button>

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Message…"
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none py-1.5 min-w-0"
          />

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              input.trim()
                ? "bg-zinc-950 text-white hover:bg-zinc-800"
                : "bg-transparent text-zinc-300 cursor-not-allowed"
            }`}
          >
            <Send size={14} />
          </motion.button>
        </div>
      </div>

    </div>
  );
}