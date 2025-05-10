const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default API URL
const defaultApiUrl = 'http://localhost:3000/api';

console.log('VibeFC Environment Setup');
console.log('------------------------');
console.log('This script will help you set up your .env.local file for VibeFC.');
console.log('You will need your Supabase project URL and Anonymous Key.');
console.log('You can find these in your Supabase dashboard under Project Settings > API.\n');

rl.question('Enter your Supabase URL: ', (supabaseUrl) => {
  if (!supabaseUrl) {
    console.error('Error: Supabase URL is required');
    rl.close();
    return;
  }

  rl.question('Enter your Supabase Anonymous Key: ', (supabaseAnonKey) => {
    if (!supabaseAnonKey) {
      console.error('Error: Supabase Anonymous Key is required');
      rl.close();
      return;
    }

    rl.question(`Enter your API URL (default: ${defaultApiUrl}): `, (apiUrl) => {
      const finalApiUrl = apiUrl || defaultApiUrl;

      // Create .env.local content
      const envContent = `# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}

# API configuration
NEXT_PUBLIC_API_URL=${finalApiUrl}
`;

      // Write to .env.local file
      const envPath = path.join(process.cwd(), '.env.local');
      
      try {
        fs.writeFileSync(envPath, envContent);
        console.log('\nSuccess! .env.local file has been created.');
        console.log(`File path: ${envPath}`);
        console.log('\nYou can now start your application with:');
        console.log('npm run dev');
      } catch (error) {
        console.error('Error writing .env.local file:', error.message);
      }

      rl.close();
    });
  });
}); 