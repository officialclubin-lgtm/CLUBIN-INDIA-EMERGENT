# CLUBIN INDIA - Quick Deployment Guide

## 🚀 One-Command Deployment

### Prerequisites:
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login
```

### Deploy:
```bash
cd /app
vercel --prod
```

### Set Environment Variables:
```bash
# MongoDB
vercel env add MONGO_URL production
# Paste: mongodb+srv://username:password@cluster.mongodb.net/

vercel env add DB_NAME production
# Paste: clubin_india

# UltraMsg WhatsApp
vercel env add ULTRAMSG_INSTANCE_ID production
vercel env add ULTRAMSG_TOKEN production

# Razorpay
vercel env add RAZORPAY_KEY_ID production
vercel env add RAZORPAY_KEY_SECRET production
```

### Redeploy with Environment Variables:
```bash
vercel --prod
```

## ✅ That's It!

Your app is live at: `https://your-app.vercel.app`

## 📱 Test Your Deployment:

1. **Backend API**:
   ```bash
   curl https://your-app.vercel.app/api/
   ```

2. **Frontend**:
   - Open browser: `https://your-app.vercel.app`
   - Test OTP login
   - Book a club entry

3. **Mobile App**:
   - Update `EXPO_PUBLIC_BACKEND_URL` in frontend/.env
   - Rebuild: `expo prebuild`
   - Test on device

## 🔄 Continuous Deployment:

- Connect GitHub repository to Vercel
- Auto-deploy on push to main branch
- Preview deployments for pull requests

## 📞 Need Help?

Check full documentation: `README_DEPLOYMENT.md`
