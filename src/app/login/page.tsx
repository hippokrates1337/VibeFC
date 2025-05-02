import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login - VibeFC',
  description: 'Sign in to your VibeFC account',
};

export default function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <LoginForm />
    </div>
  );
} 