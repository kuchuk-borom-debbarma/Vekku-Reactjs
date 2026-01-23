import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Check, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
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
  const [contentType, setContentType] = useState("PLAIN_TEXT");
  const [view, setView] = useState<"write" | "preview">("write");

  // Extraction State
  const [isExtractingTags, setIsExtractingTags] = useState(false);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<any[]>([]);
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  
  // Selection State (Local until save)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const resetState = () => {
    setTitle("");
    setContent("");
    setContentType("PLAIN_TEXT");
    setView("write");
    setStep("content");
    setSelectedTagIds([]);
    setSelectedKeywords([]);
    setSuggestedTags([]);
    setExtractedKeywords([]);
    setError("");
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
    try {
      const res = await api.post("/suggestions/generate", { text: content, mode: "tags" });
      setSuggestedTags(res.data.existing || []);
    } catch (err: any) {
      console.error("Failed to suggest tags:", err);
      if (err.response?.status === 429) {
        alert("AI rate limit exceeded for tags. Please wait a minute.");
      }
    } finally {
      setIsExtractingTags(false);
    }
  };

  const handleExtractKeywords = async () => {
    setIsExtractingKeywords(true);
    try {
      const res = await api.post("/suggestions/generate", { text: content, mode: "keywords" });
      setExtractedKeywords((res.data.potential || []).map((p: any) => p.keyword));
    } catch (err: any) {
      console.error("Failed to suggest keywords:", err);
      if (err.response?.status === 429) {
        alert("AI rate limit exceeded for keywords. Please wait a minute.");
      }
    } finally {
      setIsExtractingKeywords(false);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) ? prev.filter(k => k !== keyword) : [...prev, keyword]
    );
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

      // 2. Create Content with all tag IDs
      await api.post("/content", {
        title,
        content,
        contentType,
        tagIds: finalTagIds,
      });

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
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="content" className="text-sm font-medium text-zinc-900">
                  Body
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
              
              {contentType === "MARKDOWN" && view === "preview" ? (
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
                 Smart Suggestions
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={handleSuggestTags}
                   disabled={isExtractingTags}
                   className="text-xs flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                 >
                   <Sparkles size={12} className={isExtractingTags ? "animate-spin" : ""} />
                   Suggest Tags
                 </button>
                 <button 
                   onClick={handleExtractKeywords}
                   disabled={isExtractingKeywords}
                   className="text-xs flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-medium px-2 py-1 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                 >
                   <Sparkles size={12} className={isExtractingKeywords ? "animate-spin" : ""} />
                   Potential Tags
                 </button>
               </div>
             </div>

             {/* Combined Suggestion Area */}
             <div className="bg-zinc-50/50 rounded-xl p-4 border border-zinc-100 space-y-4 min-h-[100px]">
                {/* Matched Tags */}
                {suggestedTags.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-indigo-400 mb-2 tracking-wider">Matches from your tags:</p>
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
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Potential Keywords */}
                {extractedKeywords.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold text-purple-400 mb-2 tracking-wider">New potential keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {extractedKeywords.map((kw) => {
                        const isSelected = selectedKeywords.includes(kw);
                        return (
                          <button
                            key={kw}
                            onClick={() => handleKeywordClick(kw)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-700"
                                : "bg-white text-purple-700 border-purple-200 hover:border-purple-300"
                            }`}
                          >
                            {isSelected ? <Check size={12} /> : <Plus size={12} />}
                            {kw}
                          </button>
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