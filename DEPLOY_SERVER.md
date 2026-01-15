# Deploying the Socket.io Server

Since your frontend is on Netlify (which works great for static apps), you need a separate "active" server for the real-time multiplayer backend. Netlify Functions are stateless and will not work well for this Socket.io setup.

I recommend using **Render** or **Railway** (both have free tiers or low-cost options).

## Option 1: Render (Free Tier available)

1.  **Push your code to GitHub** (ensure the `server` folder is included).
2.  **Create a New Web Service** on Render.
3.  **Connect your GitHub repo**.
4.  **Settings**:
    *   **Root Directory**: `server`
    *   **Build Command**: `npm install && npm run build` (or just `npm install` if using ts-node in prod, but compiling is better)
    *   **Start Command**: `npm start`
5.  **Environment Variables**:
    *   Add `PORT` = `3001` (or let Render assign one automatically, our code handles it).
6.  **Deploy**. Render will give you a URL (e.g., `https://my-game-server.onrender.com`).

## Option 2: Railway

Similar to Render, but often easier "zero-config".
1.  Connect GitHub.
2.  Point to the `server` directory.
3.  Deploy.

## Post-Deployment (Frontend Configuration)

Once your server is running and you have the URL:

1.  Go to your **Netlify Dashboard** > **Site Settings** > **Environment Variables**.
2.  Add a new variable:
    *   Key: `VITE_SERVER_URL`
    *   Value: `https://your-deployed-server-url.com` (no trailing slash)
3.  **Re-deploy** your Netlify site.

Your frontend will now connect to your real live server instead of localhost.
