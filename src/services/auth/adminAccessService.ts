import { supabase } from '../../lib/supabase';

export const getAdminAccessStatus = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc('is_admin_user');

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
};
