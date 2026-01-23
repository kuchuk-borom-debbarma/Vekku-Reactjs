import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ChevronLeft, ChevronRight, Trash2, Filter, X } from "lucide-react";
import api from "@/lib/api";
import CreateContentModal from "@/components/CreateContentModal";
import EditContentModal from "@/components/EditContentModal";
import ContentView from "@/components/ContentView";
import TagSelector from "@/components/TagSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Content {
  id: string;
  title: string;
  body: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMetadata {
  nextChunkId: string | null;
  chunkSize: number;
  chunkTotalItems: number;
  limit: number;
  offset: number;
}

const LIMIT = 5;

const Contents: React.FC = () => {
  const queryClient = useQueryClient();

  // Pagination State
  const [offset, setOffset] = useState(0);
  const [chunkId, setChunkId] = useState<string | undefined>(undefined);
  const [chunkStack, setChunkStack] = useState<string[]>([]);

  // Filtering State
  const [activeFilterTagIds, setActiveFilterTagIds] = useState<string[]>([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);

  const isFiltering = activeFilterTagIds.length > 0;

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ["contents", { offset, chunkId, activeFilterTagIds }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: offset.toString(),
      });
      if (chunkId) params.append("chunkId", chunkId);

      if (isFiltering) {
        params.append("tagIds", activeFilterTagIds.join(","));
        const res = await api.get(`/content/by-tags?${params.toString()}`);
        return res.data;
      } else {
        const res = await api.get(`/content?${params.toString()}`);
        return res.data;
      }
    },
  });

  const contents = response?.data || [];
  const metadata = response?.metadata as PaginationMetadata | null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contents"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    try {
      await api.delete(`/content/${id}`);
      handleRefresh();
    } catch (error) {
      console.error("Failed to delete content:", error);
      alert("Failed to delete content");
    }
  };

  const handleNext = () => {
    if (!metadata) return;
    if (offset + LIMIT < metadata.chunkTotalItems) {
      setOffset(offset + LIMIT);
    } else if (metadata.nextChunkId) {
      setChunkStack([...chunkStack, chunkId || ""]); 
      setChunkId(metadata.nextChunkId);
      setOffset(0);
    }
  };

  const handlePrev = () => {
    if (offset - LIMIT >= 0) {
      setOffset(offset - LIMIT);
    } else if (chunkStack.length > 0) {
      const prevStack = [...chunkStack];
      const prevChunk = prevStack.pop();
      setChunkStack(prevStack);
      setChunkId(prevChunk === "" ? undefined : prevChunk);
      setOffset(0);
    }
  };

  const canGoNext = metadata ? (offset + LIMIT < metadata.chunkTotalItems || !!metadata.nextChunkId) : false;
  const canGoPrev = offset > 0 || chunkStack.length > 0;

  const openFilterDialog = () => {
    setPendingTagIds([...activeFilterTagIds]);
    setIsFilterDialogOpen(true);
  };

  const applyFilter = () => {
    setActiveFilterTagIds([...pendingTagIds]);
    setOffset(0);
    setChunkId(undefined);
    setChunkStack([]);
    setIsFilterDialogOpen(false);
  };

  const clearFilter = () => {
    setActiveFilterTagIds([]);
    setOffset(0);
    setChunkId(undefined);
    setChunkStack([]);
  };

  const togglePendingTag = (tagId: string) => {
    setPendingTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="space-y-6 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Contents</h1>
        <CreateContentModal onContentCreated={handleRefresh} />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-2 rounded-lg border border-zinc-200 shadow-sm">
        <button 
          onClick={openFilterDialog}
          className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isFiltering ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-100"
          }`}
        >
          <Filter size={16} />
          {isFiltering ? `Filtered by ${activeFilterTagIds.length} tags` : "Filter by Tags"}
        </button>

        <div className="flex items-center justify-between sm:justify-start gap-3">
          {isFiltering && (
            <button 
              onClick={clearFilter}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 hover:text-red-600 transition-colors"
            >
              <X size={14} />
              Clear Filter
            </button>
          )}

          {isFiltering && (
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest sm:ml-auto animate-pulse">
              Tag Filter Active
            </span>
          )}
        </div>
      </div>

      {/* Content List Container */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm min-h-[400px] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-zinc-500">
            Loading contents...
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
              <span className="text-red-600 font-bold">!</span>
            </div>
            <p className="font-medium text-zinc-900 px-4">
              {(error as any).response?.status === 429 
                ? "Rate limit exceeded. Please wait a moment." 
                : "Failed to load contents. Please try again later."}
            </p>
            <button 
              onClick={() => refetch()}
              className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        ) : contents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
            <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3 mx-auto">
              <FileText className="text-zinc-300" />
            </div>
            <p className="font-medium text-zinc-900">{isFiltering ? "No contents match these tags." : "No contents found."}</p>
            <div className="mt-4">
              {isFiltering ? (
                <button onClick={clearFilter} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  Clear filter to see all
                </button>
              ) : (
                <CreateContentModal 
                  onContentCreated={handleRefresh}
                  trigger={
                    <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                      Create your first content
                    </button>
                  }
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 divide-y divide-zinc-50">
            {contents.map((content: Content) => (
              <div key={content.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-50 transition-colors group gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded bg-indigo-50 flex-shrink-0 flex items-center justify-center text-indigo-600 mt-0.5 sm:mt-0">
                    <FileText size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <ContentView 
                      content={content}
                      trigger={
                        <p className="text-sm font-medium text-zinc-900 group-hover:text-indigo-600 transition-colors cursor-pointer hover:underline truncate">
                          {content.title || "Untitled Content"}
                        </p>
                      }
                    />
                    <p className="text-xs text-zinc-500">
                      Edited {new Date(content.updatedAt || content.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:pl-0 pl-11">
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-[10px] font-medium uppercase tracking-wider">
                    {content.contentType}
                  </span>
                  <div className="flex items-center gap-3 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                     <EditContentModal content={content} onContentUpdated={handleRefresh} />
                     <button 
                        onClick={() => handleDelete(content.id)}
                        className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {contents.length > 0 && (
           <div className="border-t border-zinc-100 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between bg-zinc-50/50 gap-3">
             <span className="text-[10px] sm:text-xs text-zinc-500">
                Showing {offset + 1}-{Math.min(offset + LIMIT, metadata?.chunkTotalItems || 0)} of {metadata?.chunkTotalItems || 0} {isFiltering ? "matches" : "in segment"}
             </span>
             <div className="flex items-center gap-2">
               <button
                 onClick={handlePrev}
                 disabled={!canGoPrev || isLoading}
                 className="p-1.5 rounded-md bg-white shadow-sm border border-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-zinc-600"
               >
                 <ChevronLeft size={16} />
               </button>
               <button
                 onClick={handleNext}
                 disabled={!canGoNext || isLoading}
                 className="p-1.5 rounded-md bg-white shadow-sm border border-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-zinc-600"
               >
                 <ChevronRight size={16} />
               </button>
             </div>
           </div>
         )}
      </div>

      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Filter Contents by Tags</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-2">
            <p className="text-xs text-zinc-500 mb-4 px-1">
              Select tags to find contents that contain <strong>all</strong> selected tags.
            </p>
            <TagSelector 
              selectedTagIds={pendingTagIds} 
              onToggleTag={togglePendingTag} 
            />
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-100">
            <button 
              onClick={() => setIsFilterDialogOpen(false)} 
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={applyFilter} 
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-zinc-800 transition-colors"
            >
              Find Contents
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contents;