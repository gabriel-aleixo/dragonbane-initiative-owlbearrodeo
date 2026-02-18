---
title: Draw Initiative for Dragonbane
description: Initiative tracker using the Dragonbane RPG card-based system
author: Gabe A.
image: https://raw.githubusercontent.com/gabriel-aleixo/dragonbane-initiative-owlbearrodeo/master/docs/images/hero.jpg
icon: https://drawinitiative.gabrielaleixo.com/icon.svg
tags:
  - combat
manifest: https://drawinitiative.gabrielaleixo.com/manifest.json
learn-more: https://drawinitiative.gabrielaleixo.com
---

# Draw Initiative for Dragonbane

An Owlbear Rodeo extension that implements the Dragonbane RPG initiative system. Manage combat turns using a card-based initiative mechanic where participants can act or swap their position in the turn order.

## How It Works

In the Dragonbane RPG, initiative is determined by drawing numbered cards (1–10) from a shared deck. Each participant draws one card per round, and turns proceed from lowest number to highest. Players can wait and swap cards with others to take their turn strategically. This extension automates the entire system directly inside Owlbear Rodeo.

## Features

### Starting Combat

The GM opens the initiative tracker extension and selects one or more tokens on the battle map. The GM clicks **"Start Combat"** button and all selected tokens are added as combat participants. At this point, the GM can edit the names of the participants, add or remove participants, duplicate participants for Ferocity (see below), and start the drawing phase.

![Starting Combat](https://raw.githubusercontent.com/gabriel-aleixo/dragonbane-initiative-owlbearrodeo/master/docs/images/starting-combat.jpg)

#### Ferocity

Some monsters have a Ferocity score, allowing them to take multiple turns per round. To handle this, the GM can click **"+Ferocity"** next to a participant to create a duplicate entry in the initiative list. Each entry draws its own initiative card. The GM can click "+Ferocity" multiple times for Ferocity 3, 4, etc.


### Drawing Phase

Each round begins with participants drawing cards from the deck. The GM controls when drawing starts, and each player draws their own card. The GM also has the ability to draw all cards for all participants at once. Once all cards are drawn, the GM clicks **"Start Round"** to start the round.

![Drawing Phase](https://raw.githubusercontent.com/gabriel-aleixo/dragonbane-initiative-owlbearrodeo/master/docs/images/drawing-phase.jpg)

### Active Round

Once the round starts, the participants are sorted by initiative number (ascending: 1 first, then 2, etc.). The participant with the lowest number is highlighted as the **active turn**. The active participant can click **"Act"** to complete their turn and advance to the next number, or click **"Wait"** to swap their initiative card with another participant who has a higher card number and hasn't acted yet. The swapper is marked as "waited" and can no longer be targeted for swaps.

![Active Round](https://raw.githubusercontent.com/gabriel-aleixo/dragonbane-initiative-owlbearrodeo/master/docs/images/active-round.jpg)

### GM and Player Roles

The GM sees full controls — add/remove participants, start rounds, and manage all combatants. Players see only their own participant with relevant action buttons.

![GM View](https://raw.githubusercontent.com/gabriel-aleixo/dragonbane-initiative-owlbearrodeo/master/docs/images/gm-view.jpg)

### Real-Time Sync

All combat state is synced in real time through Owlbear Rodeo's room metadata. State persists across page refreshes and scene changes — no data is lost if someone disconnects. *Note on race conditions*: in the rare case two players click draw at the same time and happen to draw the same card, once the state is synced, one of the players may see their card number refreshed to a new number.

## Installation

1. Copy the manifest URL: `https://drawinitiative.gabrielaleixo.com/manifest.json`
2. In Owlbear Rodeo, open the extensions menu
3. Paste the manifest URL and add the extension

## Support

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/gabriel-aleixo/dragonbane-initiative-owlbearrodeo/issues).
