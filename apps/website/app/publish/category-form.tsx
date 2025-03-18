"use client";

import { useState } from "react";
import { confirmPublish } from "./actions";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type Database } from "@/types/supabase";

// Define tool category type from Supabase database
type ToolCategory = Database["public"]["Enums"]["tool_categories"];

interface CategoryFormProps {
  categories: ToolCategory[];
}

export default function CategoryForm({ categories }: CategoryFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | "">(
    "Uncategorized",
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedCategory) {
      alert("Please select a category for your tool");
      return;
    }

    const formData = new FormData();
    formData.append("category", selectedCategory);

    confirmPublish(formData);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="category">Select a category for your tool</Label>
        <Select
          value={selectedCategory}
          onValueChange={(value: ToolCategory) => setSelectedCategory(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Choose the most relevant category for your tool to help users discover
          it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <Button type="submit" className="w-full" disabled={!selectedCategory}>
          <Upload className="mr-2 h-4 w-4" />
          Publish Tool
        </Button>
      </form>
    </div>
  );
}
