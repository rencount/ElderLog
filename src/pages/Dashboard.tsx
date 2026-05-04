import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: string;
  text: string;
  reply: string;
  medication_taken: boolean | null;
  mood: string | null;
  symptoms: string | null;
  createdAt: string;
}

interface Medication {
  id: string;
  name: string;
  time: string;
  taken: boolean;
}

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(res => res.json()),
      fetch("/api/dashboard/meds").then(res => res.json())
    ]).then(([logsData, medsData]) => {
      setLogs(logsData);
      setMeds(medsData);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-8 text-center bg-[#F8F9FA] text-slate-500 font-sans min-h-screen">加载中...</div>;
  }

  const totalMeds = meds.length;
  const takenMeds = meds.filter(m => m.taken).length;
  let medicationStatus = "未知";
  if (totalMeds > 0) {
    if (takenMeds === totalMeds) medicationStatus = "已全服";
    else if (takenMeds > 0) medicationStatus = `部分已服 (${takenMeds}/${totalMeds})`;
    else medicationStatus = "全部未服";
  }

  // Last 3 days mood
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const recentLogs = logs.filter(l => new Date(l.createdAt) >= threeDaysAgo);
  const moodCounts = { good: 0, neutral: 0, bad: 0 };
  recentLogs.forEach(l => {
    if (l.mood === 'good') moodCounts.good++;
    if (l.mood === 'neutral') moodCounts.neutral++;
    if (l.mood === 'bad') moodCounts.bad++;
  });
  
  let dominantMood = "neutral";
  if (Object.keys(moodCounts).length > 0 && Math.max(...Object.values(moodCounts)) > 0) {
    dominantMood = Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0][0];
  }

  const moodTranslations: Record<string, string> = { good: "开心", neutral: "平稳", bad: "低落" };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-8 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">长辈关怀看板 (Dashboard)</h1>
          <Link to="/">
            <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">返回首页</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-blue-50 border-blue-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-blue-600 uppercase tracking-widest">今日系统计划服药状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-3 text-slate-900 mb-2">
                <div className={`w-3 h-3 rounded-full ${takenMeds === totalMeds ? 'bg-green-500' : takenMeds > 0 ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                {medicationStatus}
              </div>
              {meds.length > 0 && (
                <div className="flex flex-col gap-1 mt-3">
                  {meds.map(m => (
                    <div key={m.id} className="flex justify-between text-sm">
                      <span className="text-slate-600">{m.name} ({m.time})</span>
                      <span className={`font-bold ${m.taken ? 'text-green-600' : 'text-slate-400'}`}>{m.taken ? '已服' : '未服'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-100 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-orange-600 uppercase tracking-widest">近3日综合情绪</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-3 text-slate-900">
                <span>{dominantMood === 'good' ? '😊' : dominantMood === 'neutral' ? '😐' : dominantMood === 'bad' ? '😟' : '❓'}</span>
                <span>{moodTranslations[dominantMood] || "未知"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">最近对话记录</h2>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-1/4">时间</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-1/3">长辈说</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-1/4">提取不适</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-1/6">对话中提服药</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-500 align-top">
                        {new Date(log.createdAt).toLocaleString('zh-CN', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                      </td>
                      <td className="p-4 align-top">
                        <div className="text-slate-700 font-medium mb-1">{log.text}</div>
                        <div className="text-slate-400 text-xs mt-1">AI: {log.reply}</div>
                      </td>
                      <td className="p-4 align-top">
                        {log.symptoms ? (
                          <span className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100 inline-block">
                            {log.symptoms}
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-50 text-slate-400 text-sm font-medium rounded-lg border border-slate-100 inline-block">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm align-top">
                        {log.medication_taken === true && <span className="text-blue-600 font-bold tracking-tight">已服药</span>}
                        {log.medication_taken === false && <span className="text-orange-600 font-bold tracking-tight">没吃药</span>}
                        {log.medication_taken === null && <span className="text-slate-400">-</span>}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">暂无通话记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
