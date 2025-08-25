#!/usr/bin/env node

// Quick setup script for Convention Room Calculator
console.log('🚀 Convention Room Calculator - Setup Script');
console.log('==========================================\n');

const fs = require('fs');
const path = require('path');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file from .env.example');
        console.log('📝 Please edit .env file with your Supabase credentials\n');
    } else {
        console.log('❌ .env.example file not found');
    }
} else {
    console.log('✅ .env file already exists\n');
}

// Check if package.json exists
const packagePath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packagePath)) {
    console.log('❌ package.json not found. Please run this script from the project root.');
    process.exit(1);
}

console.log('📋 Next Steps:');
console.log('1. Edit .env file with your Supabase credentials');
console.log('2. Run: npm install');
console.log('3. Run: npm run dev (for local development)');
console.log('4. Follow DEPLOYMENT.md for production deployment\n');

console.log('🔗 Useful Links:');
console.log('- Supabase: https://supabase.com');
console.log('- Vercel: https://vercel.com');
console.log('- Deployment Guide: ./DEPLOYMENT.md\n');

console.log('🎉 Setup complete! Happy coding!');