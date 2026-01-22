import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ArrowRight, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "@/lib/api";
import TagSelector from "@/components/TagSelector";

interface CreateContentModalProps {
  onContentCreated: () => void;
  trigger?: React.ReactNode;
}

const CreateContentModal: React.FC<CreateContentModalProps> = ({ onContentCreated, trigger }) => {
  const [open, setOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("PLAIN_TEXT");
  const [view, setView] = useState<"write" | "preview">("write");
  
  // Wizard State
  const [step, setStep] = useState<"content" | "tags">("content");
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
  };

  const handleCreateContent = async () => {
    setIsLoading(true);
    setError("");

    try {
      await api.post("/content", { 
          title, 
          content, 
          contentType,
          tagIds: selectedTagIds 
      });
      handleComplete();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to create content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    setOpen(false);
    onContentCreated();
    setTimeout(resetState, 300);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
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
            {step === "content" ? "Create New Content" : "Add Tags"}
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Project Documentation"
                className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
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
                      className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                        view === "write" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("preview")}
                      className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                        view === "preview" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"
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
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your content here..."
                  className="w-full px-3 py-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm min-h-[300px] font-mono"
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
                Next: Add Tags
                <ArrowRight size={14} />
              </button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
             <div className="text-sm text-zinc-500 mb-2">
               Select tags to link to your new content. You can skip this step if you wish.
             </div>
             
             <TagSelector selectedTagIds={selectedTagIds} onToggleTag={toggleTag} />
             
             <DialogFooter className="mt-6">
               <button
                 type="button"
                 onClick={() => setStep("content")}
                 className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors mr-auto"
               >
                 Back
               </button>
               <button
                 type="button"
                 onClick={handleCreateContent}
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
