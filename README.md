# Two to Tango

An offline PWA for practising the [LinkedIn Tango](https://www.linkedin.com/games/tango/) puzzle game.

## Rules

Fill a 6 × 6 grid with suns ☀️ and moons 🌙 so that:

- Every row and column contains exactly **3 suns** and **3 moons**
- No **3 or more** of the same symbol appear consecutively in any row or column
- **= (same)** markers mean the two neighbouring cells must hold the same symbol
- **× (different)** markers mean the two neighbouring cells must hold different symbols

## Features

- Three difficulty levels — Easy, Medium, Hard
- Puzzle generator with unique-solution guarantee
- Running timer that replaces itself with your solve time on completion
- Solve history (last 5 times per difficulty, stored locally)
- Light / dark theme toggle
- Installable PWA — works fully offline

## Tech

Plain HTML, CSS, and vanilla JavaScript — no framework, no build step.  
Deployed as a static site on [Vercel](https://vercel.com).

## Development

```bash
npm start        # local Express server at http://localhost:3000
```

Static files are served from `public/`. `vercel.json` points Vercel at the same directory.
