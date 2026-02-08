# Vercel Deployment Setup Guide

## ✅ Step 1: Connect Database (DONE)
You've already connected the **neon-lime-book** database to your Vercel project.

## 🔐 Step 2: Add Environment Variables

Go to your Vercel project → Settings → Environment Variables and add:

### Required Variables:

1. **SESSION_SECRET**
   ```bash
   # Generate with this command:
   openssl rand -base64 32
   ```
   - Scope: Production, Preview, Development
   - Value: (paste the generated random string)

2. **ADMIN_EMAILS**
   - Scope: Production, Preview, Development
   - Value: `your-email@example.com` (your actual email)

3. **SETUP_SECRET**
   ```bash
   # Generate with this command:
   openssl rand -base64 32
   ```
   - Scope: Production, Preview, Development
   - Value: (paste the generated random string)
   - **IMPORTANT: Save this value!** You'll need it to seed the database.

### Optional (for email alerts - can add later):
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM

## 🚀 Step 3: Deploy

After adding environment variables:
1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment
3. Wait for it to complete

## 🌱 Step 4: Seed the Database

After your first successful deployment, run this command **once**:

```bash
curl -X POST https://your-app-name.vercel.app/api/setup \
  -H "Authorization: Bearer YOUR-SETUP-SECRET-HERE"
```

Replace:
- `your-app-name.vercel.app` with your actual Vercel URL
- `YOUR-SETUP-SECRET-HERE` with the SETUP_SECRET you generated

You should get a response like:
```json
{
  "success": true,
  "message": "Colleges seeded successfully",
  "colleges": 5
}
```

## 🗑️ Step 5: Remove Setup Endpoint (Security)

After seeding is complete, delete the setup endpoint for security:
```bash
rm -rf app/api/setup
```

Then commit and push to remove it from production.

## ✅ Done!

Your app should now be live with all 5 colleges available!

## Troubleshooting

If you get errors:
1. Check Vercel logs in the deployment details
2. Make sure all environment variables are set
3. Make sure the database connection is working
4. Try redeploying after adding env vars
