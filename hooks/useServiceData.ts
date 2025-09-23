import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Helper function to get the correct category name based on language
export const getCategoryName = (category: ServiceCategory, language: string): string => {
  // Default to French if no language specified
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return category.name_en || category.name;
    case 'ar':
      return category.name_ar || category.name;
    case 'ma':
      return category.name_ma || category.name;
    case 'fr':
    default:
      return category.name;
  }
};

// Helper function to get the correct category description based on language
export const getCategoryDescription = (category: ServiceCategory, language: string): string => {
  // Default to French if no language specified
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return category.description_en || category.description || '';
    case 'ar':
      return category.description_ar || category.description || '';
    case 'ma':
      return category.description_ma || category.description || '';
    case 'fr':
    default:
      return category.description || '';
  }
};

// Helper function to get the correct subcategory name based on language
export const getSubcategoryName = (subcategory: ServiceSubcategory, language: string): string => {
  // Default to French if no language specified
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return subcategory.name_en || subcategory.name;
    case 'ar':
      return subcategory.name_ar || subcategory.name;
    case 'ma':
      return subcategory.name_ma || subcategory.name;
    case 'fr':
    default:
      return subcategory.name;
  }
};

// Helper function to get the correct subcategory description based on language
export const getSubcategoryDescription = (subcategory: ServiceSubcategory, language: string): string => {
  // Default to French if no language specified
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return subcategory.description_en || subcategory.description || '';
    case 'ar':
      return subcategory.description_ar || subcategory.description || '';
    case 'ma':
      return subcategory.description_ma || subcategory.description || '';
    case 'fr':
    default:
      return subcategory.description || '';
  }
};

// Helper function to get the correct provider name based on language
export const getProviderName = (provider: ServiceProvider, language: string): string => {
  // Default to French if no language specified
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return provider.name_en || provider.name;
    case 'ar':
      return provider.name_ar || provider.name;
    case 'ma':
      return provider.name_ma || provider.name;
    case 'fr':
    default:
      return provider.name;
  }
};

// Helper function to get the correct provider description based on language
export const getProviderDescription = (provider: ServiceProvider, language: string): string => {
  // Default to French if no language specified
  if (!language) language = 'fr';
  
  switch (language) {
    case 'en':
      return provider.description_en || provider.description || '';
    case 'ar':
      return provider.description_ar || provider.description || '';
    case 'ma':
      return provider.description_ma || provider.description || '';
    case 'fr':
    default:
      return provider.description || '';
  }
};

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  name_en?: string;
  name_ar?: string;
  name_ma?: string;
  description_en?: string;
  description_ar?: string;
  description_ma?: string;
}

export interface ServiceSubcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  name_en?: string;
  name_ar?: string;
  name_ma?: string;
  description_en?: string;
  description_ar?: string;
  description_ma?: string;
}

export interface ServiceProvider {
  id: string;
  subcategory_id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  opening_hours?: any;
  price_range?: string;
  image_url?: string;
  website?: string;
  created_at: string;
  name_en?: string;
  name_ar?: string;
  name_ma?: string;
  description_en?: string;
  description_ar?: string;
  description_ma?: string;
}

export function useServiceCategories() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      console.log('Fetching service categories...');
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
      console.log('Categories fetched:', data?.length || 0);
      setCategories(data || []);
    } catch (err) {
      console.error('Exception fetching categories:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { categories, loading, error, refetch: fetchCategories };
}

export function useServiceSubcategories(categoryId?: string) {
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllSubcategories();
  }, []);

  const fetchAllSubcategories = async () => {
    try {
      setLoading(true);
      console.log('Fetching service subcategories...');
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching subcategories:', error);
        throw error;
      }
      console.log('Subcategories fetched:', data?.length || 0);
      setSubcategories(data || []);
    } catch (err) {
      console.error('Exception fetching subcategories:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async (catId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_subcategories')
        .select('*')
        .eq('category_id', catId)
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { subcategories, loading, error, refetch: fetchAllSubcategories };
}

export function useServiceProviders(subcategoryId?: string, city?: string) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subcategoryId) {
      fetchProviders(subcategoryId, city);
    }
  }, [subcategoryId, city]);

  const fetchProviders = async (subId: string, cityFilter?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('service_providers')
        .select('*')
        .eq('subcategory_id', subId)
        .order('name');

      // Only apply city filter if a specific city is selected (not the default placeholder)
      if (cityFilter && cityFilter !== 'Sélectionnez votre ville') {
        query = query.eq('city', cityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProviders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { providers, loading, error, refetch: fetchProviders };
}

export function useSearchSubcategories(searchTerm: string, city?: string) {
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchSubcategories(searchTerm, city);
    } else {
      setSubcategories([]);
    }
  }, [searchTerm, city]);

  const searchSubcategories = async (term: string, cityFilter?: string) => {
    try {
      setLoading(true);
      
      // First, get subcategories that match the search term
      const { data: subcategoriesData, error: subcategoriesError } = await supabase
        .from('service_subcategories')
        .select(`
          *,
          service_categories!inner(name)
        `)
        .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
        .order('name');

      if (subcategoriesError) throw subcategoriesError;

      // If city filter is applied (and not the default placeholder), check which subcategories have providers in that city
      if (cityFilter && cityFilter !== 'Sélectionnez votre ville' && subcategoriesData) {
        const subcategoryIds = subcategoriesData.map(sub => sub.id);
        
        const { data: providersData, error: providersError } = await supabase
          .from('service_providers')
          .select('subcategory_id')
          .in('subcategory_id', subcategoryIds)
          .eq('city', cityFilter);

        if (providersError) throw providersError;

        const availableSubcategoryIds = new Set(providersData?.map(p => p.subcategory_id) || []);
        const filteredSubcategories = subcategoriesData.filter(sub => 
          availableSubcategoryIds.has(sub.id)
        );
        
        setSubcategories(filteredSubcategories);
      } else {
        setSubcategories(subcategoriesData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { subcategories, loading, error };
}

export function useSearchServiceProviders(searchTerm: string, city?: string) {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchProviders(searchTerm, city);
    } else {
      setProviders([]);
    }
  }, [searchTerm, city]);

  const searchProviders = async (term: string, cityFilter?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('service_providers')
        .select(`
          *,
          service_subcategories!inner(
            name,
            service_categories!inner(name)
          )
        `)
        .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
        .order('name');

      if (cityFilter && cityFilter !== 'Sélectionnez votre ville') {
        query = query.eq('city', cityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProviders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { providers, loading, error };
}
