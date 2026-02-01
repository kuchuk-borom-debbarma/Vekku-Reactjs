import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tag, Search, X, Trash2, Loader2, Sparkles, MoreHorizontal, ChevronLeft, ChevronRight, CheckSquare, Square, Plus } from "lucide-react";
import api, { bulkDeleteTags } from "@/lib/api";
import CreateTagModal from "@/components/CreateTagModal";
import EditTagModal from "@/components/EditTagModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TagData {
  id: string;
  name: string;
  semantic: string;
  createdAt: string;
  _count?: {
    contents: number;
  };
}

interface PaginationMetadata {
  nextChunkId: string | null;
  chunkSize: number;
  chunkTotalItems: number;
  limit: number;
  offset: number;
}

const LIMIT = 20;

const Tags: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Pagination State
  const [offset, setOffset] = useState(0);
  const [chunkId, setChunkId] = useState<string | undefined>(undefined);
  const [chunkStack, setChunkStack] = useState<string[]>([]); // To go back to previous chunks

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setOffset(0); 
      setChunkId(undefined);
      setChunkStack([]);
      setSelectedIds(new Set());
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

  const tags = (response?.data || []) as TagData[];
  const metadata = response?.metadata as PaginationMetadata | null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    setSelectedIds(new Set());
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;
    try {
      await api.delete(`/tag/${id}`);
      handleRefresh();
    } catch (error) {
      console.error("Failed to delete tag", error);
      alert("Failed to delete tag");
    }
  };

  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAllInView = () => {
    if (tags.length === 0) return;
    const allInViewSelected = tags.every((t) => selectedIds.has(t.id));
    const newSelected = new Set(selectedIds);
    
    if (allInViewSelected) {
      tags.forEach((t) => newSelected.delete(t.id));
    } else {
      tags.forEach((t) => newSelected.add(t.id));
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async (deleteAll: boolean = false) => {
    const count = deleteAll ? "ALL TAGS" : `${selectedIds.size} selected tags`;
    if (!confirm(`Are you sure you want to delete ${count}? This cannot be undone.`)) return;

    try {
      if (deleteAll) {
        await bulkDeleteTags("*");
      } else {
        await bulkDeleteTags(Array.from(selectedIds));
      }
      handleRefresh();
    } catch (error) {
      console.error("Failed to bulk delete:", error);
      alert("Failed to delete tags.");
    }
  };

  const handleNext = () => {
    if (!metadata) return;

    if (debouncedQuery) {
      if (offset + LIMIT < metadata.chunkTotalItems) {
        setOffset(offset + LIMIT);
      }
    } else {
      if (offset + LIMIT < metadata.chunkTotalItems) {
        setOffset(offset + LIMIT);
      } else if (metadata.nextChunkId) {
        setChunkStack([...chunkStack, chunkId || ""]);
        setChunkId(metadata.nextChunkId);
        setOffset(0);
      }
    }
    setSelectedIds(new Set());
  };

  const handlePrev = () => {
    if (debouncedQuery) {
      if (offset - LIMIT >= 0) {
        setOffset(offset - LIMIT);
      }
    } else {
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
    setSelectedIds(new Set());
  };

  const canGoNext = metadata ? (
    debouncedQuery 
      ? offset + LIMIT < metadata.chunkTotalItems 
      : (offset + LIMIT < metadata.chunkTotalItems || !!metadata.nextChunkId)
  ) : false;

  const canGoPrev = debouncedQuery ? offset > 0 : (offset > 0 || chunkStack.length > 0);
  const allInViewSelected = tags.length > 0 && tags.every((t) => selectedIds.has(t.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Tags</h1>
        <div className="w-full md:w-auto">
           <CreateTagModal 
              onTagCreated={handleRefresh} 
              trigger={
                <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium shadow-sm active:scale-95">
                  <Plus size={16} />
                  New Tag
                </button>
              }
           />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 ? (
        <div className="flex items-center justify-between bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleBulkDelete(false)}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 rounded-md text-white font-medium transition-colors"
            >
              Delete Selected
            </button>
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1.5 text-xs text-zinc-300 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Toolbar */
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button 
            onClick={() => handleBulkDelete(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white border border-zinc-200 text-zinc-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm"
            title="Delete ALL Tags"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Delete All</span>
          </button>
        </div>
      )}

      {/* Tags Grid/List */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-4 sm:px-6 py-3 border-b border-zinc-100 bg-zinc-50/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <div className="flex items-center">
             <button onClick={handleSelectAllInView} className="hover:text-zinc-800 p-1 -ml-1">
               {allInViewSelected ? <CheckSquare size={18} /> : <Square size={18} />}
             </button>
          </div>
          <div>Tag Details</div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
            <Loader2 className="animate-spin mb-2" size={24} />
            <p className="text-sm">Loading tags...</p>
          </div>
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
          <div className="p-16 text-center">
            <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <Tag size={18} />
            </div>
            <p className="text-zinc-900 font-medium text-sm">No tags found</p>
            <p className="text-zinc-500 text-xs mt-1">Create a new tag to start organizing.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {tags.map((tag: TagData) => (
              <div 
                key={tag.id} 
                className={`group flex items-start gap-3 sm:gap-4 px-4 sm:px-6 py-4 transition-colors ${
                  selectedIds.has(tag.id) ? "bg-indigo-50/30" : "hover:bg-zinc-50"
                }`}
              >
                {/* Checkbox */}
                <div className="pt-0.5 shrink-0">
                  <button 
                    onClick={() => handleToggleSelection(tag.id)}
                    className={`p-1 -ml-1 text-zinc-400 hover:text-zinc-600 ${selectedIds.has(tag.id) ? "text-indigo-600" : ""}`}
                  >
                    {selectedIds.has(tag.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </div>

                {/* Tag Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-900">{tag.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-medium border border-zinc-200">
                      {tag.semantic}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                    <Sparkles size={12} className="text-indigo-400 shrink-0" />
                    <span className="truncate">ID: {tag.id}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 ml-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditTagModal 
                          tag={tag} 
                          onTagUpdated={() => handleRefresh()}
                          trigger={
                            <div className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-zinc-100 rounded-sm cursor-pointer">
                               <span>Edit</span>
                            </div>
                          }
                        />
                      </div>
                      <DropdownMenuItem onClick={() => handleDelete(tag.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {tags.length > 0 && (
          <div className="border-t border-zinc-100 px-4 sm:px-6 py-3 flex items-center justify-between bg-zinc-50/50">
             <span className="text-xs text-zinc-500">
                {offset + 1}-{Math.min(offset + LIMIT, metadata?.chunkTotalItems || 0)} of {metadata?.chunkTotalItems || 0}
             </span>
             <div className="flex items-center gap-2">
               <button
                 onClick={handlePrev}
                 disabled={!canGoPrev || isLoading}
                 className="p-2 rounded-lg bg-white shadow-sm border border-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-zinc-600 active:scale-95"
               >
                 <ChevronLeft size={16} />
               </button>
               <button
                 onClick={handleNext}
                 disabled={!canGoNext || isLoading}
                 className="p-2 rounded-lg bg-white shadow-sm border border-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-zinc-600 active:scale-95"
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