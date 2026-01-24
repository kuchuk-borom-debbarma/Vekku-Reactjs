import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Check, ArrowRight, ArrowLeft, Sparkles, ExternalLink, RotateCw } from "lucide-react";
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
  const [step, setStep] = useState<"content" | "preview" | "tags">("content");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(""); // Holds Body or YouTube URL
  const [description, setDescription] = useState(""); // For YouTube user description
  const [transcript, setTranscript] = useState(""); // For YouTube transcript
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
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

  // Auto-fetch YouTube title when URL is pasted
  React.useEffect(() => {
    const fetchTitle = async () => {
      if (contentType !== "YOUTUBE_VIDEO" || !content) return;
      
      const videoId = extractVideoId(content);
      if (!videoId) return;

      setIsFetchingInfo(true);
      try {
        // Try direct browser fetch first (CORS supported by YouTube OEmbed)
        const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(content)}&format=json`);
        if (response.ok) {
          const data = await response.json();
          if (data.title && !title) {
            setTitle(data.title);
          }
        } else {
          // Fallback to backend if direct fetch fails
          const res = await api.post("/youtube/info", { url: content });
          if (res.data?.title && !title) {
            setTitle(res.data.title);
          }
        }
      } catch (err) {
        console.warn("Auto-fetch title failed:", err);
      } finally {
        setIsFetchingInfo(false);
      }
    };

    const timer = setTimeout(fetchTitle, 500); // Debounce
    return () => clearTimeout(timer);
  }, [content, contentType]);

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

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleNextStep = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // --- Step 1: Content -> Preview (YouTube) or Tags (Text) ---
    if (step === "content") {
      if (contentType !== "YOUTUBE_VIDEO" && !title) {
          setError("Title is required.");
          return;
      }
      if (!content) {
          setError(contentType === "YOUTUBE_VIDEO" ? "YouTube URL is required." : "Body is required.");
          return;
      }

      setError("");
      
      if (contentType === "YOUTUBE_VIDEO") {
        const videoId = extractVideoId(content);
        if (!videoId) {
            setError("Invalid YouTube URL.");
            return;
        }

        setIsFetchingInfo(true);
        try {
          // Fetch basic metadata (Title)
          const res = await api.post("/youtube/info", { url: content });
          if (res.data?.title && !title) {
            setTitle(res.data.title);
          }
        } catch (err) {
          console.warn("Failed to fetch youtube info:", err);
        } finally {
          setIsFetchingInfo(false);
        }
        
        // Open helper sites in new tabs
        window.open(`https://tactiq.io/tools/run/youtube_transcript?yt=${encodeURIComponent(content)}`, "_blank");
        
        setStep("preview");
      } else {
        setStep("tags");
        handleGenerateSuggestions("both");
      }
      return;
    }

    // --- Step 2: Preview -> Tags ---
    if (step === "preview") {
      if (!transcript) {
          setError("Please paste the transcript first.");
          return;
      }
      setError("");
      setStep("tags");
      handleGenerateSuggestions("both");
      return;
    }
  };

  const handleGenerateSuggestions = async (mode: "tags" | "keywords" | "both" = "both") => {
    if (mode === "tags" || mode === "both") setIsExtractingTags(true);
    if (mode === "keywords" || mode === "both") setIsExtractingKeywords(true);
    setSuggestionError("");
    
    // Prepare text for suggestion engine: Always include Title for context
    let textToAnalyze = title ? `${title}\n\n${content}` : content;
    if (contentType === "YOUTUBE_VIDEO") {
        textToAnalyze = `${title}\n\n${description}\n\n${transcript || ""}`;
    }

    try {
      const res = await api.post("/suggestions/generate", { text: textToAnalyze, mode });
      const { existing = [], potential = [] } = res.data || {};
      
      if (mode === "tags" || mode === "both") {
        setSuggestedTags(existing);
      }
      if (mode === "keywords" || mode === "both") {
        setExtractedKeywords(potential);
      }
    } catch (err: any) {
      console.error("Failed to suggest tags:", err);
      if (err.response?.status === 429) {
        setSuggestionError("AI rate limit exceeded. Please wait a minute.");
      } else {
        setSuggestionError("Failed to fetch suggestions.");
      }
    }
    finally {
      if (mode === "tags" || mode === "both") setIsExtractingTags(false);
      if (mode === "keywords" || mode === "both") setIsExtractingKeywords(false);
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

      if (selectedKeywords.length > 0) {
        const createTagsRes = await api.post("/tag", { 
          tags: selectedKeywords.map(kw => ({ name: kw, semantic: kw })) 
        });
        const newTagIds = (createTagsRes.data || []).map((t: any) => t.id);
        finalTagIds = [...finalTagIds, ...newTagIds];
      }

      if (contentType === "YOUTUBE_VIDEO") {
        await api.post("/content/youtube", {
          url: content,
          title,
          description,
          transcript,
          tagIds: finalTagIds,
        });
      } else {
        await api.post("/api/content", {
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
            {step === "content" ? "Step 1: Write Content" : step === "preview" ? "Step 2: Provide Transcript" : "Step 3: Add Tags"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {step === "content" && (
          <form onSubmit={handleNextStep} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-zinc-900">
                Title {contentType === "YOUTUBE_VIDEO" && "(Optional)"}
              </label>
              <input
                id="title"
                placeholder="Content title..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required={contentType !== "YOUTUBE_VIDEO"}
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
              <label htmlFor="content" className="text-sm font-medium text-zinc-900">
                {contentType === "YOUTUBE_VIDEO" ? "YouTube URL" : "Body"}
              </label>
              {contentType === "YOUTUBE_VIDEO" ? (
                <div className="space-y-3">
                  <input
                    id="content"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
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
              ) : (
                <>
                  {contentType === "MARKDOWN" && (
                    <div className="flex bg-zinc-100 rounded-md p-1 mb-2 w-fit">
                      <button type="button" onClick={() => setView("write")} className={`px-3 py-1 text-xs font-medium rounded ${view === "write" ? "bg-white shadow-sm text-black" : "text-zinc-500"}`}>Write</button>
                      <button type="button" onClick={() => setView("preview")} className={`px-3 py-1 text-xs font-medium rounded ${view === "preview" ? "bg-white shadow-sm text-black" : "text-zinc-500"}`}>Preview</button>
                    </div>
                  )}
                  {view === "preview" ? (
                    <div className="w-full px-4 py-3 border border-zinc-200 rounded-md bg-zinc-50 min-h-[300px] prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nothing to preview*"}</ReactMarkdown></div>
                  ) : (
                    <textarea id="content" placeholder="Paste or write your content here..." className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm min-h-[300px]" value={content} onChange={(e) => setContent(e.target.value)} required />
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors">Cancel</button>
              <button 
                type="submit" 
                disabled={isFetchingInfo}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isFetchingInfo ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm">
                <div className="flex gap-3 mb-3">
                    <ExternalLink size={18} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-1">Transcript Tools</p>
                        <p>A tool has been opened in a new tab. If it didn't work, try these alternatives to copy the transcript:</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => window.open(`https://tactiq.io/tools/run/youtube_transcript?yt=${encodeURIComponent(content)}`, "_blank")}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                    >
                        Tactiq (Primary)
                    </button>
                    <button 
                        onClick={() => {
                            const videoId = extractVideoId(content);
                            if (videoId) window.open(`https://www.youtube-transcript.io/videos/${videoId}`, "_blank");
                        }}
                        className="px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded text-xs font-bold hover:bg-blue-50 transition-colors"
                    >
                        YouTube-Transcript.io
                    </button>
                    <button 
                        onClick={() => window.open(`https://summarize.tech/${content}`, "_blank")}
                        className="px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded text-xs font-bold hover:bg-blue-50 transition-colors"
                    >
                        Summarize.tech
                    </button>
                </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900">Video Title (for display)</label>
              <input className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video Title..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900">Transcript (paste here)</label>
              <textarea className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm min-h-[300px]" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste the video transcript here..." required />
            </div>
            <DialogFooter>
              <button onClick={() => setStep("content")} className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors mr-auto flex items-center gap-2"><ArrowLeft size={14} /> Back</button>
              <button onClick={() => handleNextStep(null as any)} className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2">Next: Select Tags <ArrowRight size={14} /></button>
            </DialogFooter>
          </div>
        )}

        {step === "tags" && (
          <div className="space-y-4 py-2">
             <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg mb-2">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Tagging Content</p>
                <h3 className="text-sm font-semibold text-zinc-900 truncate">{title || "Untitled Content"}</h3>
             </div>

             <div className="flex items-center justify-between mb-2 gap-2">
               <div className="text-sm text-zinc-500 font-medium">Tag Recommendations</div>
               <div className="flex gap-2">
                 <button 
                   onClick={() => handleGenerateSuggestions("tags")} 
                   disabled={isExtractingTags} 
                   className="text-xs flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                 >
                   <RotateCw size={12} className={isExtractingTags ? "animate-spin" : ""} /> Find Existing
                 </button>
                 <button 
                   onClick={() => handleGenerateSuggestions("keywords")} 
                   disabled={isExtractingKeywords} 
                   className="text-xs flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-medium px-2 py-1 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                 >
                   <Sparkles size={12} className={isExtractingKeywords ? "animate-spin" : ""} /> Discover New
                 </button>
               </div>
             </div>

             <div className="bg-zinc-50/50 rounded-xl p-4 border border-zinc-100 space-y-4 min-h-[100px]">
                {suggestionError && <div className="mb-2 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">{suggestionError}</div>}
                {(suggestedTags.length > 0 || extractedKeywords.length > 0) && (
                  <p className="text-[10px] text-zinc-400 font-medium italic border-b border-zinc-100 pb-2 mb-2">
                    Note: A more filled bar indicates a higher semantic match accuracy.
                  </p>
                )}

                {/* Suggested Existing Tags */}
                {suggestedTags.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-2 tracking-wider">Suggested Existing Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.tagId);
                        return (
                          <button 
                            key={tag.tagId} 
                            onClick={() => handleTagClick(tag.tagId)} 
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all flex items-center gap-1.5 ${isSelected ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-indigo-700 border-indigo-200 hover:border-indigo-300"}`}
                          >
                            {isSelected ? <Check size={12} /> : <Plus size={12} />} {tag.name}
                            <div className="w-8 h-1 bg-black/10 rounded-full overflow-hidden ml-1.5 border border-black/5">
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

                {/* New Tag Suggestions (Keywords) */}
                {extractedKeywords.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-purple-400 mb-3 tracking-wider">New Tag Suggestions</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {extractedKeywords.filter(kw => !suggestedTags.some(s => s.name.toLowerCase() === kw.keyword.trim().toLowerCase())).map((kw) => {
                        const isSelected = selectedKeywords.includes(kw.keyword);
                        return (
                          <div key={kw.keyword} className={`relative flex flex-col bg-white border rounded-lg p-3 transition-all ${isSelected ? "border-purple-400 ring-1 ring-purple-400 shadow-sm" : "border-indigo-100 hover:border-purple-300 hover:shadow-sm"}`}>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="text-xs font-bold text-purple-900 leading-tight break-words">{kw.keyword}</span>
                              <button 
                                onClick={() => handleKeywordClick(kw.keyword)} 
                                className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full border transition-colors ${isSelected ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-zinc-200 text-zinc-400 hover:border-purple-400 hover:text-purple-600"}`}
                              >
                                {isSelected ? <Check size={10} /> : <Plus size={12} />}
                              </button>
                            </div>
                            <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden mb-3">
                              <div className={`h-full transition-all ${isSelected ? "bg-purple-500" : "bg-purple-300"}`} style={{ width: `${Math.max(10, Math.min(100, (1 - parseFloat(kw.score)) * 100))}%` }} />
                            </div>
                            {kw.variants && kw.variants.length > 0 && (
                              <div className="mt-auto pt-2 border-t border-dashed border-zinc-100">
                                <p className="text-[9px] text-zinc-400 mb-1.5 font-medium">Alternatives:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {kw.variants.map(v => (
                                    <button key={v} onClick={() => swapKeywordVariant(kw.keyword, v)} className="text-[10px] bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded text-zinc-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-colors">
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {suggestedTags.length === 0 && extractedKeywords.length === 0 && !isExtractingTags && !isExtractingKeywords && (
                  <p className="text-sm text-zinc-400 italic text-center py-4">No suggestions yet. Provide content and click buttons above.</p>
                )}
             </div>

             <div className="pt-4 border-t border-zinc-100">
                <div className="text-sm font-medium text-zinc-900 mb-3">All Tags</div>
                <TagSelector selectedTagIds={selectedTagIds} onToggleTag={toggleTag} />
             </div>

             <DialogFooter className="mt-6">
               <button onClick={() => setStep(contentType === "YOUTUBE_VIDEO" ? "preview" : "content")} className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors mr-auto flex items-center gap-2"><ArrowLeft size={14} /> Back</button>
               <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                 {isLoading ? "Creating..." : "Create Content"} {!isLoading && <Check size={14} />}
               </button>
             </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateContentModal;
