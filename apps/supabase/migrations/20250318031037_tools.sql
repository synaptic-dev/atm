create type "public"."tool_categories" as enum ('Uncategorized', 'Communication', 'Productivity', 'Collaboration', 'Social Media', 'Analytics', 'Finance', 'Fun', 'Utility');

alter table "public"."tools" add column "category" tool_categories;