import { SignUpForm } from '@/components/auth/SignUpForm';

export const metadata = {
  title: 'Sign Up - VibeFC',
  description: 'Create a new VibeFC account',
};

export default function SignUpPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <SignUpForm />
    </div>
  );
} 