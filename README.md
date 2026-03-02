JPTools (also known as Justapedia Tools) is a comprehensive suite of web-based statistical, analytical, and administrative tools developed specifically for Justapedia wikis. The project is designed to transform raw wiki activity data into readable, structured, and actionable information, enabling editors, patrollers, administrators, and community members to understand how pages and users evolve over time. Rather than requiring technical knowledge or database access, JPTools provides a user-friendly interface where community members can explore contributions, review page activity, compare trends, and perform administrative evaluation using clear tables, summaries, and visual outputs.

The toolset was created and is maintained by Sourav with the objective of simplifying data visualization and analysis of user contributions on Justapedia. By presenting complex wiki data in a clear and consistent format, JPTools helps users identify editing patterns, measure productivity, detect changes in behavior, track page development, and review administrative actions in a transparent manner. The suite is intended both for everyday editorial use (such as checking edit counts or page history) and for governance and moderation tasks (such as evaluating patrolling performance or identifying suspicious editing patterns).

JPTools integrates directly with the Justapedia API to ensure accurate and up-to-date information. Through API-driven retrieval of page histories, user contributions, logs, and related metadata, JPTools enables transparent access to wiki data and supports evidence-based decision-making. This makes it a valuable resource for content maintenance, dispute resolution, contributor recognition, and overall monitoring of activity across the Justapedia ecosystem.

https://justapedia.org/wiki/Justapedia:Justapedia_Tools

## Development Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Edit `.env.local` to set your local SOCKS proxy (if needed):
   ```env
   SOCKS_PROXY=socks://localhost:1080
   ```
3. Install dependencies and run the development server:
   ```bash
   npm install
   npm run dev
   ```

## Vercel Deployment

**Important:** You **MUST** manually add the environment variable to your Vercel project settings, as `.env` files are not uploaded.

- **Key:** `SOCKS_PROXY`
- **Value:** Your actual production SOCKS5 proxy URL (e.g., `socks5://user:pass@host:port`).
