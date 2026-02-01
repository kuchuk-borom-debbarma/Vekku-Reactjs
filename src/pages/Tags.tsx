import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tag, Search, X, Loader2, Sparkles, MoreHorizontal } from "lucide-react";
import api from "@/lib/api";
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
  _count?: {
    contents: number;
  };
}

const Tags: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: tags = [], isLoading, error } = useQuery({
    queryKey: ["tags", debouncedQuery],
    queryFn: async () => {
      const res = await api.get("/tags");
      let data: TagData[] = res.data.data || res.data;
      
      if (debouncedQuery) {
        data = data.filter(tag => 
          tag.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          tag.semantic.toLowerCase().includes(debouncedQuery.toLowerCase())
        );
      }
      return data;
    }
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;
    try {
      await api.delete(`/tags/${id}`);
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    } catch (error) {
      console.error("Failed to delete tag", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Tags</h1>
        <CreateTagModal onTagCreated={() => queryClient.invalidateQueries({ queryKey: ["tags"] })} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-white border border-zinc-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tags Grid/List */}
      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto] gap-4 px-6 py-3 border-b border-zinc-100 bg-zinc-50/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <div>Tag Details</div>
          <div className="text-right">Actions</div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
            <Loader2 className="animate-spin mb-2" size={24} />
            <p className="text-sm">Loading tags...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-sm">Failed to load tags.</div>
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
                className="group grid grid-cols-[1fr_auto] gap-4 px-6 py-4 items-center hover:bg-zinc-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-zinc-900">{tag.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-medium border border-zinc-200">
                      {tag.semantic}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Sparkles size={12} className="text-indigo-400" />
                    <span>Semantic Concept ID: {tag.id.slice(0, 8)}...</span>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditTagModal 
                          tag={tag} 
                          onTagUpdated={() => queryClient.invalidateQueries({ queryKey: ["tags"] })}
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
      </div>
    </div>
  );
};

export default Tags;
