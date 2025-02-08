import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center p-8 pb-20 gap-12 sm:p-20">
      <main className="flex flex-col items-center gap-12 max-w-4xl text-center">
        {/* Title and Caption */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">
            ATM
          </h1>
          <p className="text-xl text-muted-foreground">
            Agent Tool Manager
          </p>
        </div>

        {/* Search */}
        <div className="w-full max-w-lg relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            type="search"
            placeholder="Search tools..."
            className="w-full pl-10"
          />
        </div>

        {/* Introduction */}
        <div className="space-y-4 max-w-2xl">
          <p className="text-muted-foreground text-lg">
            Discover, publish, and manage AI tools in one place. ATM is your package registry for AI tools, making it easy to find and share tools that enhance your AI workflows.
          </p>
        </div>

        {/* Featured Section */}
        <div className="w-full space-y-6">
          <h2 className="text-2xl font-semibold text-left">
            Featured Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTools.map((tool) => (
              <Link key={tool.id} href={`/tools/${tool.id}`} className="block group">
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary transition-colors">{tool.name}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

const featuredTools = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Send emails programmatically through Gmail API with advanced templating and attachment support"
  },
  {
    id: "slack",
    name: "Slack",
    description: "Post messages, files, and interactive components to Slack channels and direct messages"
  },
  {
    id: "github",
    name: "GitHub",
    description: "Create, update, and manage GitHub issues and pull requests across repositories"
  }
]
