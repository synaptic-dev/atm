import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hnibcchiknipqongruty.supabase.co';
// Note: This should be set in environment variables
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase client with the service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export interface UserIdentityData {
  avatar_url?: string;
  email?: string;
  email_verified?: boolean;
  full_name?: string;
  iss?: string;
  name?: string;
  preferred_username?: string;
  provider_id?: string;
  sub?: string;
  user_name?: string;
  [key: string]: string | boolean | undefined;
}

export interface UserData {
  id: string;
  email?: string;
  username?: string;
  created_at: string;
  user_metadata: UserIdentityData;
  identities?: Array<{
    id: string;
    user_id: string;
    identity_data: UserIdentityData;
    provider: string;
    created_at: string;
    updated_at: string;
  }>;
}

export async function getUserById(userId: string): Promise<UserData | null> {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    if (!data?.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at,
      user_metadata: data.user.user_metadata,
      identities: data.user.identities?.map(identity => ({
        id: identity.id,
        user_id: identity.user_id,
        identity_data: identity.identity_data || {},
        provider: identity.provider,
        created_at: identity.created_at || data.user.created_at,
        updated_at: identity.updated_at || data.user.created_at
      }))
    };
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}

export async function getUserByUsername(username: string): Promise<UserData | null> {
  try {
    // Get all users with their identities
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    console.log('users', users);

    if (error) {
      console.error('Error fetching users:', error);
      return null;
    }

    // Find user with matching GitHub username in user_metadata
    const user = users.find(user => 
      user.user_metadata?.user_name === username
    );

    if (!user) {
      console.error('No user found with GitHub username:', username);
      return null;
    }

    // Ensure required fields exist
    if (!user.user_metadata?.provider_id) {
      console.error('User metadata missing provider_id:', user);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata,
      identities: [{
        id: String(user.user_metadata.provider_id),
        user_id: user.id,
        identity_data: {
          avatar_url: user.user_metadata.avatar_url || '',
          email: user.user_metadata.email || '',
          full_name: user.user_metadata.full_name || '',
          user_name: user.user_metadata.user_name || '',
          provider_id: String(user.user_metadata.provider_id),
        },
        provider: 'github',
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      }]
    };
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return null;
  }
} 