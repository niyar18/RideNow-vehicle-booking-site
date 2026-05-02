'use client'

import { AppDispatch } from '@/redux/store'
import { setUserData } from '@/redux/userSlice'
import axios from 'axios'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

function useGetMe(enabled: boolean) {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    if (!enabled) return // ✅ SAFE

    let cancelled = false

    const getMe = async () => {
      try {
        const result = await axios.get('/api/me')
        console.log(result)
        if (!cancelled) {
          dispatch(setUserData(result.data))
        }
      } catch (error) {
        console.error('GET ME FAILED:', error)
      }
    }

    getMe()

    return () => {
      cancelled = true
    }
  }, [enabled, dispatch])
}

export default useGetMe