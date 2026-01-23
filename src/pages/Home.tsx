import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { FileText, Tag, Plus, ArrowUpRight, Github, Mail, Sparkles, BrainCircuit } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

interface Content {
  id: string;
  title: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

interface Config {
  githubUrl: string;
  gmailUrl: string;
}

const Home: React.FC = () => {
  useAuth();
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  
  const [contents, setContents] = useState<Content[]>([]);
  const [contentCount, setContentCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<Config>({ githubUrl: "#", gmailUrl: "#" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contentRes, statsRes, configRes] = await Promise.all([
          api.get("/content?limit=5"), 
          api.get("/stats"),           
          api.get("/config").catch(() => ({ data: { githubUrl: "https://github.com", gmailUrl: "mailto:admin@example.com" } }))
        ]);
        
        setContents(contentRes.data.data || []);
        setContentCount(statsRes.data.totalContents || 0);
        setTagCount(statsRes.data.totalTags || 0);
        setConfig(configRes.data);
        
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { label: "Total Contents", value: isLoading ? "-" : contentCount, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Tags", value: isLoading ? "-" : tagCount, icon: Tag, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Introduction Hero Section */}
      <section className="relative overflow-hidden glass-dark rounded-[2rem] p-8 md:p-12 text-white shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 p-8 opacity-5 hidden md:block">
          <BrainCircuit size={160} />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium mb-8">
            <Sparkles size={14} className="text-yellow-400" />
            AI-Powered Knowledge Base
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
            Meet Vekku.
          </h1>
          
          <p className="text-zinc-300 text-lg md:text-xl leading-relaxed mb-10 font-medium">
            The intelligent workspace where you organize content with precision. 
            Vekku uses <span className="text-white font-semibold">AI to automatically suggest tags</span> and 
            discover <span className="text-white font-semibold">new potential concepts</span> directly from your writing.
          </p>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 pt-6 border-t border-white/10">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold mb-3">Created by</p>
              <p className="text-sm font-semibold tracking-wide">
                Kuchuk Borom Debbarma
              </p>
            </div>
            
            <div className="flex items-center gap-5">
              <a 
                href={config.githubUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-3 bg-white/5 hover:bg-white/20 rounded-2xl transition-all duration-300 border border-white/10 shadow-lg"
                title="GitHub Profile"
              >
                <Github size={20} />
              </a>
              <a 
                href={config.gmailUrl} 
                className="p-3 bg-white/5 hover:bg-white/20 rounded-2xl transition-all duration-300 border border-white/10 shadow-lg"
                title="Send Email"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Dashboard */}
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 drop-shadow-sm">Your Base</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">{date}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/tags" className="flex items-center gap-2 glass px-5 py-2.5 rounded-2xl text-zinc-900 hover:bg-white/80 transition-all text-sm font-bold shadow-md">
              <Plus size={18} />
              New Tag
            </Link>
            <Link to="/contents" className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-2xl hover:bg-zinc-900 transition-all text-sm font-bold shadow-lg">
              <Plus size={18} />
              New Content
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card p-8 rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                  <stat.icon size={24} />
                </div>
              </div>
              <p className="text-5xl font-black text-zinc-900 tracking-tighter">{stat.value}</p>
              <p className="text-xs font-bold text-zinc-600 uppercase tracking-[0.2em] mt-3 opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className="glass rounded-[2rem] border border-white/30 shadow-xl overflow-hidden mb-12">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/40">
            <h3 className="font-bold text-zinc-900 text-lg">Recent Content</h3>
            <Link to="/contents" className="text-xs text-indigo-700 hover:text-indigo-900 font-black uppercase tracking-widest flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full transition-all hover:bg-white/80">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="p-16 text-center text-zinc-600 font-medium">Synchronizing knowledge...</div>
          ) : contents.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-white/40 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-500 shadow-inner">
                <FileText size={32} />
              </div>
              <h3 className="text-zinc-900 text-xl font-bold mb-3">Your base is ready</h3>
              <p className="text-zinc-600 text-sm mb-8 max-w-xs mx-auto leading-relaxed">The AI is waiting to process your first entry. Start organizing today.</p>
              <Link to="/contents" className="inline-flex items-center gap-3 bg-black text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-zinc-900 shadow-xl transition-all">
                Create First Content
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {contents.map((content) => (
                <div key={content.id} className="px-8 py-6 flex items-center justify-between hover:bg-white/50 transition-all duration-300 group cursor-pointer">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center text-indigo-700 border border-white/50 shadow-sm">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-zinc-900 group-hover:text-indigo-800 transition-colors">
                        {content.title || "Untitled Content"}
                      </p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1 opacity-70">
                        {new Date(content.updatedAt || content.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1.5 glass text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      {content.contentType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;