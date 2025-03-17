import Link from "next/link";
import { Github, Book } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built with ❤️ by Synaptic
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/synaptic-dev/openkit"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link
            href="https://docs.openkit.fun"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <Book className="h-5 w-5" />
            <span className="sr-only">Documentation</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
