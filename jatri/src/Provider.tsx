'use client'
import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import React from 'react'
import { MotionConfig } from 'framer-motion'

interface ProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

function Provider({ children, session }: ProviderProps) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </SessionProvider>
  )
}

export default Provider
