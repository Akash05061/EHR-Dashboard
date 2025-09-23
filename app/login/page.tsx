'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: { [key: string]: string } = {
        'access_denied': 'Access was denied. Please try again.',
        'no_code': 'Authorization failed. Please try again.',
        'token_exchange_failed': 'Failed to connect to Athena. Please try again.'
      }
      setError(errorMessages[errorParam] || 'An error occurred during login.')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">EHR Dashboard</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Connect Your Clinic</h2>
          <p className="text-gray-600">
            Connect your Athena Health account to access your clinic's data securely.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Click "Connect with Athena Health" below</li>
              <li>Login with your Athena credentials</li>
              <li>Approve access to your clinic data</li>
              <li>Access your personalized dashboard</li>
            </ol>
          </div>

          <a
            href="/api/auth/athena?action=login"
            className="w-full"
          >
            <Button className="w-full py-4 text-lg">
              Connect with Athena Health
            </Button>
          </a>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Your credentials are never stored. We only access data you authorize.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}