# AutoPost Studio 🚀

AutoPost Studio is a powerful, AI-driven social media management tool designed to automate content creation and publishing for Facebook Pages. Built with React 19, Vite 7, and Supabase.

## ✨ Features

- **AI Text Generation**: Create engaging posts using OpenAI or xAI models.
- **AI Image Generation**: Generate stunning visuals using DALL-E, automatically mirrored to cloud storage.
- **Facebook Integration**: Manual and scheduled publishing via the Facebook Graph API.
- **Client-Side Scheduler**: Background automation while the app is active.
- **Supabase Backend**: Real-time draft persistence and cloud media storage.
- **Hybrid Storage**: Works online with Supabase or offline with local persistence.

---

## 🛠️ Local Setup

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd autopost-studio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   Copy `.env.example` to `.env` and fill in your Supabase credentials.
   ```bash
   cp .env.example .env
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

---

## ☁️ Supabase Setup

1. **Create a new Project** on [Supabase](https://supabase.com).
2. **Run Schema Setup**:
   Copy the contents of `supabase-setup.sql` into the Supabase SQL Editor and run it. This creates the `posts` and `app_settings` tables with appropriate RLS policies.
3. **Configure Storage**:
   - Create a new bucket named `generated-images`.
   - Set the bucket to **Public** (or configure custom RLS policies to allow anonymous/authenticated read/write).

---

## 📱 Facebook App Setup

To enable publishing, you need a Facebook Developer account and a configured App:

1. **Create an App**: Select "Business" or "Other" and follow the setup.
2. **Add Products**: Add the "Facebook Login for Business" and "Graph API Explorer".
3. **Required Permissions**:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_show_list`
4. **Generate Tokens**:
   - Get your **Page ID** and a **Page Access Token** from the Graph API Explorer or your App settings.
   - Enter these into the **Settings** tab in AutoPost Studio.

---

## 🚀 Deployment (Vercel)

1. **Connect to GitHub**: Push your code to a GitHub repository.
2. **Import Project**: On [Vercel](https://vercel.com), import the repository.
3. **Configure Environment Variables**:
   Add the following variables in the Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (Optional) `VITE_OPENAI_API_KEY`
   - (Optional) `VITE_XAI_API_KEY`
4. **Deploy**: Click deploy. Vercel will build and host your React SPA.

---

## 📋 Deployment Checklist

- [ ] Supabase project created.
- [ ] `supabase-setup.sql` executed in SQL Editor.
- [ ] `generated-images` storage bucket created and public.
- [ ] Facebook Page ID and Access Token generated.
- [ ] Vercel Environment Variables configured.
- [ ] Verified "Create -> Save -> Publish" flow on the live URL.

---

## 🕒 Production Scheduler (24/7 Automation)

AutoPost Studio includes a Supabase Edge Function to process scheduled posts even when the browser is closed.

1. **Deploy Edge Function**:
   Use the Supabase CLI to deploy the function:
   ```bash
   supabase functions deploy process-scheduled-posts
   ```
2. **Set Supabase Secrets**:
   Configure the required secrets in the Supabase dashboard or via CLI:
   - `CRON_SECRET`: A long random string to secure the endpoint.
   - `SUPABASE_URL`: Your project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (found in API settings).
3. **Configure GitHub Actions**:
   In your GitHub Repository, go to **Settings -> Secrets and variables -> Actions** and add:
   - `SUPABASE_FUNCTION_URL`: The URL of your deployed Edge Function.
   - `CRON_SECRET`: The same secret you set in Supabase.

The GitHub Action is configured to trigger every **30 minutes**. You can also trigger it manually from the "Actions" tab in your repository.

---

## ⚠️ Important Limitations

- **Browser-Side Scheduler**: By default, automation runs in the browser. You must keep the tab open for it to trigger.
- **Server-Side Scheduler**: Once the Edge Function and GitHub Action are configured, automation works 24/7.
- **Mock Mode**: Ensure `facebookPublishMode` is set to `live` in your App Settings to post real content.

---

## 📄 License
MIT

---
*Built with ❤️ by AutoPost Studio Team*
