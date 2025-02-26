'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { CodeBlock } from './CodeBlock'
import { Button } from './ui/button'

interface CopyableCodeBlockProps {
  code: string
  language: string
}

export function CopyableCodeBlock({ code, language }: CopyableCodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <CodeBlock code={code} language={language} />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 hover:bg-gray-700/50 text-gray-300 hover:text-gray-50"
        onClick={copyToClipboard}
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
} 