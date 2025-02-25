import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { getTools } from "@/lib/s3"
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

// Make the page dynamic to ensure we get fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Home() {
  return (
    <div className="container mx-auto py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-6xl font-bold mb-6">
          AI Tool Manager
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Discover, manage, and integrate AI tools seamlessly into your applications.
          ATM provides a unified interface for working with AI capabilities.
        </p>
        <div className="flex items-center justify-center gap-4">
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
    </div>
  )
}

const featuredTools = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Access and manage Google Calendar events and schedules programmatically"
  },
  {
    id: "hello-world",
    name: "Hello World",
    description: "A simple tool to demonstrate the basics of ATM tools"
  }
]
