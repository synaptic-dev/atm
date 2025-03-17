"use client";

import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
        <div className="mb-6">
          <div className="bg-green-100 text-green-800 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Publication Successful!</h1>
          <p className="text-gray-600">
            Your tool is being published to OpenKit.
          </p>
        </div>

        <div className="mb-6 bg-gray-50 p-4 rounded-md text-left">
          <h2 className="font-semibold mb-2">What's next?</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-700">
            <li>The publication process will complete in the terminal</li>
            <li>
              You'll be able to manage your tools in the OpenKit dashboard
            </li>
            <li>Your tools will be available to users shortly</li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
          <button
            onClick={() => window.close()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Close Window
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
