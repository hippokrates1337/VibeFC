import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login - VibeFC',
  description: 'Sign in to your VibeFC account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="container flex w-screen flex-col items-center justify-center">
        <LoginForm />
      </div>
    </div>
  );
} 