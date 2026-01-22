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
  suggestionId?: string;
  linkId?: string; // For active tags (ContentTag ID)
}

const ContentView: React.FC<ContentViewProps> = ({ content, trigger }) => {
  const [activeTags, setActiveTags] = useState<TagItem[]>([]);
  const [suggestions, setSuggestions] = useState<TagItem[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Manage Tags Modal State
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Suggestion Selection State
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  const [isAddingSuggestions, setIsAddingSuggestions] = useState(false);

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

      // Map active tags: ContentTag { id (link), tagId, name } -> TagItem { id (tagId), linkId, name }
      const currentTags = (tagsRes.data.data || []).map((t: any) => ({
        id: t.tagId,
        name: t.name,
        linkId: t.id
      }));
      setActiveTags(currentTags);
      
      // Suggestions response: { id, score, tag: { id, name, ... } }[]
      // Map to TagItem format using Tag ID as main ID
      const mappedSuggestions = (suggestionsRes.data || []).map((s: any) => ({
        id: s.tag.id,
        name: s.tag.name,
        score: s.score,
        suggestionId: s.id
      }));
      setSuggestions(mappedSuggestions);
      
      // Initialize selected tags for the manager
      setSelectedTagIds(currentTags.map((t: TagItem) => t.id));
    } catch (error: any) {
      if (!isMounted) return;
      console.error("Failed to fetch tags:", error);
      if (error.response?.status === 429) {
        alert("Rate limit exceeded. Please wait a moment.");
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
      fetchTagsAndSuggestions();
      setSelectedSuggestionIds([]); // Reset selections on new content open
    }
  };

  // Update selected IDs when active tags change (e.g. after add/remove via other means)
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

  // --- Bulk Suggestions Logic ---

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
      
      // Move from suggestions to active locally
      const addedTags = suggestions.filter(s => selectedSuggestionIds.includes(s.id));
      const newActive = [...activeTags, ...addedTags];
      setActiveTags(newActive);
      setSuggestions(suggestions.filter(s => !selectedSuggestionIds.includes(s.id)));
      
      setSelectedSuggestionIds([]); // Reset selection
    } catch (error) {
      console.error("Failed to add selected suggestions:", error);
      alert("Failed to add tags.");
    } finally {
      setIsAddingSuggestions(false);
    }
  };

  const handleRegenerateSuggestions = async () => {
    setIsRegenerating(true);
    try {
      const res = await api.post(`/suggestions/content/${content.id}/regenerate`);
      const mapped = (res.data.data || []).map((s: any) => ({
        id: s.tag.id,
        name: s.tag.name,
        score: s.score,
        suggestionId: s.id
      }));
      setSuggestions(mapped);
    } catch (error) {
      console.error("Failed to regenerate suggestions:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const displayedSuggestions = suggestions
    .filter((s) => !activeTags.some((active) => active.id === s.id))
    .slice(0, 12);

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
            <div className="flex flex-col gap-1">
              <div className="text-sm text-zinc-500">
                Created on {new Date(content.createdAt).toLocaleDateString()} • {content.contentType}
              </div>
              <div className="text-[10px] font-mono text-zinc-400 select-all">
                ID: {content.id}
              </div>
            </div>
          </SheetHeader>

          {/* Content Body */}
          <div className="mb-8">
            {content.contentType === "MARKDOWN" ? (
              <div className="prose prose-zinc max-w-none prose-sm sm:prose-base">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content.body}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-zinc-800 text-sm leading-relaxed font-sans">
                {content.body}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Tag size={18} />
                Active Tags
              </h3>
              <button 
                onClick={() => setIsManageTagsOpen(true)}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 rounded transition-colors"
              >
                <Settings2 size={14} />
                Manage
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-8">
              {isLoadingTags ? (
                 <div className="w-full max-w-[150px] py-1">
                   <Progress value={30} className="h-1.5 animate-pulse" />
                 </div>
              ) : activeTags.length === 0 ? (
                <span className="text-sm text-zinc-400 italic">No tags attached yet.</span>
              ) : (
                activeTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-sm font-medium border border-zinc-200"
                  >
                    {tag.name}
                    <button
                      onClick={() => removeTag(tag.id)}
                      className="p-0.5 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-500" />
                Suggested Tags
                <span className="text-[10px] font-normal text-zinc-400 ml-1 hidden sm:inline-block">(Lower score is better)</span>
              </h3>
              <div className="flex items-center gap-2">
                {selectedSuggestionIds.length > 0 && (
                  <button
                    onClick={handleAddSelectedSuggestions}
                    disabled={isAddingSuggestions}
                    className="text-xs flex items-center gap-1 bg-indigo-600 text-white hover:bg-indigo-700 font-medium px-3 py-1.5 rounded-full shadow-sm transition-all animate-in fade-in zoom-in duration-200 disabled:opacity-50"
                  >
                    {isAddingSuggestions ? "Adding..." : `Add Selected (${selectedSuggestionIds.length})`}
                    {!isAddingSuggestions && <Plus size={12} />}
                  </button>
                )}
                <button
                  onClick={handleRegenerateSuggestions}
                  disabled={isRegenerating || isLoadingTags}
                  className="text-zinc-400 hover:text-indigo-600 transition-colors p-1.5 rounded-full hover:bg-indigo-50 disabled:opacity-50"
                  title="Regenerate Suggestions"
                >
                  <RotateCw size={14} className={isRegenerating ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            
            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 min-h-[100px]">
              <div className="flex flex-wrap gap-2">
                {isLoadingTags ? (
                   <div className="w-full max-w-[150px] py-1">
                     <Progress value={30} className="h-1.5 animate-pulse" />
                   </div>
                ) : displayedSuggestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center w-full py-4 text-center">
                    <span className="text-sm text-zinc-400 italic mb-2">
                      No suggestions available.
                    </span>
                    {!isRegenerating && (
                        <button 
                            onClick={handleRegenerateSuggestions}
                            className="text-xs text-indigo-600 hover:underline"
                        >
                            Try regenerating?
                        </button>
                    )}
                  </div>
                ) : (
                  displayedSuggestions.map((tag) => {
                    const isSelected = selectedSuggestionIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleSuggestion(tag.id)}
                        title={tag.score ? `Distance Score: ${tag.score}` : undefined}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm transition-all ${
                          isSelected 
                            ? "bg-indigo-100 text-indigo-800 border-indigo-300 ring-1 ring-indigo-300" 
                            : "bg-white text-indigo-700 border-indigo-200 hover:shadow-md hover:-translate-y-0.5"
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-indigo-600" />}
                        {tag.name}
                        {tag.score && (
                           <span className={`text-[10px] font-mono ml-1 opacity-70 ${isSelected ? "text-indigo-600" : "text-indigo-400"}`}>
                             {parseFloat(tag.score).toFixed(4)}
                           </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Tags Modal */}
      <Dialog open={isManageTagsOpen} onOpenChange={setIsManageTagsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Content Tags</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-2">
             <TagSelector selectedTagIds={selectedTagIds} onToggleTag={handleToggleTag} />
          </div>

          <DialogFooter className="pt-2">
            <button
              onClick={() => setIsManageTagsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveManagedTags}
              disabled={isSavingTags}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isSavingTags ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContentView;