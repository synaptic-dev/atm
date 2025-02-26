import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from "next/link"
import { ToolGrid } from '@/components/tool-grid'
import { getTools } from '@/lib/supabase/tools'
import { CodeBlock } from '@/components/CodeBlock'

// Revalidate the page every hour
export const revalidate = 3600;

export default async function Home() {
  const tools = await getTools(10);

  return (
    <div className="container max-w-7xl mx-auto px-4 py-16">
      {/* Hero Section */}
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          ATM
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Create, share and discover agent tools on ATM.
        </p>
        <div className="max-w-sm mx-auto mb-6">
          <CodeBlock 
            code="npm install @synaptic-ai/atm"
            language="bash"
          />
        </div>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link href="/tools">
            <Button size="lg" className="gap-2">
              Browse Tools
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="outline" size="lg">
              Read Documentation
            </Button>
          </Link>
        </div>
      </div>

      {/* Tools Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Latest</h2>
          <Link href="/tools" className="text-sm text-gray-500 hover:text-gray-700">
            View all →
          </Link>
        </div>
        <ToolGrid tools={tools} />
      </section>
    </div>
  )
}
