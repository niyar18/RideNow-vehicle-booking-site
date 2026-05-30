'use client'

import { useSession } from 'next-auth/react'
import useGetMe from './hooks/useGetMe'

function InitUser() {
  const { status } = useSession()

  // ✅ hook always called
  useGetMe(status === 'authenticated')

  return null
}

export default InitUser