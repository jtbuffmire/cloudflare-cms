# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.


DONE
Database (D1): ✅ Set up and migrated
Database binding is configured in wrangler.toml
Schema has been applied
SESSIONS namespace created and configured in wrangler.toml

To do 
[] Copy these routes to the new project structure
[] Convert the API endpoints to SvelteKit server routes
[] Set up the necessary configurations (environment variables, database connections, etc.)

[] Install the necessary dependencies
[] Set up the styling (Tailwind CSS and Skeleton)
[] Convert the API endpoints to SvelteKit server routes
[] Set up authentication
[] Configure the database connections
[] Implement the actual API functionality
[] Add more UI features
Set up the database connections next?
Implement authentication with session handling?
Add more frontend features?
Something else?

Environment variables
Database (D1) connection
R2 storage for picture files
Authentication/session handling

# Created cms-admin 
wrangler pages project create cms-admin


# To deploy cms-admin 
wrangler pages deploy dist/admin --project-name cms-admin