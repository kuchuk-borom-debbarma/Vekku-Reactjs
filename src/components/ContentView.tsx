import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tag, Sparkles, Plus, X, Settings2, Check, RotateCw, ExternalLink, Youtube } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "@/lib/api";
import TagSelector from "@/components/TagSelector";
import { Progress } from "@/components/ui/progress";

interface ContentViewProps {
  content: {
    id: string;
    title: string;
    body: string;
    contentType: string;
    metadata?: any;
    createdAt: string;
  };
  trigger?: React.ReactNode;
}

interface TagItem {
  id: string;
  name: string;
  score?: number; 
  linkId?: string;
}

interface SuggestionItem {
  type: "EXISTING" | "KEYWORD";
  id?: string;
  name: string;
  score: number;
  variants?: string[];
}

const ContentView: React.FC<ContentViewProps> = ({ content, trigger }) => {
  const [activeTags, setActiveTags] = useState<TagItem[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<SuggestionItem[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Manage Tags Modal State
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Suggestion Selection State
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const [selectedKeywordNames, setSelectedKeywordNames] = useState<string[]>([]);
  const [isAddingSuggestions, setIsAddingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const fetchTagsAndSuggestions = async () => {
    if (!content.id) return;
    setIsLoadingTags(true);
    let isMounted = true;
    try {
      const [tagsRes, suggestionsRes] = await Promise.all([
        api.get(`/content/${content.id}/tags`),
        api.get(`/suggestions/content/${content.id}`),
      ]);
      
      if (!isMounted) return;

      // Map active tags
      const currentTags = (tagsRes.data.data || []).map((t: any) => ({
        id: t.tagId,
        name: t.name,
        linkId: t.id
      }));
      setActiveTags(currentTags);
      
      // Handle structured suggestions response
      const { existing = [], potential = [] } = suggestionsRes.data || {};
      
      setTagSuggestions(existing.map((s: any) => ({ ...s, id: s.tagId, type: "EXISTING" })));
      setKeywordSuggestions(potential.map((p: any) => ({ ...p, name: p.keyword, type: "KEYWORD" })));
      
      // Initialize selected tags for the manager
      setSelectedTagIds(currentTags.map((t: TagItem) => t.id));
    } catch (error: any) {
      if (!isMounted) return;
      console.error("Failed to fetch tags and suggestions:", error);
    } finally {
      if (isMounted) {
        setIsLoadingTags(false);
      }
    }
    return () => { isMounted = false; };
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      fetchTagsAndSuggestions();
      setSelectedSuggestionIds([]);
      setSelectedKeywordNames([]);
    }
  };

  useEffect(() => {
     setSelectedTagIds(activeTags.map(t => t.id));
  }, [activeTags]);

  const removeTag = async (tagId: string) => {
    try {
      await api.delete(`/content/${content.id}/tags`, { data: { tagIds: [tagId] } });
      setActiveTags(activeTags.filter((t) => t.id !== tagId));
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSaveManagedTags = async () => {
    setIsSavingTags(true);
    try {
      const currentIds = activeTags.map(t => t.id);
      const toAdd = selectedTagIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedTagIds.includes(id));

      const promises = [];
      if (toAdd.length > 0) {
        promises.push(api.post(`/content/${content.id}/tags`, { tagIds: toAdd }));
      }
      if (toRemove.length > 0) {
        promises.push(api.delete(`/content/${content.id}/tags`, { data: { tagIds: toRemove } }));
      }

      await Promise.all(promises);
      await fetchTagsAndSuggestions();
      setIsManageTagsOpen(false);
    } catch (error) {
      console.error("Failed to save tags:", error);
      alert("Failed to save changes.");
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    setSelectedKeywordNames(prev => 
      prev.includes(keyword) ? prev.filter(k => k !== keyword) : [...prev, keyword]
    );
  };

  const swapKeywordVariant = (originalName: string, newName: string) => {
    setKeywordSuggestions(prev => prev.map(s => {
      if (s.name === originalName) {
        const newVariants = [originalName, ...(s.variants || [])].filter(v => v !== newName);
        return { ...s, name: newName, variants: newVariants };
      }
      return s;
    }));
    setSelectedKeywordNames(prev => prev.map(k => k === originalName ? newName : k));
  };

  const handleAddSelectedKeywords = async () => {
    if (selectedKeywordNames.length === 0) return;
    setIsAddingSuggestions(true);
    try {
      await api.post(`/content/${content.id}/potential`, { keywords: selectedKeywordNames });
      await fetchTagsAndSuggestions();
      setSelectedKeywordNames([]);
    } catch (error) {
      console.error("Failed to add selected keywords:", error);
    } finally {
      setIsAddingSuggestions(false);
    }
  };

  const toggleSuggestion = (tagId: string) => {
    setSelectedSuggestionIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAddSelectedSuggestions = async () => {
    if (selectedSuggestionIds.length === 0) return;
    setIsAddingSuggestions(true);
    try {
      await api.post(`/content/${content.id}/tags`, { tagIds: selectedSuggestionIds });
      await fetchTagsAndSuggestions(); 
      setSelectedSuggestionIds([]);
    } catch (error) {
      console.error("Failed to add selected suggestions:", error);
    } finally {
      setIsAddingSuggestions(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setSuggestionError(null);
    try {
      const res = await api.post(`/suggestions/content/${content.id}/regenerate`);
      const { existing = [], potential = [] } = res.data || {};
      setTagSuggestions(existing.map((s: any) => ({ ...s, id: s.tagId, type: "EXISTING" })));
      setKeywordSuggestions(potential.map((p: any) => ({ ...p, name: p.keyword, type: "KEYWORD" })));
    } catch (error: any) {
      console.error("Failed to regenerate:", error);
      if (error.response?.status === 429) {
        setSuggestionError("Rate limit exceeded. Please wait.");
      } else {
        setSuggestionError("Failed to regenerate suggestions.");
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  // Filter suggestions
  const displayedTagSuggestions = tagSuggestions
    .filter((s) => !activeTags.some((active) => active.id === s.id))
    .slice(0, 10);
    
  const displayedKeywordSuggestions = keywordSuggestions
    .filter((k) => {
      if (!k.name || k.name.trim().length < 2) return false;
      const lowerName = k.name.trim().toLowerCase();
      return !activeTags.some((active) => active.name.toLowerCase() === lowerName);
    })
    .slice(0, 10);

  const hasNoSuggestions = displayedTagSuggestions.length === 0 && displayedKeywordSuggestions.length === 0;

  return (
    <>
      <Sheet onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {trigger || (
            <button className="text-zinc-900 hover:text-indigo-600 font-medium transition-colors text-left">
              {content.title}
            </button>
          )}
        </SheetTrigger>
        <SheetContent className="overflow-y-auto sm:max-w-2xl md:max-w-3xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-bold">{content.title}</SheetTitle>
            <div className="text-sm text-zinc-500">
              Created on {new Date(content.createdAt).toLocaleDateString()} • {content.contentType}
            </div>
          </SheetHeader>

          <div className="mb-8">
            {content.contentType === "YOUTUBE_VIDEO" ? (
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
            ) : content.contentType === "MARKDOWN" ? (
              <div className="prose prose-zinc max-w-none prose-sm sm:prose-base">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.body}</ReactMarkdown>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-zinc-800 text-sm leading-relaxed font-sans">{content.body}</div>
            )}
          </div>

          <div className="border-t border-zinc-100 pt-6">
            {/* Active Tags Section */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Tag size={18} />
                Active Tags
              </h3>
              <button onClick={() => setIsManageTagsOpen(true)} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 rounded transition-colors">
                <Settings2 size={14} />
                Manage
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {isLoadingTags ? (
                 <div className="w-full max-w-[150px] py-1"><Progress value={30} className="h-1.5 animate-pulse" /></div>
              ) : activeTags.length === 0 ? (
                <span className="text-sm text-zinc-400 italic">No tags attached yet.</span>
              ) : (
                activeTags.map((tag) => (
                  <span key={tag.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-sm font-medium border border-zinc-200" title={tag.id}>
                    {tag.name}
                    <button onClick={() => removeTag(tag.id)} className="p-0.5 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600">
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Suggestions Section */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-500" />
                Tag Recommendations
              </h3>
              <div className="flex items-center gap-2">
                {(selectedSuggestionIds.length > 0 || selectedKeywordNames.length > 0) && (
                  <button onClick={() => {
                    if (selectedSuggestionIds.length > 0) handleAddSelectedSuggestions();
                    if (selectedKeywordNames.length > 0) handleAddSelectedKeywords();
                  }} disabled={isAddingSuggestions} className="text-xs flex items-center gap-1 bg-indigo-600 text-white hover:bg-indigo-700 font-medium px-3 py-1.5 rounded-full shadow-sm transition-all disabled:opacity-50 mr-2">
                    {isAddingSuggestions ? "Adding..." : `Add Selected (${selectedSuggestionIds.length + selectedKeywordNames.length})`}
                    {!isAddingSuggestions && <Plus size={12} />}
                  </button>
                )}
                <button onClick={handleRegenerate} disabled={isRegenerating || isLoadingTags} className="text-xs flex items-center gap-1.5 text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-md transition-colors disabled:opacity-50" title="Regenerate Suggestions">
                  <RotateCw size={12} className={isRegenerating ? "animate-spin" : ""} />
                  Regenerate
                </button>
              </div>
            </div>
            
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 min-h-[100px]">
              {suggestionError && (
                <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex items-center gap-2">
                  <span className="font-bold">Error:</span> {suggestionError}
                </div>
              )}
              {(displayedTagSuggestions.length > 0 || displayedKeywordSuggestions.length > 0) && (
                <p className="text-[10px] text-indigo-400 font-medium italic border-b border-indigo-100 pb-2 mb-3">
                  Note: A higher bar indicates a stronger semantic relevance.
                </p>
              )}
              <div className="space-y-4">
                {displayedTagSuggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-2 tracking-wider">Suggested Existing Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {displayedTagSuggestions.map((tag) => {
                        const isSelected = selectedSuggestionIds.includes(tag.id!);
                        return (
                          <button key={tag.id} onClick={() => toggleSuggestion(tag.id!)} className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all ${isSelected ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-indigo-700 border-indigo-200 hover:shadow-md hover:-translate-y-0.5"}`}>
                            {isSelected && <Check size={12} className="text-indigo-600" />}
                            {tag.name}
                            <div className="w-8 h-1 bg-black/10 rounded-full overflow-hidden ml-1.5 border border-black/5 pointer-events-none" title={`Match Score: ${tag.score}`}>
                              <div 
                                className={`h-full transition-all ${isSelected ? "bg-white" : "bg-indigo-500"}`} 
                                style={{ width: `${Math.max(10, Math.min(100, tag.score * 100))}%` }} 
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {displayedKeywordSuggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-purple-400 mb-3 tracking-wider">New Tag Suggestions</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {displayedKeywordSuggestions.map((kw) => {
                        const isSelected = selectedKeywordNames.includes(kw.name);
                        return (
                          <div key={kw.name} className={`relative flex flex-col bg-white border rounded-lg p-3 transition-all ${isSelected ? "border-purple-400 ring-1 ring-purple-400 shadow-sm" : "border-indigo-100 hover:border-purple-300 hover:shadow-sm"}`}>
                            <div className="flex justify-between items-start gap-2 mb-2">
                                <span className="text-xs font-bold text-purple-900 leading-tight break-words">{kw.name}</span>
                                <button 
                                  onClick={() => handleKeywordClick(kw.name)}
                                  className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full border transition-colors ${isSelected ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-zinc-200 text-zinc-400 hover:border-purple-400 hover:text-purple-600"}`}
                                >
                                  {isSelected ? <Check size={10} /> : <Plus size={12} />}
                                </button>
                            </div>

                            <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-3 pointer-events-none" title={`Match Score: ${kw.score}`}>
                                <div 
                                  className={`h-full transition-all ${isSelected ? "bg-purple-500" : "bg-purple-300"}`} 
                                  style={{ width: `${Math.max(10, Math.min(100, kw.score * 100))}%` }} 
                                />
                            </div>
                            
                            {kw.variants && kw.variants.length > 0 ? (
                              <div className="mt-auto pt-2 border-t border-dashed border-zinc-100">
                                <p className="text-[9px] text-zinc-400 mb-1.5 font-medium">Alternatives:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {kw.variants.map(v => (
                                    <button 
                                      key={v} 
                                      onClick={() => swapKeywordVariant(kw.name, v)}
                                      className="text-[10px] bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded text-zinc-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors"
                                      title={`Use "${v}" instead`}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                                <div className="mt-auto text-[9px] text-zinc-300 italic">No variants</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {hasNoSuggestions && !isLoadingTags && !isRegenerating && (
                   <div className="text-center text-zinc-400 text-sm py-4 italic">No suggestions found.</div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isManageTagsOpen} onOpenChange={setIsManageTagsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Content Tags</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
             <TagSelector selectedTagIds={selectedTagIds} onToggleTag={handleToggleTag} />
          </div>
          <DialogFooter className="pt-2">
            <button onClick={() => setIsManageTagsOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors">Cancel</button>
            <button onClick={handleSaveManagedTags} disabled={isSavingTags} className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50">{isSavingTags ? "Saving..." : "Save Changes"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContentView;