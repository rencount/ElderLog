import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const initUser = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/init");
      const data = await res.json();
      if (data.success && data.elder) {
        localStorage.setItem("elderUserId", data.elder.id);
      }
      navigate('/chat');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F8F9FA] text-slate-900 font-sans">
      <h1 className="text-4xl text-slate-800 mb-8 font-bold tracking-tight">岁语 (ElderLog)</h1>
      <p className="text-slate-600 mb-8 max-w-sm text-center">
        连接长辈与子女的温情纽带。
      </p>
      <div className="flex flex-col gap-4">
        <Button size="lg" onClick={initUser} disabled={loading} className="w-48 bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-2xl shadow-lg transition-colors">
          进入老人端 (Chat)
        </Button>
        <Link to="/dashboard">
          <Button variant="outline" size="lg" className="w-48 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-2xl transition-colors">
            进入子女端 (Dashboard)
          </Button>
        </Link>
      </div>
    </div>
  );
}
