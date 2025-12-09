import { FaGoogle } from 'react-icons/fa';
import { supabase } from '../lib/supabase';

export default function GoogleSignInButton() {
  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: import.meta.env.VITE_FRONTEND_URL || window.location.origin + '/auth/callback',
          skipBrowserRedirect: false
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error.message);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 font-medium py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
    >
      <FaGoogle className="text-red-500" />
      Continue with Google
    </button>
  );
}