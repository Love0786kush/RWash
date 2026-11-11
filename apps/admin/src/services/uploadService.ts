import { supabase } from '../lib/supabase'

export const uploadService = {
  async uploadImage(file: File, folder: 'services' | 'banners' | 'campaigns' | 'branding' = 'services'): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('rwash-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('rwash-images')
      .getPublicUrl(fileName)

    return data.publicUrl
  },
}

