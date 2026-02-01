import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { FileText, Tag, Plus, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

interface Content {
  id: string;
  title: string;
  body: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

const Home: React.FC = () => {
  useAuth();
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  
  const [contents, setContents] = useState<Content[]>([]);
  const [contentCount, setContentCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contentRes, statsRes] = await Promise.all([
          api.get("/content?limit=5"), 
          api.get("/stats"),           
        ]);
        
        setContents(contentRes.data.data || []);
        setContentCount(statsRes.data.totalContents || 0);
        setTagCount(statsRes.data.totalTags || 0);
        
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">{date}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          <Link to="/tags" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors active:scale-95">
            <Plus size={16} />
            New Tag
          </Link>
          <Link to="/contents" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 shadow-sm transition-colors active:scale-95">
            <Plus size={16} />
            New Content
          </Link>
        </div>
      </div>

      {/* Info Card - Simplified "Meet Vekku" */}
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-4 md:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-indigo-900">Welcome to Vekku</h3>
            <p className="text-indigo-700/80 mt-1 text-sm leading-relaxed max-w-2xl">
              Your AI-powered knowledge base is ready. Vekku automatically suggests tags and discovers new concepts from your content.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Acting as Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Link 
          to="/contents" 
          className="bg-white p-5 md:p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-indigo-200 hover:ring-2 hover:ring-indigo-50 transition-all group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 group-hover:text-indigo-600 transition-colors">Total Contents</p>
              <p className="text-3xl md:text-4xl font-bold text-zinc-900 mt-2">{isLoading ? "-" : contentCount}</p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <FileText size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-zinc-400 group-hover:text-indigo-600">
            <span>Manage Contents</span>
            <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
        </Link>

        <Link 
          to="/tags" 
          className="bg-white p-5 md:p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-purple-200 hover:ring-2 hover:ring-purple-50 transition-all group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 group-hover:text-purple-600 transition-colors">Total Tags</p>
              <p className="text-3xl md:text-4xl font-bold text-zinc-900 mt-2">{isLoading ? "-" : tagCount}</p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
              <Tag size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-zinc-400 group-hover:text-purple-600">
            <span>Manage Tags</span>
            <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <h3 className="font-semibold text-zinc-900">Recent Content</h3>
          <Link to="/contents" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 p-1 -mr-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Loading recent activity...</div>
        ) : contents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <FileText size={20} />
            </div>
            <h3 className="text-zinc-900 font-medium mb-1">No content yet</h3>
            <p className="text-zinc-500 text-sm mb-4">Create your first content piece to get started.</p>
            <Link to="/contents" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Create Content &rarr;
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {contents.map((content) => (
              <Link 
                key={content.id} 
                to={`/content/${content.id}`}
                className="block hover:bg-zinc-50 transition-colors group"
              >
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 group-hover:text-indigo-600 transition-colors truncate pr-4">
                        {content.title || "Untitled Content"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(content.updatedAt || content.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-md text-xs font-medium border border-zinc-200">
                    {content.contentType}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;