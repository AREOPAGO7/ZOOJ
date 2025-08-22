import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { profileService } from '../lib/profileService'

export function useProfileCompletion() {
  const { user } = useAuth()
  const router = useRouter()
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsProfileComplete(false)
      setIsLoading(false)
      return
    }

    const checkProfileCompletion = async () => {
      try {
        const { data: profile, error } = await profileService.getProfile(user.id)
        
        if (error || !profile) {
          console.log('Profile not found, redirecting to setup')
          setIsProfileComplete(false)
          router.replace('/')
          return
        }

        if (!profile.completed) {
          console.log('Profile not completed, redirecting to setup')
          setIsProfileComplete(false)
          router.replace('/')
          return
        }

        console.log('Profile is completed')
        setIsProfileComplete(true)
      } catch (error) {
        console.error('Error checking profile completion:', error)
        setIsProfileComplete(false)
        router.replace('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkProfileCompletion()
  }, [user, router])

  return { isProfileComplete, isLoading }
}
