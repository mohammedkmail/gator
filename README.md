# Gator

Gator is a CLI RSS feed aggregator built with TypeScript, Node.js, PostgreSQL, and Drizzle ORM.

## Requirements

- Node.js
- npm
- PostgreSQL
- Git

## Setup

Install dependencies:

```bash
npm install
```

Create a PostgreSQL database named `gator`.

Create `~/.gatorconfig.json`:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable"
}
```

Run migrations:

```bash
npx drizzle-kit migrate
```

## Commands

```bash
npm run start register <username>
npm run start login <username>
npm run start users
npm run start addfeed <name> <url>
npm run start feeds
npm run start follow <url>
npm run start following
npm run start unfollow <url>
npm run start agg 10s
npm run start browse
npm run start browse 10
```

## Tech Stack

- TypeScript
- Node.js
- PostgreSQL
- Drizzle ORM
- fast-xml-parser
