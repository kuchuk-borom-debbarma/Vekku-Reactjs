import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Check, ArrowRight, ArrowLeft, Sparkles, RotateCw } from "lucide-react";
import api from "@/lib/api";
import TagSelector from "@/components/TagSelector";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CreateContentModalProps {
  onContentCreated: () => void;
  trigger?: React.ReactNode;
}

const CreateContentModal: React.FC<CreateContentModalProps> = ({ onContentCreated, trigger }) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"content" | "tags">("content");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState(""); // For YouTube user description
  const [transcript, setTranscript] = useState(""); // For YouTube transcript
  const [isFetchingInfo, setIsFetchingInfo] = useState(false); // For loading state
  const [contentType, setContentType] = useState("PLAIN_TEXT");
  const [view, setView] = useState<"write" | "preview">("write");

  // Extraction State
  const [isExtractingTags, setIsExtractingTags] = useState(false);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);
  const [extractedKeywords, setExtractedKeywords] = useState<{keyword: string, score: string, variants: string[]}[]>([]);
  
  // Selection State (Local until save)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestionError, setSuggestionError] = useState("");

  const resetState = () => {
    setTitle("");
    setContent("");
    setDescription("");
    setTranscript("");
    setContentType("PLAIN_TEXT");
    setView("write");
    setStep("content");
    setSelectedTagIds([]);
    setSelectedKeywords([]);
    setSuggestedTags([]);
    setExtractedKeywords([]);
    setError("");
    setSuggestionError("");
  };

  const handleFetchYoutubeInfo = async () => {
    if (!content) return;
    setIsFetchingInfo(true);
    setSuggestionError("");
    try {
      const res = await api.post("/content/youtube/preview", { url: content });
      if (res.data) {
        if (!title) setTitle(res.data.title);
        setTranscript(res.data.transcript);
      }
    } catch (err: any) {
      console.error("Failed to fetch info:", err);
      // We don't block user, just show warning if needed or ignore
      // Maybe set a small inline error or just rely on manual entry
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
        setError("Title and Body are required.");
        return;
    }
    setError("");
    setStep("tags");
    
    // Automatically trigger suggestions
    handleSuggestTags();
    handleExtractKeywords();
  };

  const handleSuggestTags = async () => {
    setIsExtractingTags(true);
    setSuggestionError("");
    
    // Prepare text for suggestion engine
    let textToAnalyze = content;
    if (contentType === "YOUTUBE_VIDEO") {
        // Use full context (Title + Description + Transcript) for finding existing tags too
        textToAnalyze = `${title}\n\n${description}\n\n${transcript || ""}`;
    }

    try {
      const res = await api.post("/suggestions/generate", { text: textToAnalyze, mode: "tags" });
      setSuggestedTags(res.data.existing || []);
      setExtractedKeywords(res.data.potential || []);
    } catch (err: any) {
      console.error("Failed to suggest tags:", err);
      if (err.response?.status === 429) {
        setSuggestionError("AI rate limit exceeded for tags. Please wait a minute.");
      } else {
        setSuggestionError("Failed to fetch tag suggestions.");
      }
    }
    finally {
      setIsExtractingTags(false);
    }
  };

  const handleExtractKeywords = async () => {
    setIsExtractingKeywords(true);
    setSuggestionError("");

    // Prepare text for suggestion engine
    let textToAnalyze = content;
    if (contentType === "YOUTUBE_VIDEO") {
        textToAnalyze = `${title}\n\n${description}\n\n${transcript || ""}`;
    }

    try {
      const res = await api.post("/suggestions/generate", { text: textToAnalyze, mode: "keywords" });
      setExtractedKeywords(res.data.potential || []);
      setSuggestedTags(res.data.existing || []);
    } catch (err: any) {
      console.error("Failed to suggest keywords:", err);
      if (err.response?.status === 429) {
        setSuggestionError("AI rate limit exceeded for keywords. Please wait a minute.");
      } else {
        setSuggestionError("Failed to discover new keywords.");
      }
    }
    finally {
      setIsExtractingKeywords(false);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) ? prev.filter(k => k !== keyword) : [...prev, keyword]
    );
  };

  const swapKeywordVariant = (originalName: string, newName: string) => {
    setExtractedKeywords(prev => prev.map(s => {
      if (s.keyword === originalName) {
        const newVariants = [originalName, ...(s.variants || [])].filter(v => v !== newName);
        return { ...s, keyword: newName, variants: newVariants };
      }
      return s;
    }));
    
    // Update selection if original was selected
    setSelectedKeywords(prev => prev.map(k => k === originalName ? newName : k));
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");
    try {
      let finalTagIds = [...selectedTagIds];

      // 1. If there are selected keywords, create them as tags first
      if (selectedKeywords.length > 0) {
        const createTagsRes = await api.post("/tag", { 
          tags: selectedKeywords.map(kw => ({ name: kw, semantic: kw })) 
        });
        const newTagIds = (createTagsRes.data || []).map((t: any) => t.id);
        finalTagIds = [...finalTagIds, ...newTagIds];
      }

      // 2. Create Content
      if (contentType === "YOUTUBE_VIDEO") {
        await api.post("/content/youtube", {
          url: content, // Content state holds the URL
          title,
          description,
          tagIds: finalTagIds,
        });
      } else {
        await api.post("/content", {
          title,
          content,
          contentType,
          tagIds: finalTagIds,
        });
      }

      onContentCreated();
      setOpen(false);
      resetState();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create content");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!val) resetState();
        setOpen(val);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium">
            <Plus size={16} />
            New Content
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "content" ? "Step 1: Write Content" : "Step 2: Add Tags"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {step === "content" ? (
          <form onSubmit={handleNextStep} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-zinc-900">
                Title
              </label>
              <input
                id="title"
                placeholder="Content title..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="content-type" className="text-sm font-medium text-zinc-900">
                Type
              </label>
              <select
                id="content-type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm bg-white"
              >
                <option value="PLAIN_TEXT">Plain Text</option>
                <option value="MARKDOWN">Markdown</option>
                <option value="YOUTUBE_VIDEO">YouTube Video</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="content" className="text-sm font-medium text-zinc-900">
                  {contentType === "YOUTUBE_VIDEO" ? "YouTube URL" : "Body"}
                </label>
                {contentType === "MARKDOWN" && (
                  <div className="flex bg-zinc-100 rounded-md p-1">
                    <button
                      type="button"
                      onClick={() => setView("write")}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        view === "write" ? "bg-white shadow-sm text-black" : "text-zinc-500 hover:text-zinc-700"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("preview")}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        view === "preview" ? "bg-white shadow-sm text-black" : "text-zinc-500 hover:text-zinc-700"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                )}
              </div>
              
              {contentType === "YOUTUBE_VIDEO" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      id="content" // reusing content state for URL
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleFetchYoutubeInfo}
                      disabled={isFetchingInfo || !content}
                      className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors disabled:opacity-50 text-xs font-medium flex items-center gap-1.5 min-w-[80px] justify-center"
                    >
                      {isFetchingInfo ? <RotateCw size={14} className="animate-spin" /> : "Fetch Info"}
                    </button>
                  </div>
                  
                  {transcript && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium px-1">
                      <Check size={12} />
                      Transcript loaded
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <label htmlFor="description" className="text-sm font-medium text-zinc-900">
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      placeholder="Add a personal note or description..."
                      className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm min-h-[100px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              ) : contentType === "MARKDOWN" && view === "preview" ? (
                <div className="w-full px-4 py-3 border border-zinc-200 rounded-md bg-zinc-50 min-h-[300px] prose prose-sm max-w-none overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || "*Nothing to preview*"}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  id="content"
                  placeholder="Paste or write your content here..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm min-h-[300px] font-mono"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              )}
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                Next: Select Tags
                <ArrowRight size={14} />
              </button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
             <div className="flex items-center justify-between mb-2 gap-2">
               <div className="text-sm text-zinc-500 font-medium">
                 Tag Recommendations
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={handleSuggestTags}
                   disabled={isExtractingTags}
                   className="text-xs flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                 >
                   <Sparkles size={12} className={isExtractingTags ? "animate-spin" : ""} />
                   Find Existing
                 </button>
                 <button 
                   onClick={handleExtractKeywords}
                   disabled={isExtractingKeywords}
                   className="text-xs flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-medium px-2 py-1 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                 >
                   <Sparkles size={12} className={isExtractingKeywords ? "animate-spin" : ""} />
                   Discover New
                 </button>
               </div>
             </div>

             {/* Combined Suggestion Area */}
             <div className="bg-zinc-50/50 rounded-xl p-4 border border-zinc-100 space-y-4 min-h-[100px]">
                {suggestionError && (
                  <div className="mb-2 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                    {suggestionError}
                  </div>
                )}
                {(suggestedTags.length > 0 || extractedKeywords.length > 0) && (
                  <p className="text-[10px] text-zinc-400 font-medium italic border-b border-zinc-100 pb-2 mb-2">
                    Note: A more filled bar indicates a higher semantic match accuracy.
                  </p>
                )}

                {/* Matched Tags */}
                {suggestedTags.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-2 tracking-wider">Suggested Existing Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.tagId);
                        return (
                          <button
                            key={tag.tagId}
                            onClick={() => handleTagClick(tag.tagId)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all flex items-center gap-1.5 ${
                              isSelected 
                                ? "bg-indigo-600 text-white border-indigo-700" 
                                : "bg-white text-indigo-700 border-indigo-200 hover:border-indigo-300"
                            }`}
                          >
                            {isSelected ? <Check size={12} /> : <Plus size={12} />}
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

                {/* Potential Keywords */}
                {extractedKeywords.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-purple-400 mb-3 tracking-wider">New Tag Suggestions:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {extractedKeywords
                        .filter(kw => {
                          if (!kw.keyword || kw.keyword.trim().length < 2) return false;
                          const lower = kw.keyword.trim().toLowerCase();
                          // Don't show if already in matched suggestions
                          return !suggestedTags.some(s => s.name.toLowerCase() === lower);
                        })
                        .map((kw) => {
                          const isSelected = selectedKeywords.includes(kw.keyword);
                          return (
                            <div key={kw.keyword} className={`relative flex flex-col bg-white border rounded-lg p-3 transition-all ${isSelected ? "border-purple-400 ring-1 ring-purple-400 shadow-sm" : "border-indigo-100 hover:border-purple-300 hover:shadow-sm"}`}>
                                {/* Header */}
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <span className="text-xs font-bold text-purple-900 leading-tight break-words">{kw.keyword}</span>
                                    <button
                                        onClick={() => handleKeywordClick(kw.keyword)}
                                        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full border transition-colors ${isSelected ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-zinc-200 text-zinc-400 hover:border-purple-400 hover:text-purple-600"}`}
                                    >
                                        {isSelected ? <Check size={10} /> : <Plus size={12} />}
                                    </button>
                                </div>

                                {/* Score */}
                                <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-3" title={`Match Accuracy Distance: ${kw.score}`}>
                                    <div 
                                        className={`h-full transition-all ${isSelected ? "bg-purple-500" : "bg-purple-300"}`} 
                                        style={{ width: `${Math.max(10, Math.min(100, (1 - parseFloat(kw.score)) * 100))}%` }} 
                                    />
                                </div>

                                {/* Variants */}
                                {kw.variants && kw.variants.length > 0 ? (
                                    <div className="mt-auto pt-2 border-t border-dashed border-zinc-100">
                                        <p className="text-[9px] text-zinc-400 mb-1.5 font-medium">Alternatives:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                        {kw.variants.map(v => (
                                            <button 
                                            key={v}
                                            onClick={() => swapKeywordVariant(kw.keyword, v)}
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

                {suggestedTags.length === 0 && extractedKeywords.length === 0 && !isExtractingTags && !isExtractingKeywords && (
                  <p className="text-sm text-zinc-400 italic text-center py-4">No suggestions yet. Click buttons above to analyze.</p>
                )}
             </div>

             <div className="pt-4 border-t border-zinc-100">
                <div className="text-sm font-medium text-zinc-900 mb-3">All Tags</div>
                <TagSelector selectedTagIds={selectedTagIds} onToggleTag={toggleTag} />
             </div>

             <DialogFooter className="mt-6">
               <button
                 type="button"
                 onClick={() => setStep("content")}
                 className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors mr-auto flex items-center gap-2"
               >
                 <ArrowLeft size={14} />
                 Back
               </button>
               <button
                 type="button"
                 onClick={handleSubmit}
                 disabled={isLoading}
                 className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2"
               >
                 {isLoading ? "Creating..." : "Create Content"}
                 {!isLoading && <Check size={14} />}
               </button>
             </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateContentModal;