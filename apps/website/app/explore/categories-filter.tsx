"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { type Database } from "@/types/supabase";

type ToolCategory = Database["public"]["Enums"]["tool_categories"];

interface CategoriesFilterProps {
  categories: ToolCategory[];
  selectedCategory?: ToolCategory;
}

// Special value for "All Categories" option
const ALL_CATEGORIES = "all_categories";

export default function CategoriesFilter({
  categories,
  selectedCategory,
}: CategoriesFilterProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleCategoryChange = (value: string) => {
    // Get current URL search params
    const params = new URLSearchParams(window.location.search);

    // Set or remove the category parameter
    if (value === ALL_CATEGORIES) {
      // Remove the category param for "All Categories"
      params.delete("category");
    } else {
      params.set("category", value);
    }

    // Update URL with the new search params
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <Filter className="h-4 w-4 mr-2" />
        <Select
          value={selectedCategory || ALL_CATEGORIES}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearFilters}
          className="h-8 w-8"
          title="Clear filters"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
