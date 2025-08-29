import { supabase } from './supabase'

export interface Profile {
  id: string
  name: string | null
  birth_date: string | null
  gender: 'male' | 'female' | 'other' | null
  country: string | null
  interests: string[] | null
  invite_code: string | null
  profile_picture: string | null
  completed: boolean 
  created_at: string
}

export interface Couple {
  id: number
  user1_id: string
  user2_id: string | null
  created_at: string
}

export const profileService = {
  // Create a new profile
  async createProfile(profileData: Partial<Profile>): Promise<{ data: Profile | null; error: any }> {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single()

    return { data, error }
  },

  // Get profile by user ID
  async getProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return { data, error }
  },

  // Update profile
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<{ data: Profile | null; error: any }> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  },

  // Create or update couple relationship
  async createCouple(user1Id: string, user2Id?: string | null): Promise<{ data: Couple | null; error: any }> {
    const coupleData: any = {
      user1_id: user1Id,
    }
    
    // Only add user2_id if it's provided and not null/empty
    if (user2Id && user2Id.trim() !== '') {
      coupleData.user2_id = user2Id
    }
    
    const { data, error } = await supabase
      .from('couples')
      .insert([coupleData])
      .select()
      .single()

    return { data, error }
  },

  // Get couple by user ID
  async getCouple(userId: string): Promise<{ data: Couple | null; error: any }> {
    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single()

    return { data, error }
  },

  // Generate unique invite code
  async generateInviteCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code: string
    let isUnique = false

    do {
      code = ''
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }

      // Check if code is unique
      const { data } = await supabase
        .from('profiles')
        .select('invite_code')
        .eq('invite_code', code)
        .single()

      isUnique = !data
    } while (!isUnique)

    return code
  },

  // Find profile by invite code
  async findProfileByInviteCode(inviteCode: string): Promise<{ data: Profile | null; error: any }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()

    return { data, error }
  },

  // Add partner to existing couple
  async addPartnerToCouple(coupleId: number, partnerId: string): Promise<{ data: Couple | null; error: any }> {
    const { data, error } = await supabase
      .from('couples')
      .update({ user2_id: partnerId })
      .eq('id', coupleId)
      .select()
      .single()

    return { data, error }
  }
}
