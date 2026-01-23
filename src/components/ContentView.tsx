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
import { Tag, Sparkles, Plus, X, Settings2, Check, RotateCw } from "lucide-react";
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
    createdAt: string;
  };
  trigger?: React.ReactNode;
}

interface TagItem {
  id: string; // UserTag ID
  name: string;
  score?: string; // For suggestions
  linkId?: string; // For active tags (ContentTag ID)
}

interface SuggestionItem {
  type: "EXISTING" | "KEYWORD";
  id?: string;
  name: string;
  score: string;
}

const ContentView: React.FC<ContentViewProps> = ({ content, trigger }) => {
  const [activeTags, setActiveTags] = useState<TagItem[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<SuggestionItem[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isRegeneratingTags, setIsRegeneratingTags] = useState(false);
  const [isRegeneratingKeywords, setIsRegeneratingKeywords] = useState(false);
  
  // Manage Tags Modal State
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Suggestion Selection State
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const [selectedKeywordNames, setSelectedKeywordNames] = useState<string[]>([]);
  const [isAddingSuggestions, setIsAddingSuggestions] = useState(false);

  const fetchTagsAndSuggestions = async (mode: "tags" | "keywords" | "both" = "both") => {
    if (!content.id) return;
    setIsLoadingTags(true);
    let isMounted = true;
    try {
      // Use the generation endpoint instead of GET to ensure missing suggestions are created
      // Send content.body as 'text' to enable immediate hash-based cache hits
      const [tagsRes, suggestionsRes] = await Promise.all([
        api.get(`/content/${content.id}/tags`),
        api.post(`/suggestions/generate`, { contentId: content.id, text: content.body, mode }),
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
      
      if (mode === "tags" || mode === "both") {
        setTagSuggestions(existing.map((s: any) => ({ ...s, id: s.tagId, type: "EXISTING" })));
      }
      if (mode === "keywords" || mode === "both") {
        setKeywordSuggestions(potential.map((p: any) => ({ ...p, name: p.keyword, type: "KEYWORD" })));
      }
      
      // Initialize selected tags for the manager
      setSelectedTagIds(currentTags.map((t: TagItem) => t.id));
    } catch (error: any) {
      if (!isMounted) return;
      console.error("Failed to fetch tags and suggestions:", error);
      if (error.response?.status === 429) {
        // If we hit rate limit on auto-load, we still show the active tags but maybe set an error for suggestions
        console.warn("AI rate limit hit during auto-load.");
      }
    } finally {
      if (isMounted) {
        setIsLoadingTags(false);
      }
    }
    return () => { isMounted = false; };
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      fetchTagsAndSuggestions("both");
      setSelectedSuggestionIds([]);
      setSelectedKeywordNames([]);
    }
  };

  // Update selected IDs when active tags change
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
      await fetchTagsAndSuggestions("both");
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

  const handleAddSelectedKeywords = async () => {
    if (selectedKeywordNames.length === 0) return;
    setIsAddingSuggestions(true);
    try {
      await api.post(`/content/${content.id}/potential`, { keywords: selectedKeywordNames });
      await fetchTagsAndSuggestions("both");
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
      await fetchTagsAndSuggestions("both"); 
      setSelectedSuggestionIds([]);
    } catch (error) {
      console.error("Failed to add selected suggestions:", error);
    } finally {
      setIsAddingSuggestions(false);
    }
  };

  const handleSuggestTags = async () => {
    setIsRegeneratingTags(true);
    try {
      const res = await api.post("/suggestions/generate", { 
        contentId: content.id, 
        text: content.body, 
        mode: "tags" 
      });
      const { existing = [] } = res.data || {};
      setTagSuggestions(existing.map((s: any) => ({ ...s, id: s.tagId, type: "EXISTING" })));
    } catch (error: any) {
      console.error("Failed to generate tags:", error);
      if (error.response?.status === 429) {
        alert("AI rate limit exceeded for tags. Please wait a minute.");
      }
    } finally {
      setIsRegeneratingTags(false);
    }
  };

  const handleDiscoverPotential = async () => {
    setIsRegeneratingKeywords(true);
    try {
      const res = await api.post("/suggestions/generate", { 
        contentId: content.id, 
        text: content.body, 
        mode: "keywords" 
      });
      const { potential = [] } = res.data || {};
      setKeywordSuggestions(potential.map((p: any) => ({ ...p, name: p.keyword, type: "KEYWORD" })));
    } catch (error: any) {
      console.error("Failed to discover keywords:", error);
      if (error.response?.status === 429) {
        alert("AI rate limit exceeded for potential tags. Please wait a minute.");
      }
    } finally {
      setIsRegeneratingKeywords(false);
    }
  };

  // Filter suggestions
  const displayedTagSuggestions = tagSuggestions
    .filter((s) => !activeTags.some((active) => active.id === s.id))
    .slice(0, 10);
    
  const displayedKeywordSuggestions = keywordSuggestions
    .filter((k) => {
      // Ignore empty, whitespace, or single-character noise
      if (!k.name || k.name.trim().length < 2) return false;
      const lowerName = k.name.trim().toLowerCase();
      // Case-insensitive check against active tags
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
            {content.contentType === "MARKDOWN" ? (
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
                Smart Suggestions
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
                <div className="flex gap-1">
                  <button onClick={handleSuggestTags} disabled={isRegeneratingTags || isLoadingTags} className="text-xs flex items-center gap-1.5 text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-md transition-colors disabled:opacity-50" title="Suggest Existing Tags">
                    <RotateCw size={12} className={isRegeneratingTags ? "animate-spin" : ""} />
                    Suggest Tags
                  </button>
                  <button onClick={handleDiscoverPotential} disabled={isRegeneratingKeywords || isLoadingTags} className="text-xs flex items-center gap-1.5 text-purple-600 hover:bg-purple-50 px-2 py-1.5 rounded-md transition-colors disabled:opacity-50" title="Extract New Keywords">
                    <Sparkles size={12} className={isRegeneratingKeywords ? "animate-spin" : ""} />
                    Potential Tags
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 min-h-[100px]">
              {(displayedTagSuggestions.length > 0 || displayedKeywordSuggestions.length > 0) && (
                <p className="text-[10px] text-indigo-400 font-medium italic border-b border-indigo-100 pb-2 mb-3">
                  Note: A more filled bar indicates a higher semantic match accuracy.
                </p>
              )}
              <div className="space-y-4">
                {displayedTagSuggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-2 tracking-wider">Matched Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {displayedTagSuggestions.map((tag) => {
                        const isSelected = selectedSuggestionIds.includes(tag.id!);
                        return (
                          <button key={tag.id} onClick={() => toggleSuggestion(tag.id!)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all ${isSelected ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-indigo-700 border-indigo-200 hover:shadow-md hover:-translate-y-0.5"}`}>
                            {isSelected && <Check size={12} className="text-indigo-600" />}
                            {tag.name}
                            <div className="w-8 h-1 bg-black/10 rounded-full overflow-hidden ml-1.5 border border-black/5" title={`Match Accuracy Distance: ${tag.score}`}>
                              <div 
                                className={`h-full transition-all ${isSelected ? "bg-white" : "bg-indigo-500"}`} 
                                style={{ width: `${Math.max(10, Math.min(100, (1 - parseFloat(tag.score)) * 100))}%` }} 
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
                    <p className="text-[10px] uppercase font-bold text-purple-400 mb-2 tracking-wider">Potential Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {displayedKeywordSuggestions.map((kw) => {
                        const isSelected = selectedKeywordNames.includes(kw.name);
                        return (
                          <button key={kw.name} onClick={() => handleKeywordClick(kw.name)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all ${isSelected ? "bg-purple-100 text-purple-800 border-purple-300 ring-1 ring-purple-300" : "bg-white text-purple-700 border-indigo-200 hover:shadow-md hover:border-purple-300 hover:bg-purple-50"}`}>
                            {isSelected ? <Check size={12} className="text-purple-600" /> : <Plus size={12} />}
                            <span>{kw.name}</span>
                            <div className="w-8 h-1 bg-black/10 rounded-full overflow-hidden ml-1.5 border border-black/5" title={`Match Accuracy Distance: ${kw.score}`}>
                              <div 
                                className={`h-full transition-all ${isSelected ? "bg-white" : "bg-purple-500"}`} 
                                style={{ width: `${Math.max(10, Math.min(100, (1 - parseFloat(kw.score)) * 100))}%` }} 
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}


                {hasNoSuggestions && !isLoadingTags && !isRegeneratingTags && !isRegeneratingKeywords && (
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
