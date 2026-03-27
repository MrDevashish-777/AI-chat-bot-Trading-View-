import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { Button, buttonVariants } from '@/components/ui/button'

export function MissingApiKeyBanner({
  missingKeys
}: {
  missingKeys: string[]
}) {
  if (!missingKeys.includes('OPENAI_API_BASE')) {
    return null
  }

  return (
    <div className="border p-4">
      <div className="text-red-700 font-medium">
        You need to set OPENAI_API_BASE pointing to your local model.
      </div>
      <p className="text-sm text-red-800">
        Please ensure your local Docker container (e.g. Ollama) is running and your .env file is configured correctly.
      </p>
    </div>
  )
}
