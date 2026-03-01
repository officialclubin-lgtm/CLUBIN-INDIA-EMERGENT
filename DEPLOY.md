# CLUBIN INDIA - Deployment Guide

## Prerequisites
```bash
npm install -g vercel
vercel login
```

## Deploy to Vercel
```bash
cd /app
vercel --prod
```

## Set Environment Variables
```bash
# MongoDB Atlas connection string (required)
vercel env add MONGO_URL production

# Database name
vercel env add DB_NAME production
# Value: clubin_india

# Firebase project ID (for auth token verification)
vercel env add FIREBASE_PROJECT_ID production
# Value: clubin-india-3d02c

# Razorpay payment keys (optional, demo mode without)
vercel env add RAZORPAY_KEY_ID production
vercel env add RAZORPAY_KEY_SECRET production
```

## Redeploy after setting env vars
```bash
vercel --prod
```

## Test Deployment
```bash
# Backend health check
curl https://your-app.vercel.app/api/

# Frontend
# Open: https://your-app.vercel.app
```

## Firebase Setup
Phone Authentication is already configured with project: `clubin-india-3d02c`
Ensure the Vercel deployment domain is added to Firebase Console → Authentication → Settings → Authorized domains.

## Notes
- Backend runs as Python serverless function via `@vercel/python`
- Frontend builds as Expo web static export via `@vercel/static-build`
- Region: Mumbai (bom1) for low latency in India
