'use client'

import { useSession } from 'next-auth/react'
import useGetMe from '@/shared/hooks/useGetMe'
import { useEffect } from 'react'
import { getSocket, fetchSocketToken } from './lib/socket'

function InitUser() {
  const { data: session, status } = useSession()

  // ✅ hook always called
  useGetMe(status === 'authenticated')

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      getSocket({ userId: session.user.id });
      fetchSocketToken();
    }
  }, [status, session]);

  return null
}

export default InitUser
