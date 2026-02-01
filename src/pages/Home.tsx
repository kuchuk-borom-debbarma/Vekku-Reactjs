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

  const stats = [
    { label: "Total Contents", value: isLoading ? "-" : contentCount, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Tags", value: isLoading ? "-" : tagCount, icon: Tag, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 mt-1">{date}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/tags" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors">
            <Plus size={16} />
            New Tag
          </Link>
          <Link to="/contents" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 shadow-sm transition-colors">
            <Plus size={16} />
            New Content
          </Link>
        </div>
      </div>

      {/* Info Card - Simplified "Meet Vekku" */}
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-900">Welcome to Vekku</h3>
            <p className="text-indigo-700/80 mt-1 text-sm leading-relaxed max-w-2xl">
              Your AI-powered knowledge base is ready. Vekku automatically suggests tags and discovers new concepts from your content.
              Start by adding some content to see the magic happen.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                <p className="text-3xl font-bold text-zinc-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900">Recent Content</h3>
          <Link to="/contents" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
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
              <div key={content.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <FileText size={18} />
                  </div>
                  <div>
                    <Link 
                      to={`/content/${content.id}`}
                      className="font-medium text-zinc-900 group-hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {content.title || "Untitled Content"}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(content.updatedAt || content.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-md text-xs font-medium border border-zinc-200">
                  {content.contentType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;