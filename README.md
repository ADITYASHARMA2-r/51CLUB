# AI Coder Studio

A powerful prompt-to-code assistant for developers.

## What it does
- You describe any software idea (website, SaaS, API, or game).
- The AI returns architecture, file structure, and code blocks.
- If no OpenAI API key is configured, it falls back to a local template generator.

## Quick start
```bash
npm install
npm start
```
Open `http://localhost:3000`

## Configure OpenAI (optional)
Create `.env`:
```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

## API
`POST /api/generate`
```json
{
  "prompt": "I want a 2D multiplayer game with login and leaderboard"
}
```
