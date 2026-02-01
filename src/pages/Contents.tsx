import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Filter, X, CheckSquare, Square, Search, MoreHorizontal, Plus } from "lucide-react";
import api, { bulkDeleteContents, searchContents } from "@/lib/api";
import CreateContentModal from "@/components/CreateContentModal";
import EditContentModal from "@/components/EditContentModal";
import TagSelector from "@/components/TagSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Content {
  id: string;
  title: string;
  body: string;
  contentType: string;
  metadata?: any;
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

const LIMIT = 20;

const Contents: React.FC = () => {
  const queryClient = useQueryClient();

  // Pagination State
  const [offset, setOffset] = useState(0);
  const [chunkId, setChunkId] = useState<string | undefined>(undefined);
  const [chunkStack, setChunkStack] = useState<string[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Filtering State
  const [activeFilterTagIds, setActiveFilterTagIds] = useState<string[]>([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isFiltering = activeFilterTagIds.length > 0;

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

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["contents", { offset, chunkId, activeFilterTagIds, debouncedQuery }],
    queryFn: async () => {
      if (debouncedQuery) {
        const res = await searchContents(debouncedQuery, LIMIT);
        return {
           data: res.data, 
           metadata: { 
             chunkTotalItems: res.data.length, 
             limit: LIMIT, 
             offset: 0, 
             nextChunkId: null,
             chunkSize: LIMIT
           } 
        };
      }

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
    setSelectedIds(new Set());
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
    if (contents.length === 0) return;
    const allInViewSelected = contents.every((c: Content) => selectedIds.has(c.id));
    const newSelected = new Set(selectedIds);
    
    if (allInViewSelected) {
      contents.forEach((c: Content) => newSelected.delete(c.id));
    } else {
      contents.forEach((c: Content) => newSelected.add(c.id));
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async (deleteAll: boolean = false) => {
    const count = deleteAll ? "ALL CONTENTS" : `${selectedIds.size} selected contents`;
    if (!confirm(`Are you sure you want to delete ${count}? This cannot be undone.`)) return;

    try {
      if (deleteAll) {
        await bulkDeleteContents("*");
      } else {
        await bulkDeleteContents(Array.from(selectedIds));
      }
      handleRefresh();
    } catch (error) {
      console.error("Failed to bulk delete:", error);
      alert("Failed to delete contents.");
    }
  };

  const handleNext = () => {
    if (!metadata) return;
    
    if (debouncedQuery) {
      if (contents.length === LIMIT) {
        setOffset(offset + LIMIT);
        setSelectedIds(new Set());
      }
      return;
    }

    if (offset + LIMIT < metadata.chunkTotalItems) {
      setOffset(offset + LIMIT);
    } else if (metadata.nextChunkId) {
      setChunkStack([...chunkStack, chunkId || ""]); 
      setChunkId(metadata.nextChunkId);
      setOffset(0);
    }
    setSelectedIds(new Set());
  };

  const handlePrev = () => {
    if (debouncedQuery) {
      if (offset > 0) {
        setOffset(Math.max(0, offset - LIMIT));
        setSelectedIds(new Set());
      }
      return;
    }

    if (offset - LIMIT >= 0) {
      setOffset(offset - LIMIT);
    } else if (chunkStack.length > 0) {
      const prevStack = [...chunkStack];
      const prevChunk = prevStack.pop();
      setChunkStack(prevStack);
      setChunkId(prevChunk === "" ? undefined : prevChunk);
      setOffset(0);
    }
    setSelectedIds(new Set());
  };

  const canGoNext = metadata ? (
    debouncedQuery 
      ? contents.length === LIMIT 
      : (offset + LIMIT < metadata.chunkTotalItems || !!metadata.nextChunkId)
  ) : false;

  const canGoPrev = debouncedQuery ? offset > 0 : (offset > 0 || chunkStack.length > 0);

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

  const allInViewSelected = contents.length > 0 && contents.every((c: Content) => selectedIds.has(c.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Contents</h1>
        <div className="w-full md:w-auto">
           <CreateContentModal 
             onContentCreated={handleRefresh} 
             trigger={
               <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium shadow-sm active:scale-95">
                 <Plus size={16} />
                 New Content
               </button>
             }
           />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text" 
            placeholder="Search content semantically..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter */}
        <button 
          onClick={openFilterDialog}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border shadow-sm transition-colors ${
            isFiltering 
              ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
              : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          <Filter size={16} />
          {isFiltering ? `Filtered (${activeFilterTagIds.length})` : "Filter"}
        </button>
        
        {isFiltering && (
          <button onClick={clearFilter} className="hidden sm:block p-2 text-zinc-500 hover:text-zinc-700 border border-transparent hover:bg-zinc-100 rounded-lg">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
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
      )}

      {/* Content List */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header - Hidden on small mobile if desired, but kept for "Select All" */}
        <div className="flex items-center gap-4 px-4 sm:px-6 py-3 border-b border-zinc-100 bg-zinc-50/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <div className="flex items-center">
             <button onClick={handleSelectAllInView} className="hover:text-zinc-800 p-1 -ml-1">
               {allInViewSelected ? <CheckSquare size={18} /> : <Square size={18} />}
             </button>
          </div>
          <div>Contents</div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Loading contents...</div>
        ) : error ? (
           <div className="p-12 text-center text-red-500 text-sm">Failed to load content.</div>
        ) : contents.length === 0 ? (
          <div className="p-16 text-center">
             <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
                <Search size={18} />
             </div>
             <p className="text-zinc-900 font-medium text-sm">No contents found</p>
             <p className="text-zinc-500 text-xs mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {contents.map((content: Content) => (
              <div 
                key={content.id} 
                className={`group flex items-start gap-3 sm:gap-4 px-4 sm:px-6 py-4 transition-colors ${
                  selectedIds.has(content.id) ? "bg-indigo-50/30" : "hover:bg-zinc-50"
                }`}
              >
                {/* Checkbox */}
                <div className="pt-0.5 shrink-0">
                  <button 
                    onClick={() => handleToggleSelection(content.id)}
                    className={`p-1 -ml-1 text-zinc-400 hover:text-zinc-600 ${selectedIds.has(content.id) ? "text-indigo-600" : ""}`}
                  >
                    {selectedIds.has(content.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </div>
                
                {/* Content Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Link 
                      to={`/content/${content.id}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-indigo-600 cursor-pointer leading-snug"
                    >
                      {content.title || "Untitled"}
                    </Link>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500 mt-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200">
                      {content.contentType}
                    </span>
                    <span>{new Date(content.updatedAt || content.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
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
                            <EditContentModal 
                               content={content} 
                               onContentUpdated={handleRefresh} 
                               trigger={
                                  <div className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-zinc-100 rounded-sm cursor-pointer">
                                     <span>Edit</span>
                                  </div>
                               }
                            />
                         </div>
                         <DropdownMenuItem onClick={() => handleDelete(content.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            Delete
                         </DropdownMenuItem>
                      </DropdownMenuContent>
                   </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {(contents.length > 0 || offset > 0) && (
          <div className="px-4 sm:px-6 py-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {offset + 1}-{Math.min(offset + LIMIT, metadata?.chunkTotalItems || 0)} of {metadata?.chunkTotalItems || 0}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={!canGoPrev || isLoading}
                className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-transform"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext || isLoading}
                className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-transform"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter by Tags</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <TagSelector 
              selectedTagIds={pendingTagIds} 
              onToggleTag={togglePendingTag} 
            />
          </div>
          <DialogFooter>
            <button 
              onClick={() => setIsFilterDialogOpen(false)} 
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button 
              onClick={applyFilter} 
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800"
            >
              Apply Filters
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contents;
