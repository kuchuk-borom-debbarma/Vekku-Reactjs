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
        // Parallel fetching
        const [contentRes, statsRes, configRes] = await Promise.all([
          api.get("/content?limit=5"), // Get recent 5
          api.get("/stats"),           // Get total counts
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
      <section className="relative overflow-hidden bg-black rounded-3xl p-8 md:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 animate-pulse">
          <BrainCircuit size={120} />
        </div>
        
        <div className="relative z-10 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium mb-6 backdrop-blur-sm">
            <Sparkles size={14} className="text-yellow-400" />
            AI-Powered Knowledge Base
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Meet Vekku.
          </h1>
          
          <p className="text-zinc-300 text-lg leading-relaxed mb-8">
            The intelligent workspace where you organize content with precision. 
            Vekku uses <span className="text-white font-medium">AI to automatically suggest existing tags</span> and 
            discover <span className="text-white font-medium">new potential concepts</span> directly from your writing, 
            transforming raw data into a structured semantic web.
          </p>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4 border-t border-white/10">
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-2">Architected & Created by</p>
              <p className="text-sm font-semibold flex items-center gap-2">
                Kuchuk Borom Debbarma
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <a 
                href={config.githubUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
                title="GitHub Profile"
              >
                <Github size={18} />
              </a>
              <a 
                href={config.gmailUrl} 
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
                title="Send Email"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Dashboard */}
      <div className="space-y-8 animate-in fade-in duration-1000 delay-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Your Overview</h2>
            <p className="text-zinc-500 text-sm mt-1">{date}</p>
          </div>
          <div className="hidden sm:flex gap-3">
            <Link to="/tags" className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-900 px-4 py-2 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm">
              <Plus size={16} />
              New Tag
            </Link>
            <Link to="/contents" className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium shadow-md">
              <Plus size={16} />
              New Content
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon size={24} />
                </div>
              </div>
              <p className="text-4xl font-bold text-zinc-900 tracking-tight">{stat.value}</p>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-2">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
            <h3 className="font-bold text-zinc-900">Recent Content</h3>
            <Link to="/contents" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center text-zinc-400 animate-pulse">Loading contents...</div>
          ) : contents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                <FileText size={24} />
              </div>
              <h3 className="text-zinc-900 font-bold mb-2">Your base is empty</h3>
              <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">Start capturing your thoughts and let the AI help you categorize them.</p>
              <Link to="/contents" className="inline-flex items-center gap-2 bg-black text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-zinc-800 transition-all">
                Create First Content
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {contents.map((content) => (
                <div key={content.id} className="px-6 py-5 flex items-center justify-between hover:bg-zinc-50/80 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                        {content.title || "Untitled Content"}
                      </p>
                      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
                        {new Date(content.updatedAt || content.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-zinc-200">
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
