import React, { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Check } from "lucide-react";
import api from "@/lib/api";

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

interface TagSelectorProps {
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
}

const LIMIT = 5;

const TagSelector: React.FC<TagSelectorProps> = ({ selectedTagIds, onToggleTag }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [offset, setOffset] = useState(0);
  const [chunkId, setChunkId] = useState<string | undefined>(undefined);
  const [chunkStack, setChunkStack] = useState<string[]>([]); // To go back to previous chunks
  const [metadata, setMetadata] = useState<PaginationMetadata | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setOffset(0);
      setChunkId(undefined);
      setChunkStack([]);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTags = async (currentOffset: number, currentChunkId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: currentOffset.toString(),
      });
      if (currentChunkId) params.append("chunkId", currentChunkId);
      if (debouncedQuery) params.append("q", debouncedQuery);

      const response = await api.get(`/tag?${params.toString()}`);
      setTags(response.data.data || []);
      setMetadata(response.data.metadata);
    } catch (err: any) {
      console.error("Failed to fetch tags:", err);
      if (err.response?.status === 429) {
        setError("Rate limit exceeded.");
      } else {
        setError("Failed to load tags.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags(offset, chunkId);
  }, [offset, chunkId]);

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
  };

  const canGoNext = metadata ? (
    debouncedQuery 
      ? offset + LIMIT < metadata.chunkTotalItems 
      : (offset + LIMIT < metadata.chunkTotalItems || !!metadata.nextChunkId)
  ) : false;

  const canGoPrev = debouncedQuery ? offset > 0 : (offset > 0 || chunkStack.length > 0);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-zinc-50 p-2 rounded-lg border border-zinc-200 shadow-sm">
        <div className="flex-1 flex items-center gap-2 px-2">
          <Search size={16} className="text-zinc-400" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 placeholder-zinc-400"
          />
        </div>
      </div>

      {/* Tags List */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden min-h-[300px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-zinc-400">Loading tags...</div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button 
              onClick={() => fetchTags(offset, chunkId)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : tags.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-4">
            <p className="text-sm">{debouncedQuery ? "No tags match your search." : "No tags found."}</p>
          </div>
        ) : (
          <div className="flex-1 divide-y divide-zinc-50">
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <div
                  key={tag.id}
                  onClick={() => onToggleTag(tag.id)}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? "bg-indigo-50" : "hover:bg-zinc-50"
                  }`}
                >
                  <div>
                    <h3 className={`text-sm font-medium ${isSelected ? "text-indigo-900" : "text-zinc-900"}`}>
                      {tag.name}
                    </h3>
                    {tag.semantic && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{tag.semantic}</p>}
                  </div>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300 bg-white"
                  }`}>
                      {isSelected && <Check size={12} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {tags.length > 0 && (
          <div className="border-t border-zinc-100 px-4 py-2 flex items-center justify-between bg-zinc-50/50">
            <span className="text-[10px] text-zinc-500">
              {offset + 1}-{Math.min(offset + LIMIT, metadata?.chunkTotalItems || 0)} of {metadata?.chunkTotalItems || 0} {debouncedQuery ? "matches" : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={!canGoPrev || isLoading}
                className="p-1 rounded hover:bg-white hover:shadow-sm border border-transparent hover:border-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-zinc-600"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext || isLoading}
                className="p-1 rounded hover:bg-white hover:shadow-sm border border-transparent hover:border-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all text-zinc-600"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagSelector;
