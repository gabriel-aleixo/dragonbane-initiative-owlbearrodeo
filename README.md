# Dragonbane Initiative Tracker

An Owlbear Rodeo extension that implements the Dragonbane RPG initiative system. Manage combat turns using a card-based initiative mechanic where participants can act or swap their position in the turn order.

## Installation

1. Open Owlbear Rodeo and go to your profile
2. Click "Add Extension"
3. Enter the extension URL: `[YOUR_HOSTED_URL]/manifest.json`

## How It Works

The Dragonbane initiative system uses a virtual deck of 10 cards numbered 1-10:

- At the start of each round, participants draw cards from the deck
- Turn order goes from **lowest** (1) to **highest** (10)
- On your turn, you can **Act** (take your turn) or **Swap** (exchange cards with someone else)

### Swap Rules

- You can only swap with participants who haven't acted yet
- You can only swap with participants who have a higher initiative number
- After swapping, you're marked as "Waited" and can no longer be a swap target
- NPCs/monsters (GM-controlled) cannot initiate swaps, but can be swap targets

## Usage Guide

### For Game Masters

#### Starting Combat
1. Select tokens on the map that will participate in combat
2. Open the Dragonbane Initiative extension
3. Click **"Start Combat"**

#### Drawing Phase
- Each player draws their own card by clicking **"Draw"** next to their character
- Use **"Draw All Cards"** to auto-assign cards to participants who haven't drawn
- Click **"Start Round"** once all cards are drawn

#### Managing Combat
- **Add Participants**: Select new tokens and click "Add Participants" (only during drawing phase)
- **Remove Participants**: Click the ✕ button next to any participant (anytime)
- **End Combat**: Click "End Combat" to clear all combat state

#### Round Completion
When all participants have acted, click **"Draw New Round"** to start fresh draws.

### For Players

#### Drawing Phase
- Click **"Draw"** next to your character to draw an initiative card
- Wait for the GM to start the round

#### Your Turn
When your character is highlighted as active:
- Click **"Act"** to complete your turn
- Click **"Swap"** to exchange initiative with another participant (see swap rules above)

## Interface Guide

| Symbol | Meaning |
|--------|---------|
| Card with number | Initiative value (lower acts first) |
| Card with "?" | Card not yet drawn |
| Highlighted row | Currently active turn |
| Dimmed row | Already acted this round |
| Teal left border | "Waited" status (swapped, cannot be swap target) |

## Status Indicators

- **Drawing** - Participants are drawing initiative cards
- **Active** - Combat round in progress
- **Complete** - All participants have acted, ready for new round

---

## For Developers

### Tech Stack

- React 18 + TypeScript
- Vite
- Owlbear Rodeo SDK

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/dragonbane-initiative-owlbearrodeo.git
cd dragonbane-initiative-owlbearrodeo

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development

Run the dev server and add the extension to Owlbear Rodeo:

```
http://localhost:5173/manifest.json
```

### Build

```bash
npm run build
```

Output will be in the `dist/` folder.

### Deployment

Deploy the `dist/` folder to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

Users install by adding your hosted manifest URL.

### Project Structure

```
├── public/
│   ├── manifest.json    # Extension manifest
│   └── icon.svg         # Extension icon
├── src/
│   ├── App.tsx          # Main component
│   ├── App.css          # Styles
│   ├── main.tsx         # Entry point
│   └── types.ts         # TypeScript interfaces
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Key APIs Used

| Feature | Owlbear Rodeo API |
|---------|-------------------|
| Role detection | `OBR.player.getRole()` |
| Token selection | `OBR.player.getSelection()` |
| State persistence | `OBR.room.setMetadata()` / `getMetadata()` |
| State sync | `OBR.room.onMetadataChange()` |
| Token deletion watch | `OBR.scene.items.onChange()` |
| Theme support | `OBR.theme.getTheme()` |
| Notifications | `OBR.notification.show()` |

### Data Storage

Combat state is stored in Room Metadata under the key `com.dragonbane-initiative/combat-state`. This persists across page refreshes and scene changes.

## License

MIT
