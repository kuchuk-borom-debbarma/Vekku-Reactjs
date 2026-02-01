import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  ArrowLeft, 
  Calendar, 
  Tag as TagIcon, 
  Sparkles, 
  Settings2, 
  Youtube, 
  ExternalLink,
  Trash2,
  Check,
  Plus,
  RotateCw,
  Loader2
} from "lucide-react";

import api from "@/lib/api";
import EditContentModal from "@/components/EditContentModal";
import TagSelector from "@/components/TagSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// --- Types ---
interface Content {
  id: string;
  title: string;
  body: string;
  contentType: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface TagItem {
  id: string; // UserTag ID
  name: string;
  linkId?: string; // ContentTag ID
}

interface SuggestionItem {
  id?: string; // Tag ID if existing
  name: string; // Tag Name or Keyword
  score: number;
  type: "EXISTING" | "KEYWORD";
  variants?: string[];
}

// --- Components ---

const ContentHeader: React.FC<{ content: Content; onUpdate: () => void }> = ({ content, onUpdate }) => {
  const navigate = useNavigate();
  const handleDelete = async () => {
    if (!confirm("Delete this content?")) return;
    try {
      await api.delete(`/content/${content.id}`);
      navigate("/contents");
    } catch (e) {
      console.error(e);
      alert("Failed to delete content");
    }
  };

  return (
    <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 mb-6">
      <Link to="/contents" className="text-zinc-500 hover:text-zinc-900 text-sm font-medium flex items-center gap-1 w-fit">
        <ArrowLeft size={16} />
        Back to Contents
      </Link>
      
      <div className="flex items-start justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-zinc-900 leading-tight">{content.title}</h1>
           <div className="flex items-center gap-3 mt-2 text-zinc-500 text-sm">
             <span className="flex items-center gap-1.5 bg-zinc-100 px-2 py-0.5 rounded text-xs font-medium text-zinc-700">
               {content.contentType}
             </span>
             <span className="flex items-center gap-1">
               <Calendar size={14} />
               {new Date(content.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
             </span>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
           <EditContentModal content={content} onContentUpdated={onUpdate} />
           <button onClick={handleDelete} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
             <Trash2 size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

const ContentBody: React.FC<{ content: Content }> = ({ content }) => {
  if (content.contentType === "YOUTUBE_VIDEO") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-zinc-50 border border-zinc-100 rounded-xl group transition-all hover:bg-red-50/30 hover:border-red-100">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 group-hover:scale-110 transition-transform">
            <Youtube size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-0.5">YouTube Link</p>
            <a 
              href={content.metadata?.youtubeUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 break-all flex items-center gap-1.5"
            >
              {content.metadata?.youtubeUrl}
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {content.metadata?.userDescription && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Description</p>
            <div className="text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap font-sans bg-zinc-50/50 p-4 rounded-xl border border-zinc-100/50">
              {content.metadata.userDescription}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (content.contentType === "MARKDOWN") {
    return (
      <div className="prose prose-zinc max-w-none prose-sm sm:prose-base leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.body}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap text-zinc-800 text-base leading-relaxed font-sans">
      {content.body}
    </div>
  );
};

const TagsSection: React.FC<{ contentId: string }> = ({ contentId }) => {
  const queryClient = useQueryClient();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: activeTags = [], isLoading } = useQuery({
    queryKey: ["content-tags", contentId],
    queryFn: async () => {
      const res = await api.get(`/content/${contentId}/tags`);
      return (res.data.data || []).map((t: any) => ({
        id: t.tagId,
        name: t.name,
        linkId: t.id
      })) as TagItem[];
    },
  });

  const removeTag = async (tagId: string) => {
    try {
      await api.delete(`/content/${contentId}/tags`, { data: { tagIds: [tagId] } });
      queryClient.setQueryData(["content-tags", contentId], (old: TagItem[] = []) => 
        old.filter(t => t.id !== tagId)
      );
    } catch (e) {
      console.error(e);
      alert("Failed to remove tag");
    }
  };

  const handleManageOpen = () => {
    setSelectedTagIds(activeTags.map(t => t.id));
    setIsManageOpen(true);
  };

  const handleSaveManaged = async () => {
    setIsSaving(true);
    try {
      const currentIds = activeTags.map(t => t.id);
      const toAdd = selectedTagIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedTagIds.includes(id));

      const promises = [];
      if (toAdd.length > 0) promises.push(api.post(`/content/${contentId}/tags`, { tagIds: toAdd }));
      if (toRemove.length > 0) promises.push(api.delete(`/content/${contentId}/tags`, { data: { tagIds: toRemove } }));

      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ["content-tags", contentId] });
      setIsManageOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to update tags");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
          <TagIcon size={18} />
          Active Tags
        </h3>
        <button onClick={handleManageOpen} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 rounded transition-colors">
          <Settings2 size={14} />
          Manage
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading tags...
          </div>
        ) : activeTags.length === 0 ? (
          <span className="text-sm text-zinc-400 italic">No tags attached.</span>
        ) : (
          activeTags.map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-sm font-medium border border-zinc-200">
              {tag.name}
              <button onClick={() => removeTag(tag.id)} className="p-0.5 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600">
                <Trash2 size={12} />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Manage Modal */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
             <TagSelector 
               selectedTagIds={selectedTagIds} 
               onToggleTag={(id) => setSelectedTagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} 
             />
          </div>
          <DialogFooter>
            <button onClick={() => setIsManageOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded">Cancel</button>
            <button onClick={handleSaveManaged} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-black rounded hover:bg-zinc-800 disabled:opacity-50">
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SuggestionsSection: React.FC<{ contentId: string }> = ({ contentId }) => {
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Separate loading states for actions
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  useEffect(() => {
    if (contentId) {
       fetchSuggestions();
    }
  }, [contentId]);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/suggestions/content/${contentId}`);
      const { existing = [], potential = [] } = res.data;
      const newItems: SuggestionItem[] = [
        ...existing.map((s: any) => ({ ...s, id: s.tagId, type: "EXISTING" })),
        ...potential.map((p: any) => ({ ...p, name: p.keyword, type: "KEYWORD" }))
      ];
      setSuggestions(newItems);
    } catch (e: any) {
      console.error(e);
      setError("Failed to load suggestions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const res = await api.post(`/suggestions/content/${contentId}/regenerate`);
      const { existing = [], potential = [] } = res.data;
      const newItems: SuggestionItem[] = [
        ...existing.map((s: any) => ({ ...s, id: s.tagId, type: "EXISTING" })),
        ...potential.map((p: any) => ({ ...p, name: p.keyword, type: "KEYWORD" }))
      ];
      setSuggestions(newItems);
    } catch (e: any) {
      console.error(e);
      setError(e.response?.status === 429 ? "Rate limit exceeded." : "Failed to regenerate.");
    } finally {
       setIsRegenerating(false);
    }
  };

  const handleAddSelected = async () => {
    setIsAdding(true);
    try {
      const promises = [];
      if (selectedIds.length > 0) {
        promises.push(api.post(`/content/${contentId}/tags`, { tagIds: selectedIds }));
      }
      if (selectedKeywords.length > 0) {
        // Create tags for keywords first
        const newTagsRes = await api.post("/tag", { 
            tags: selectedKeywords.map(k => ({ name: k, semantic: k })) 
        });
        const newTagIds = newTagsRes.data.map((t: any) => t.id);
        promises.push(api.post(`/content/${contentId}/tags`, { tagIds: newTagIds }));
      }
      await Promise.all(promises);
      
      await queryClient.invalidateQueries({ queryKey: ["content-tags", contentId] });
      
      setSuggestions(prev => prev.filter(s => 
        (s.type === "EXISTING" && !selectedIds.includes(s.id!)) ||
        (s.type === "KEYWORD" && !selectedKeywords.includes(s.name))
      ));
      setSelectedIds([]);
      setSelectedKeywords([]);

    } catch (e) {
      console.error(e);
      alert("Failed to add suggestions");
    } finally {
      setIsAdding(false);
    }
  };

  const existingSuggestions = suggestions.filter(s => s.type === "EXISTING");
  const keywordSuggestions = suggestions.filter(s => s.type === "KEYWORD");

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
          <Sparkles size={18} className="text-purple-500" />
          AI Suggestions
        </h3>
        <button 
          onClick={handleRegenerate} 
          disabled={isRegenerating || isLoading} 
          className="text-xs flex items-center gap-1.5 text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-md transition-colors disabled:opacity-50"
        >
          <RotateCw size={14} className={isRegenerating ? "animate-spin" : ""} />
          Regenerate
        </button>
      </div>

      {isLoading && suggestions.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-zinc-400 text-xs gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading suggestions...
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-6">
           {(selectedIds.length > 0 || selectedKeywords.length > 0) && (
             <button 
               onClick={handleAddSelected} 
               disabled={isAdding}
               className="w-full py-2 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-zinc-800 disabled:opacity-50 mb-2"
             >
               {isAdding ? "Adding..." : `Add Selected (${selectedIds.length + selectedKeywords.length})`}
             </button>
           )}

           {existingSuggestions.length > 0 && (
             <div>
               <p className="text-[10px] uppercase font-bold text-indigo-400 mb-2">Existing Tags</p>
               <div className="flex flex-wrap gap-2">
                 {existingSuggestions.map(s => {
                   const isSelected = selectedIds.includes(s.id!);
                   return (
                     <button
                       key={s.id}
                       onClick={() => setSelectedIds(prev => isSelected ? prev.filter(x => x !== s.id) : [...prev, s.id!])}
                       className={`relative px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                         isSelected 
                           ? "bg-indigo-600 text-white border-indigo-600" 
                           : "bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400"
                       }`}
                     >
                       <div className="flex items-center gap-1.5">
                          {isSelected && <Check size={12} />}
                          {s.name}
                       </div>
                       <div 
                         className="absolute bottom-0 left-0 h-0.5 bg-indigo-400/30 transition-all rounded-full" 
                         style={{ width: `${s.score * 100}%` }}
                       />
                     </button>
                   );
                 })}
               </div>
             </div>
           )}

           {keywordSuggestions.length > 0 && (
             <div>
               <p className="text-[10px] uppercase font-bold text-purple-400 mb-2">New Concepts</p>
               <div className="flex flex-col gap-2">
                 {keywordSuggestions.map(s => {
                   const isSelected = selectedKeywords.includes(s.name);
                   return (
                     <div 
                       key={s.name} 
                       onClick={() => setSelectedKeywords(prev => isSelected ? prev.filter(x => x !== s.name) : [...prev, s.name])}
                       className={`cursor-pointer p-3 rounded-lg border transition-all group ${
                         isSelected ? "bg-purple-50 border-purple-400 ring-1 ring-purple-400" : "bg-white border-zinc-100 hover:border-purple-200"
                       }`}
                     >
                       <div className="flex items-center justify-between">
                         <span className={`text-xs font-semibold ${isSelected ? "text-purple-900" : "text-zinc-700"}`}>{s.name}</span>
                         {isSelected ? <Check size={14} className="text-purple-600" /> : <Plus size={14} className="text-zinc-300 group-hover:text-purple-400" />}
                       </div>
                       
                       <div className="w-full h-1 bg-zinc-100 rounded-full mt-2 overflow-hidden">
                         <div className="h-full bg-purple-400" style={{ width: `${s.score * 100}%` }} />
                       </div>

                       {s.variants && s.variants.length > 0 && (
                         <div className="flex flex-wrap gap-1 mt-2">
                           {s.variants.map(v => (
                             <span key={v} className="text-[9px] bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-500">
                               {v}
                             </span>
                           ))}
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             </div>
           )}
        </div>
      ) : !error && (
        <div className="text-center py-8 text-zinc-400 text-xs italic">
          No suggestions found.
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
          {error}
        </div>
      )}
    </div>
  );
};


// --- Main Page Component ---

const ContentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: content, isLoading, error } = useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const res = await api.get(`/content/${id}`);
      return res.data as Content;
    },
    enabled: !!id
  });

  const queryClient = useQueryClient();
  const handleContentUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["content", id] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-zinc-500 text-sm gap-2">
        <Loader2 className="animate-spin" /> Loading content...
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
          <Trash2 size={24} />
        </div>
        <h2 className="text-lg font-bold text-zinc-900">Content not found</h2>
        <p className="text-zinc-500 text-sm mt-1 mb-6">The content you are looking for does not exist or has been deleted.</p>
        <Link to="/contents" className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-zinc-800">
          Back to Contents
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <ContentHeader content={content} onUpdate={handleContentUpdate} />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        <div className="min-w-0">
          <ContentBody content={content} />
        </div>

        <div className="space-y-6">
          <TagsSection contentId={content.id} />
          <SuggestionsSection contentId={content.id} />
        </div>
      </div>
    </div>
  );
};

export default ContentDetail;