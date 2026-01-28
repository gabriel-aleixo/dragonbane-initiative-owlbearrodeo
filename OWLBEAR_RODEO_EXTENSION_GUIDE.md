# Owlbear Rodeo Extension Development Guide

This document provides comprehensive instructions for building extensions for Owlbear Rodeo, a virtual tabletop application.

## Table of Contents

1. [Overview](#overview)
2. [Project Setup](#project-setup)
3. [Manifest File](#manifest-file)
4. [SDK Installation & Usage](#sdk-installation--usage)
5. [Extension Entry Points](#extension-entry-points)
6. [Core APIs](#core-apis)
7. [Item System](#item-system)
8. [Best Practices](#best-practices)
9. [Installing Your Extension](#installing-your-extension)

---

## Overview

Extensions in Owlbear Rodeo allow you to embed custom code to extend the functionality of the site. Extensions are loaded via iframes, meaning your extension is essentially a website that communicates with Owlbear Rodeo through the SDK.

**Key Concepts:**
- Extensions are web applications hosted externally
- Communication happens via the `@owlbear-rodeo/sdk` package
- The entry point is a `manifest.json` file describing your extension
- Extensions can add actions, context menus, tools, and background processes

---

## Project Setup

### Recommended Stack
- **Vite** - Fast build tool and dev server
- **React** - UI framework (optional but recommended)
- **TypeScript** - Type safety with full SDK type support

### Create a New Project

```bash
npm create vite@latest my-extension -- --template react-ts
cd my-extension
npm install
```

### Configure Vite for CORS

Create or update `vite.config.ts` to enable CORS (required for Owlbear Rodeo to access your site):

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    cors: true,
  },
});
```

### Development Server

```bash
npm run dev
```

Your extension will be available at `http://localhost:5173/`

---

## Manifest File

The `manifest.json` file is the entry point for your extension. Place it in your `public/` folder.

### Basic Structure

```json
{
  "name": "My Extension",
  "id": "com.myname.my-extension",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A description of what your extension does",
  "icon": "/icon.svg",
  "action": {
    "title": "My Extension",
    "icon": "/icon.svg",
    "popover": "/index.html",
    "width": 300,
    "height": 400
  }
}
```

### Manifest Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name of the extension |
| `id` | string | Unique identifier (use reverse domain notation) |
| `version` | string | Semantic version number |
| `author` | string | Author name |
| `description` | string | Brief description |
| `icon` | string | Path to extension icon (SVG recommended) |
| `action` | object | Defines the action button in the UI |
| `background` | string | URL for background script (no visible UI) |

### Action Object Properties

```json
{
  "action": {
    "title": "Extension Title",
    "icon": "/icon.svg",
    "popover": "/index.html",
    "width": 300,
    "height": 400
  }
}
```

- **title**: Text shown in the action button tooltip
- **icon**: Path to the action icon
- **popover**: URL to load in the popover when clicked
- **width/height**: Dimensions of the popover

### Background-Only Extension

For extensions without visible UI (e.g., custom tools):

```json
{
  "name": "My Tool",
  "id": "com.myname.my-tool",
  "version": "1.0.0",
  "background": "/background.html"
}
```

---

## SDK Installation & Usage

### Install the SDK

```bash
npm install @owlbear-rodeo/sdk
```

### Basic Usage

```typescript
import OBR from "@owlbear-rodeo/sdk";

// Wait for SDK to be ready before using any APIs
OBR.onReady(() => {
  console.log("Owlbear Rodeo SDK is ready!");
  // Now you can use OBR.* methods
});
```

### React Integration

```typescript
import { useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    return OBR.onReady(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return <div>Loading...</div>;
  }

  return <div>Extension Ready!</div>;
}
```

### Scene Ready Check

The scene may not be ready immediately. Use `OBR.scene.onReadyChange`:

```typescript
useEffect(() => {
  return OBR.scene.onReadyChange((ready) => {
    if (ready) {
      // Scene is ready, safe to interact with items
    }
  });
}, []);
```

---

## Extension Entry Points

### 1. Action (Popover)

Displays a button in the top-left of the room. Clicking opens a popover with your UI.

**Use Cases:**
- Settings panels
- Initiative trackers
- Character sheets
- Dice rollers

### 2. Context Menu

Adds items to the right-click context menu when items are selected.

```typescript
import OBR from "@owlbear-rodeo/sdk";

OBR.onReady(() => {
  OBR.contextMenu.create({
    id: "com.myname.my-extension/context-menu",
    icons: [
      {
        icon: "/icon.svg",
        label: "My Action",
        filter: {
          every: [{ key: "layer", value: "CHARACTER" }],
        },
      },
    ],
    onClick: (context) => {
      // Handle click, context.items contains selected items
      console.log("Selected items:", context.items);
    },
  });
});
```

**Filter Options:**
- `every`: All conditions must be true
- `some`: At least one condition must be true
- Filter by `layer`, `type`, metadata, etc.

### 3. Tool

Adds a custom tool to the toolbar (right side of screen).

```typescript
import OBR from "@owlbear-rodeo/sdk";

const ID = "com.myname.my-tool";

OBR.onReady(() => {
  // Create the tool
  OBR.tool.create({
    id: `${ID}/tool`,
    icons: [
      {
        icon: "/tool-icon.svg",
        label: "My Custom Tool",
      },
    ],
    defaultMetadata: {
      color: "red",
    },
  });

  // Create a mode for the tool
  OBR.tool.createMode({
    id: `${ID}/mode`,
    icons: [
      {
        icon: "/mode-icon.svg",
        label: "Draw Mode",
        filter: {
          activeTools: [`${ID}/tool`],
        },
      },
    ],
    onToolDragStart: (context, event) => {
      // Start drawing
    },
    onToolDragMove: (context, event) => {
      // Update drawing
    },
    onToolDragEnd: (context, event) => {
      // Finish drawing
    },
    onToolDragCancel: (context, event) => {
      // Cancel drawing
    },
  });
});
```

### 4. Background

Runs invisible code without UI. Useful for tools and automated processes.

---

## Core APIs

### OBR.player

Access the current player's information.

```typescript
// Get player info
const id = await OBR.player.getId();
const name = await OBR.player.getName();
const color = await OBR.player.getColor();
const role = await OBR.player.getRole(); // "GM" or "PLAYER"
const selection = await OBR.player.getSelection(); // Array of item IDs

// Check permissions
const canEdit = await OBR.player.hasPermission("MAP_CREATE");

// Select/deselect items
await OBR.player.select(itemIds);
await OBR.player.deselect(itemIds);

// Player metadata
const metadata = await OBR.player.getMetadata();
await OBR.player.setMetadata({ "com.myname.key": value });

// Subscribe to changes
OBR.player.onChange((player) => {
  console.log("Player changed:", player);
});
```

### OBR.party

Access other players in the room.

```typescript
const players = await OBR.party.getPlayers();

OBR.party.onChange((players) => {
  console.log("Party changed:", players);
});
```

### OBR.room

Access room-level data.

```typescript
const id = await OBR.room.getId();
const permissions = await OBR.room.getPermissions();

// Room metadata (max 16KB total)
const metadata = await OBR.room.getMetadata();
await OBR.room.setMetadata({ "com.myname.key": value });

OBR.room.onMetadataChange((metadata) => {
  console.log("Room metadata changed:", metadata);
});
```

### OBR.scene

Access the current scene.

```typescript
// Check if scene is ready
const isReady = await OBR.scene.isReady();

// Scene metadata
const metadata = await OBR.scene.getMetadata();
await OBR.scene.setMetadata({ "com.myname.key": value });

OBR.scene.onMetadataChange((metadata) => {
  console.log("Scene metadata changed:", metadata);
});
```

### OBR.scene.items

Manage items in the scene.

```typescript
import OBR, { isImage, buildShape } from "@owlbear-rodeo/sdk";

// Get items
const allItems = await OBR.scene.items.getItems();
const images = await OBR.scene.items.getItems(isImage);
const byLayer = await OBR.scene.items.getItems(
  (item) => item.layer === "CHARACTER"
);
const byIds = await OBR.scene.items.getItems(["id1", "id2"]);

// Add items
const shape = buildShape()
  .width(100)
  .height(100)
  .shapeType("CIRCLE")
  .fillColor("red")
  .position({ x: 0, y: 0 })
  .build();
await OBR.scene.items.addItems([shape]);

// Update items (uses Immer for immutability)
await OBR.scene.items.updateItems(itemIds, (items) => {
  for (const item of items) {
    item.visible = false;
    item.metadata["com.myname.key"] = "value";
  }
});

// Delete items
await OBR.scene.items.deleteItems(itemIds);

// Get item with all attachments
const withAttachments = await OBR.scene.items.getItemAttachments(itemIds);

// Subscribe to changes
OBR.scene.items.onChange((items) => {
  console.log("Items changed:", items);
});
```

### OBR.scene.local

Manage local items (visible only to the current user).

```typescript
import OBR, { buildLabel } from "@owlbear-rodeo/sdk";

// Add a local label (great for tool feedback)
const label = buildLabel()
  .plainText("Hello!")
  .position({ x: 100, y: 100 })
  .build();
await OBR.scene.local.addItems([label]);

// Same API as OBR.scene.items
await OBR.scene.local.getItems();
await OBR.scene.local.updateItems(ids, updateFn);
await OBR.scene.local.deleteItems(ids);
```

### OBR.scene.grid

Access grid information.

```typescript
const dpi = await OBR.scene.grid.getDpi(); // Pixels per grid cell
const scale = await OBR.scene.grid.getScale();
const type = await OBR.scene.grid.getType(); // "SQUARE", "HEX_VERTICAL", etc.
```

### OBR.viewport

Control the camera/viewport.

```typescript
// Get viewport info
const position = await OBR.viewport.getPosition();
const scale = await OBR.viewport.getScale();
const width = await OBR.viewport.getWidth();
const height = await OBR.viewport.getHeight();

// Set viewport
await OBR.viewport.setPosition({ x: 0, y: 0 });
await OBR.viewport.setScale(1.5);

// Animate to bounds
await OBR.viewport.animateToBounds(bounds);

// Transform coordinates
const screenPoint = await OBR.viewport.transformPoint(viewportPoint);
```

### OBR.broadcast

Send messages to all players.

```typescript
// Send a message
await OBR.broadcast.sendMessage("com.myname.my-channel", {
  type: "roll",
  result: 20,
});

// Receive messages
OBR.broadcast.onMessage("com.myname.my-channel", (event) => {
  console.log("Received:", event.data);
  console.log("From:", event.connectionId);
});
```

### OBR.notification

Show notifications to the user.

```typescript
await OBR.notification.show("Hello World!");
await OBR.notification.show("Error occurred", "ERROR");
await OBR.notification.show("Success!", "SUCCESS");
await OBR.notification.show("Warning!", "WARNING");
```

### OBR.modal

Display modal dialogs.

```typescript
await OBR.modal.open({
  id: "com.myname.my-modal",
  url: "/modal.html",
  width: 400,
  height: 300,
});

await OBR.modal.close("com.myname.my-modal");
```

### OBR.popover

Control popovers programmatically.

```typescript
await OBR.popover.open({
  id: "com.myname.my-popover",
  url: "/popover.html",
  width: 300,
  height: 200,
  anchorPosition: { x: 100, y: 100 },
});

await OBR.popover.close("com.myname.my-popover");
```

### OBR.action

Control your extension's action button.

```typescript
// Open/close the action popover
await OBR.action.open();
await OBR.action.close();
const isOpen = await OBR.action.isOpen();

// Set badge
await OBR.action.setBadgeText("3");
await OBR.action.setBadgeBackgroundColor("red");

// Change icon dynamically
await OBR.action.setIcon("/new-icon.svg");
await OBR.action.setTitle("New Title");

// Set popover dimensions
await OBR.action.setWidth(400);
await OBR.action.setHeight(500);
```

### OBR.theme

Access the current theme.

```typescript
const theme = await OBR.theme.getTheme();
// theme.mode: "DARK" | "LIGHT"
// theme.primary, theme.secondary, etc. (color values)

OBR.theme.onChange((theme) => {
  // React to theme changes
});
```

### OBR.assets

Manage user assets.

```typescript
import OBR, { buildImageUpload } from "@owlbear-rodeo/sdk";

// Upload images
const upload = buildImageUpload(file).dpiGrid(150).build();
await OBR.assets.uploadImages([upload]);

// Download images from user's library
const images = await OBR.assets.downloadImages(true); // true = allow multiple
```

### OBR.interaction

Create interactive item dragging.

```typescript
import OBR, { buildCurve } from "@owlbear-rodeo/sdk";

// Start an interaction for smooth dragging
const line = buildCurve()
  .points([startPoint, startPoint])
  .strokeColor("red")
  .build();

const [update, stop] = await OBR.interaction.startItemInteraction(line);

// Update during drag
update((item) => {
  item.points[1] = newPoint;
});

// Stop interaction (adds item to scene)
stop();

// Or cancel (doesn't add to scene)
// stop(true);
```

---

## Item System

### Item Types

| Type | Builder | Description |
|------|---------|-------------|
| Image | `buildImage()` | Tokens, maps, props |
| Shape | `buildShape()` | Rectangles, circles, triangles, hexagons |
| Curve | `buildCurve()` | Lines, paths, polygons |
| Text | `buildText()` | Rich text |
| Label | `buildLabel()` | Screen-space labels (don't scale with zoom) |
| Light | `buildLight()` | Light sources for dynamic lighting |
| Effect | `buildEffect()` | Visual effects |

### Common Item Properties

All items share these base properties:

```typescript
interface Item {
  id: string;              // Unique identifier
  type: string;            // "IMAGE", "SHAPE", "CURVE", etc.
  name: string;            // Display name
  visible: boolean;        // Visibility
  locked: boolean;         // Prevent selection/movement
  position: Vector2;       // { x, y }
  rotation: number;        // Degrees
  scale: Vector2;          // { x, y }
  layer: Layer;            // "MAP", "DRAWING", "PROP", "CHARACTER", etc.
  zIndex: number;          // Stack order
  metadata: Metadata;      // Custom data storage
  attachedTo?: string;     // Parent item ID
  disableHit: boolean;     // Ignore pointer events
}
```

### Layers

| Layer | Description | Z-Order |
|-------|-------------|---------|
| `MAP` | Background maps | Lowest |
| `DRAWING` | Drawings and annotations | |
| `PROP` | Props and furniture | |
| `MOUNT` | Mounts and vehicles | |
| `CHARACTER` | Tokens and characters | |
| `ATTACHMENT` | Attached items | |
| `NOTE` | Notes | |
| `TEXT` | Text items | |
| `FOG` | Fog of war | Highest |

### Building Items

#### Shape Example

```typescript
import { buildShape } from "@owlbear-rodeo/sdk";

const circle = buildShape()
  .shapeType("CIRCLE")        // "RECTANGLE", "CIRCLE", "TRIANGLE", "HEXAGON"
  .width(100)
  .height(100)
  .position({ x: 0, y: 0 })
  .fillColor("#ff0000")
  .fillOpacity(0.5)
  .strokeColor("#000000")
  .strokeWidth(2)
  .strokeOpacity(1)
  .layer("DRAWING")
  .name("Red Circle")
  .metadata({ "com.myname.key": "value" })
  .build();
```

#### Curve Example

```typescript
import { buildCurve } from "@owlbear-rodeo/sdk";

const line = buildCurve()
  .points([
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ])
  .strokeColor("#0000ff")
  .strokeWidth(5)
  .tension(0)                 // 0 = straight lines, higher = smoother
  .closed(false)              // true = close the path
  .fillColor("#00ff00")       // Only visible if closed
  .build();
```

#### Image Example

```typescript
import { buildImage } from "@owlbear-rodeo/sdk";

const token = buildImage(
  {
    url: "https://example.com/token.png",
    width: 300,
    height: 300,
    mime: "image/png",
  },
  { dpi: 300, offset: { x: 150, y: 150 } }  // offset = origin point
)
  .position({ x: 500, y: 500 })
  .layer("CHARACTER")
  .name("Fighter")
  .build();
```

#### Label Example

```typescript
import { buildLabel } from "@owlbear-rodeo/sdk";

const label = buildLabel()
  .plainText("HP: 20/20")
  .position({ x: 100, y: 100 })
  .pointerDirection("DOWN")   // Arrow direction
  .backgroundColor("#333333")
  .build();
```

#### Text Example

```typescript
import { buildText } from "@owlbear-rodeo/sdk";

const text = buildText()
  .plainText("Hello World")
  // Or use richText for formatted text:
  // .richText([{ type: "paragraph", children: [{ text: "Hello" }] }])
  .position({ x: 0, y: 0 })
  .width(200)
  .height(100)
  .fontSize(24)
  .fontWeight(700)
  .textAlign("CENTER")
  .build();
```

### Attachments

Attach items to other items (e.g., status effects to tokens):

```typescript
const statusEffect = buildImage(imageProps, imageGrid)
  .attachedTo(parentItemId)    // Attach to parent
  .position({ x: 0, y: -50 })  // Offset from parent
  .layer("ATTACHMENT")
  .disableHit(true)            // Click-through
  .locked(true)                // Can't be selected independently
  .build();
```

---

## Best Practices

### Metadata Namespacing

Always prefix metadata keys with your extension ID to avoid collisions:

```typescript
// Good
item.metadata["com.myname.my-extension/initiative"] = 15;

// Bad - may collide with other extensions
item.metadata["initiative"] = 15;
```

### Error Handling

```typescript
try {
  await OBR.scene.items.updateItems(ids, (items) => {
    // updates
  });
} catch (error) {
  await OBR.notification.show("Failed to update items", "ERROR");
  console.error(error);
}
```

### Theme Support

Support both light and dark themes:

```typescript
const theme = await OBR.theme.getTheme();

// Use theme colors
const backgroundColor = theme.mode === "DARK" ? "#1a1a2e" : "#ffffff";
```

### Performance

- Use `OBR.scene.items.getItems(filter)` with filters instead of getting all items
- Batch updates with a single `updateItems` call
- Use local items (`OBR.scene.local`) for temporary feedback
- Clean up subscriptions in React useEffect return functions

### Cleanup

```typescript
useEffect(() => {
  const unsubscribe = OBR.scene.items.onChange((items) => {
    // handle changes
  });

  return () => {
    unsubscribe();
  };
}, []);
```

---

## Installing Your Extension

### During Development

1. Run your dev server: `npm run dev`
2. In Owlbear Rodeo, go to your Profile
3. Click "Add Extension"
4. Enter: `http://localhost:5173/manifest.json`

### Production Deployment

1. Build your extension: `npm run build`
2. Deploy to any static hosting (GitHub Pages, Netlify, Vercel, etc.)
3. Users install via your manifest URL: `https://yourdomain.com/manifest.json`

### Extension Verification

To get verified by Owlbear Rodeo:
- Extension must use accessible colors and font sizes
- Must be legible in both light and dark themes
- Must follow Owlbear Rodeo design guidelines

---

## Official Resources

- **Documentation**: https://docs.owlbear.rodeo/extensions/getting-started/
- **SDK GitHub**: https://github.com/owlbear-rodeo/sdk
- **SDK Tutorials**: https://github.com/owlbear-rodeo/sdk-tutorials
- **Example Extensions**: https://github.com/owlbear-rodeo/extensions
- **Extension Store**: https://extensions.owlbear.rodeo/

## Tutorials

- [Hello World](https://docs.owlbear.rodeo/extensions/tutorial-hello-world/)
- [Initiative Tracker](https://docs.owlbear.rodeo/extensions/tutorial-initiative-tracker/)
- [Custom Tool](https://docs.owlbear.rodeo/extensions/tutorial-custom-tool/)
