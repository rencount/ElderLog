import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft, Pill, Check, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Medication {
  id: string;
  name: string;
  time: string;
  taken: boolean;
}

export default function Chat() {
  const [messages, setMessages] = useState<{role: 'system'|'user', text: string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [showMeds, setShowMeds] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchMeds = async () => {
    const userId = localStorage.getItem("elderUserId");
    if (!userId) return;
    try {
      const res = await fetch(`/api/meds?userId=${userId}`);
      const data = await res.json();
      setMeds(data);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMeds();
    const interval = setInterval(fetchMeds, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userId = localStorage.getItem("elderUserId") || "dummy";
    const userMessage = input;
    
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      // We must call Gemini API from the frontend in AI Studio
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: "You are a warm, caring relative talking to your grandparent. Respond warmly to their message. Keep your reply under 30 words. You MUST reply in Simplified Chinese.",
          responseMimeType: "application/json",
          responseSchema: {
            type: "object" as any,
            properties: {
              reply: { type: "string" as any },
              extracted_data: {
                type: "object" as any,
                properties: {
                  medication: { type: "boolean" as any, description: "Whether they mentioned taking medication or not" },
                  mood: { type: "string" as any, description: "Enum ('good', 'neutral', 'bad')", enum: ["good", "neutral", "bad"] },
                  symptom: { type: "string" as any, description: "Any physical symptoms mentioned (e.g. 'headache'), empty string if none" },
                }
              }
            },
            required: ["reply", "extracted_data"]
          }
        }
      });
      
      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);

      if (parsed.reply) {
        setMessages(prev => [...prev, { role: "system", text: parsed.reply }]);
        
        // Save to backend SQLite
        await fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            userId, 
            message: userMessage, 
            reply: parsed.reply,
            medication_taken: parsed.extracted_data?.medication ?? null,
            mood: parsed.extracted_data?.mood || 'neutral',
            symptoms: parsed.extracted_data?.symptom || null
          })
        });
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "system", text: "抱歉，出了一点小问题，请稍后再试。" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeMed = async (id: string) => {
    const userId = localStorage.getItem("elderUserId");
    if (!userId) return;
    try {
      await fetch('/api/meds/take', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, scheduleId: id })
      });
      fetchMeds();
      setShowMeds(false);
      setMessages(prev => [...prev, { role: "system", text: "好的，我已经帮您记录吃过药了，真棒！" }]);
    } catch (e) {
      console.error(e);
    }
  }

  // Calculate sorted medical list
  const now = new Date();
  const sortedMeds = [...meds].sort((a, b) => {
    // untaken ones first
    if (a.taken !== b.taken) return a.taken ? 1 : -1;
    // within 2 hours or passed -> urgent
    const timeA = new Date();
    const [hA, mA] = a.time.split(':');
    timeA.setHours(parseInt(hA), parseInt(mA), 0, 0);
    const timeB = new Date();
    const [hB, mB] = b.time.split(':');
    timeB.setHours(parseInt(hB), parseInt(mB), 0, 0);
    
    return timeA.getTime() - timeB.getTime();
  });

  const getUrgentMed = () => {
    return sortedMeds.find(m => {
      if (m.taken) return false;
      const targetTime = new Date();
      const [hA, mA] = m.time.split(':');
      targetTime.setHours(parseInt(hA), parseInt(mA), 0, 0);
      const diffMs = targetTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours <= 1; // within 1 hour or already passed
    });
  };

  const urgentMed = getUrgentMed();

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] font-sans text-slate-900">
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm z-10">
        <Link to="/">
          <Button variant="ghost" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-lg">返回首页</span>
          </Button>
        </Link>
        <span className="text-xl font-bold tracking-tight text-slate-800 pr-4">老人端</span>
      </div>

      {/* Med Reminder Banner */}
      <div className="px-4 py-3 sm:px-8 shrink-0">
        <div 
          onClick={() => setShowMeds(!showMeds)}
          className={`rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-sm transition-all border-2 ${urgentMed ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${urgentMed ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              <Pill className="w-8 h-8" />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${urgentMed ? 'text-red-700' : 'text-blue-700'}`}>今日服药提醒</h3>
              <p className={`text-md ${urgentMed ? 'text-red-500' : 'text-blue-500'}`}>
                {urgentMed ? `⚠️ 该吃 ${urgentMed.name} 了 (${urgentMed.time})` : `您今天有 ${meds.length} 项服药计划，点击查看`}
              </p>
            </div>
          </div>
          <Button variant="ghost" className={`font-bold text-lg ${urgentMed ? 'text-red-600 hover:bg-red-100' : 'text-blue-600 hover:bg-blue-100'}`}>
            {showMeds ? '收起' : '查看'}
          </Button>
        </div>

        {/* Med List Expandable */}
        {showMeds && (
          <div className="mt-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-4 space-y-3 animation-in fade-in slide-in-from-top-2">
            {sortedMeds.length === 0 ? (
               <p className="text-slate-500 text-center py-4 text-lg">今天没有需要服用的药物，太好啦！</p>
            ) : sortedMeds.map(m => {
              const targetTime = new Date();
              const [hA, mA] = m.time.split(':');
              targetTime.setHours(parseInt(hA), parseInt(mA), 0, 0);
              const diffMs = targetTime.getTime() - now.getTime();
              const diffHours = diffMs / (1000 * 60 * 60);
              const isUrgent = !m.taken && diffHours <= 1;

              return (
                <div key={m.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isUrgent ? 'border-red-200 bg-red-50' : m.taken ? 'bg-slate-50 border-slate-100' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-slate-700 w-16 text-center">{m.time}</span>
                    <div>
                      <h4 className={`text-xl font-bold ${m.taken ? 'text-slate-500 line-through' : isUrgent ? 'text-red-700' : 'text-slate-800'}`}>{m.name}</h4>
                      {isUrgent && <span className="text-red-500 text-sm font-bold flex items-center gap-1 mt-1"><Clock className="w-4 h-4"/> 快到时间了</span>}
                    </div>
                  </div>
                  {m.taken ? (
                    <div className="flex items-center gap-2 text-green-600 font-bold bg-green-100 px-4 py-2 rounded-xl">
                      <Check className="w-6 h-6" />
                      已服
                    </div>
                  ) : (
                    <Button onClick={() => handleTakeMed(m.id)} className={`text-lg px-6 py-6 rounded-xl font-bold ${isUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                      我已吃过
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center px-4">
            <h2 className="text-3xl text-slate-700 font-medium leading-relaxed">
              今天感觉怎么样？<br/>有什么开心事，或者哪里不舒服，都可以和我说说。
            </h2>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`
              max-w-[85%] p-5 text-2xl sm:text-3xl leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-3xl rounded-tr-none shadow-md font-medium' 
                : 'bg-slate-100 text-slate-700 rounded-3xl rounded-tl-none font-medium'}
            `}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-slate-100 text-slate-400 rounded-3xl rounded-tl-none p-5 text-xl font-medium sm:text-3xl italic">
                正在思考...
             </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100">
        <div className="flex gap-4 max-w-4xl mx-auto items-center">
          <input 
            type="text" 
            className="flex-1 text-2xl sm:text-3xl p-6 rounded-2xl bg-white border-2 border-slate-200 focus:ring-2 focus:ring-blue-600 outline-none placeholder:text-slate-400 text-slate-700"
            placeholder="点击这里说话或打字..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <Button 
            className="w-24 sm:w-32 h-auto py-6 text-xl rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center shrink-0 shadow-lg transition-colors" 
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            <Send className="w-8 h-8" />
          </Button>
        </div>
      </div>
    </div>
  );
}
