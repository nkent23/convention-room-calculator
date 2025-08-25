# Deployment Guide: Supabase + Vercel

## 📋 Prerequisites

1. **GitHub Account** (free)
2. **Supabase Account** (free tier available)
3. **Vercel Account** (free tier available)
4. **Domain Name** (optional, ~$10-15/year)

## 🚀 Step-by-Step Deployment

### Phase 1: Supabase Setup (Database)

#### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login
3. Click "New Project"
4. Fill in:
   - **Name**: `convention-room-calculator`
   - **Database Password**: Generate strong password (SAVE IT!)
   - **Region**: Choose closest to your users
5. Click "Create new project" (takes ~2 minutes)

#### 2. Set Up Database Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste the entire SQL schema from the main guide
3. Click "Run" to create all tables

#### 3. Get Your Credentials
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon public key**: `eyJ0eXAiOiJKV1QiLCJhbGc...` (long string)

### Phase 2: Code Updates

#### 1. Update Supabase Configuration
1. Open `js/supabase-config.js`
2. Replace these lines:
   ```javascript
   this.supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your Project URL
   this.supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon key
   ```

#### 2. Create Environment File
1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Phase 3: GitHub Setup

#### 1. Create Repository
1. Go to [github.com](https://github.com)
2. Click "New repository"
3. Name: `convention-room-calculator`
4. Make it **Public** (required for Vercel free tier)
5. Click "Create repository"

#### 2. Upload Your Code
```bash
# In your project folder
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/convention-room-calculator.git
git push -u origin main
```

### Phase 4: Vercel Deployment

#### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Import Project"
4. Select your `convention-room-calculator` repository
5. Click "Import"

#### 2. Configure Environment Variables
1. In Vercel dashboard, go to **Settings** → **Environment Variables**
2. Add these variables:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Supabase Project URL
   - **Environment**: Production, Preview, Development
3. Add second variable:
   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value**: Your Supabase anon key
   - **Environment**: Production, Preview, Development

#### 3. Deploy
1. Click "Deploy"
2. Wait 2-3 minutes
3. Your app will be live at `https://convention-room-calculator.vercel.app`

### Phase 5: Custom Domain (Optional)

#### 1. Buy Domain
- Namecheap, GoDaddy, or Cloudflare (~$10-15/year)

#### 2. Add to Vercel
1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Follow DNS configuration instructions
4. Vercel provides SSL automatically

## 🔧 Testing Your Deployment

1. Visit your deployed URL
2. Try creating papers, moderators, chairs
3. Refresh the page - data should persist
4. Check Supabase dashboard → **Table Editor** to see your data

## 📊 Monitoring & Maintenance

### Supabase Dashboard
- Monitor database usage
- View stored data
- Check API calls

### Vercel Dashboard
- Monitor deployments
- View function logs
- Check performance metrics

## 🛠 Troubleshooting

### Common Issues

1. **"Supabase not configured" errors**
   - Check environment variables in Vercel
   - Ensure they're set for all environments

2. **CORS errors**
   - Check Supabase URL is correct
   - Ensure anon key has proper permissions

3. **Data not saving**
   - Check browser console for errors
   - Verify database schema is created correctly

4. **Site not loading**
   - Check Vercel deployment logs
   - Ensure all files are committed to GitHub

### Getting Help

1. **Supabase**: [docs.supabase.com](https://docs.supabase.com)
2. **Vercel**: [vercel.com/docs](https://vercel.com/docs)
3. **GitHub Issues**: Create issues in your repository

## 💰 Costs

- **Supabase Free Tier**: 500MB database, 2GB bandwidth/month
- **Vercel Free Tier**: 100GB bandwidth/month, custom domains
- **Domain**: ~$10-15/year
- **Total**: ~$1-2/month for small to medium usage

## 🚀 Going Live

Once deployed:
1. Share your custom domain
2. Test all features thoroughly
3. Monitor usage in both dashboards
4. Consider upgrading plans as usage grows

Your Convention Room Calculator is now live with persistent data storage!