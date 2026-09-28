'use client'

import { useSession } from 'next-auth/react'
import useGetMe from './hooks/useGetMe'
import { useEffect } from 'react'
import { getSocket } from './lib/socket'

function InitUser() {
  const { data: session, status } = useSession()

  // ✅ hook always called
  useGetMe(status === 'authenticated')

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const socket = getSocket();
      socket.emit("identity", session.user.id);
    }
  }, [status, session]);

  return null
}

export default InitUser