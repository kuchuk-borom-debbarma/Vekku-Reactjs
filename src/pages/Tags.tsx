import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Tag as TagIcon, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import CreateTagModal from "@/components/CreateTagModal";
import EditTagModal from "@/components/EditTagModal";

interface Tag {
  id: string;
  name: string;
  semantic?: string;
  createdAt: string;
}

interface PaginationMetadata {
  nextChunkId: string | null;
  chunkSize: number;
  chunkTotalItems: number;
  limit: number;
  offset: number;
}

const LIMIT = 5;

const Tags: React.FC = () => {
  const queryClient = useQueryClient();

  // Pagination State
  const [offset, setOffset] = useState(0);
  const [chunkId, setChunkId] = useState<string | undefined>(undefined);
  const [chunkStack, setChunkStack] = useState<string[]>([]); // To go back to previous chunks

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setOffset(0); // Reset offset on new search
      setChunkId(undefined);
      setChunkStack([]);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ["tags", { offset, chunkId, debouncedQuery }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: offset.toString(),
      });
      if (chunkId) params.append("chunkId", chunkId);
      if (debouncedQuery) params.append("q", debouncedQuery);

      const res = await api.get(`/tag?${params.toString()}`);
      return res.data;
    },
  });

  const tags = response?.data || [];
  const metadata = response?.metadata as PaginationMetadata | null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tags"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/tag/${id}`);
      handleRefresh();
    } catch (error) {
      console.error("Failed to delete tag:", error);
      alert("Failed to delete tag");
    }
  };

  const handleNext = () => {
    if (!metadata) return;

    if (debouncedQuery) {
      // Simple offset pagination for search
      if (offset + LIMIT < metadata.chunkTotalItems) {
        setOffset(offset + LIMIT);
      }
    } else {
      // Chunk-based pagination for the full list
      if (offset + LIMIT < metadata.chunkTotalItems) {
        setOffset(offset + LIMIT);
      } else if (metadata.nextChunkId) {
        setChunkStack([...chunkStack, chunkId || ""]);
        setChunkId(metadata.nextChunkId);
        setOffset(0);
      }
    }
  };

  const handlePrev = () => {
    if (debouncedQuery) {
      // Simple offset pagination for search
      if (offset - LIMIT >= 0) {
        setOffset(offset - LIMIT);
      }
    } else {
      // Chunk-based pagination for the full list
      if (offset - LIMIT >= 0) {
        setOffset(offset - LIMIT);
      } else if (chunkStack.length > 0) {
        const prevStack = [...chunkStack];
        const prevChunk = prevStack.pop();
        setChunkStack(prevStack);
        setChunkId(prevChunk === "" ? undefined : prevChunk);
        setOffset(0);
      }
    }
  };

  const canGoNext = metadata ? (
    debouncedQuery 
      ? offset + LIMIT < metadata.chunkTotalItems 
      : (offset + LIMIT < metadata.chunkTotalItems || !!metadata.nextChunkId)
  ) : false;

  const canGoPrev = debouncedQuery ? offset > 0 : (offset > 0 || chunkStack.length > 0);

  return (
    <div className="space-y-6 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Tags</h1>
        <CreateTagModal onTagCreated={handleRefresh} />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-zinc-200 shadow-sm">
        <div className="flex-1 flex items-center gap-2 px-2">
          <Search size={18} className="text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search tags..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 placeholder-zinc-400"
          />
        </div>
      </div>

      {/* Tags Grid Container */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
         {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-400">Loading tags...</div>
         ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
                <span className="text-red-600 font-bold">!</span>
              </div>
              <p className="font-medium text-zinc-900 px-4">
                {(error as any).response?.status === 429 
                  ? "Rate limit exceeded. Please wait a moment." 
                  : "Failed to load tags. Please try again later."}
              </p>
              <button 
                onClick={() => refetch()}
                className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Try again
              </button>
            </div>
         ) : tags.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
                <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-3 mx-auto">
                  <TagIcon className="text-zinc-300" />
                </div>
                <p className="font-medium text-zinc-900">{debouncedQuery ? "No tags match your search." : "No tags found."}</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto text-center">
                  {debouncedQuery ? "Try a different search term or create a new tag." : "Tags allow you to organize your content semantically. Create one to get started."}
                </p>
                {!debouncedQuery && (
                  <div className="mt-4">
                    <CreateTagModal 
                      onTagCreated={handleRefresh} 
                      trigger={
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          Create Tag
                        </button>
                      }
                    />
                  </div>
                )}
            </div>
         ) : (
           <div className="flex-1 divide-y divide-zinc-50">
             {tags.map((tag: Tag) => (
               <div key={tag.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-50 transition-colors group gap-4">
                 <div className="min-w-0 flex-1">
                   <h3 className="text-sm font-medium text-zinc-900 truncate">{tag.name}</h3>
                   {tag.semantic && (
                     <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 italic">{tag.semantic}</p>
                   )}
                 </div>
                 <div className="flex items-center justify-between sm:justify-end gap-4">
                   <span className="text-[10px] text-zinc-400 font-mono">
                     {new Date(tag.createdAt).toLocaleDateString()}
                   </span>
                   <div className="flex items-center gap-3 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                     <EditTagModal tag={tag} onTagUpdated={handleRefresh} />
                     <button 
                        onClick={() => handleDelete(tag.id)}
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
         {tags.length > 0 && (
           <div className="border-t border-zinc-100 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between bg-zinc-50/50 gap-3">
             <span className="text-[10px] sm:text-xs text-zinc-500">
                Showing {offset + 1}-{Math.min(offset + LIMIT, metadata?.chunkTotalItems || 0)} of {metadata?.chunkTotalItems || 0}
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
    </div>
  );
};

export default Tags;
