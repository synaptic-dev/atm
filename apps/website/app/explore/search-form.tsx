"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { FormEvent } from "react";

interface SearchFormProps {
  initialQuery?: string;
}

export default function SearchForm({ initialQuery = "" }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get("search") as string;

    // Create a new URLSearchParams instance
    const params = new URLSearchParams(searchParams.toString());

    // Update or remove the search parameter
    if (searchQuery && searchQuery.trim() !== "") {
      params.set("search", searchQuery.trim());
    } else {
      params.delete("search");
    }

    // Redirect to the updated URL
    router.push(`/explore?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="w-full md:w-1/2 lg:w-1/3">
      <div className="h-10 relative flex items-center w-full">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          name="search"
          placeholder="Search tools..."
          defaultValue={initialQuery}
          className="h-10 w-full rounded-lg border border-border/50 bg-muted/40 pl-9 pr-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>
    </form>
  );
}
