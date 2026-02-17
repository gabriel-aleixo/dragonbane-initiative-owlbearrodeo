import { useEffect, useState, useCallback } from "react";
import OBR, { Item, Player } from "@owlbear-rodeo/sdk";
import {
  CombatState,
  Participant,
  INITIAL_COMBAT_STATE,
  METADATA_KEY,
} from "./types";

type Role = "GM" | "PLAYER";
type Theme = "DARK" | "LIGHT";

function App() {
  const [isReady, setIsReady] = useState(false);
  const [role, setRole] = useState<Role>("PLAYER");
  const [playerId, setPlayerId] = useState<string>("");
  const [theme, setTheme] = useState<Theme>("DARK");
  const [combatState, setCombatState] = useState<CombatState>(INITIAL_COMBAT_STATE);
  const [swappingFrom, setSwappingFrom] = useState<string | null>(null);
  const [partyPlayers, setPartyPlayers] = useState<Player[]>([]);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Initialize OBR SDK
  useEffect(() => {
    return OBR.onReady(async () => {
      const [playerRole, id, currentTheme, players] = await Promise.all([
        OBR.player.getRole(),
        OBR.player.getId(),
        OBR.theme.getTheme(),
        OBR.party.getPlayers(),
      ]);
      setRole(playerRole);
      setPlayerId(id);
      setTheme(currentTheme.mode);
      setPartyPlayers(players);
      setIsReady(true);

      // Load initial combat state
      const metadata = await OBR.room.getMetadata();
      const savedState = metadata[METADATA_KEY] as CombatState | undefined;
      if (savedState) {
        setCombatState(savedState);
      }
    });
  }, []);

  // Subscribe to metadata changes
  useEffect(() => {
    if (!isReady) return;

    const unsubMetadata = OBR.room.onMetadataChange((metadata) => {
      const state = metadata[METADATA_KEY] as CombatState | undefined;
      if (state) {
        setCombatState(state);
      } else {
        setCombatState(INITIAL_COMBAT_STATE);
      }
    });

    const unsubTheme = OBR.theme.onChange((t) => setTheme(t.mode));
    const unsubParty = OBR.party.onChange((p) => setPartyPlayers(p));

    return () => {
      unsubMetadata();
      unsubTheme();
      unsubParty();
    };
  }, [isReady]);

  // Watch for token deletions
  useEffect(() => {
    if (!isReady || !combatState.isActive) return;

    const unsubscribe = OBR.scene.items.onChange(async (items) => {
      const itemIds = new Set(items.map((i) => i.id));
      const removedParticipants = combatState.participants.filter(
        (p) => !itemIds.has(p.tokenId)
      );

      if (removedParticipants.length > 0) {
        const newParticipants = combatState.participants.filter((p) =>
          itemIds.has(p.tokenId)
        );

        // Adjust current turn index if needed
        let newTurnIndex = combatState.currentTurnIndex;
        const sortedOld = getSortedParticipants(combatState.participants);
        const activeId = sortedOld[combatState.currentTurnIndex]?.id;

        if (activeId) {
          const sortedNew = getSortedParticipants(newParticipants);
          const newIndex = sortedNew.findIndex((p) => p.id === activeId);
          if (newIndex === -1) {
            // Active participant was removed, keep index but clamp
            newTurnIndex = Math.min(newTurnIndex, sortedNew.length - 1);
          } else {
            newTurnIndex = newIndex;
          }
        }

        await updateCombatState({
          ...combatState,
          participants: newParticipants,
          currentTurnIndex: Math.max(0, newTurnIndex),
        });

        for (const p of removedParticipants) {
          await OBR.notification.show(`${p.name} was removed from combat`);
        }
      }
    });

    return () => unsubscribe();
  }, [isReady, combatState]);

  // Helper to update combat state
  const updateCombatState = useCallback(async (newState: CombatState) => {
    await OBR.room.setMetadata({ [METADATA_KEY]: newState });
  }, []);

  // Get sorted participants by initiative
  const getSortedParticipants = (participants: Participant[]): Participant[] => {
    return [...participants]
      .filter((p) => p.initiativeCard !== null)
      .sort((a, b) => (a.initiativeCard ?? 0) - (b.initiativeCard ?? 0));
  };

  // Check if current player can control a participant
  const canControl = (participant: Participant): boolean => {
    if (role === "GM") return true;
    return participant.controlledBy === playerId;
  };

  // Get display name for a participant
  const getDisplayName = (participant: Participant): string => {
    return participant.customName || participant.name;
  };

  // Save a custom name for a participant
  const saveCustomName = async (participantId: string, newName: string) => {
    const trimmed = newName.trim();
    const newParticipants = combatState.participants.map((p) =>
      p.id === participantId
        ? { ...p, customName: trimmed.length > 0 ? trimmed : null }
        : p
    );
    await updateCombatState({ ...combatState, participants: newParticipants });
    setEditingNameId(null);
  };

  // Draw a random card from available pool
  const drawRandomCard = (): number => {
    const available = [];
    for (let i = 1; i <= 10; i++) {
      if (!combatState.drawnCards.includes(i)) {
        available.push(i);
      }
    }
    return available[Math.floor(Math.random() * available.length)];
  };

  // === ACTIONS ===

  const startCombat = async () => {
    const selection = await OBR.player.getSelection();
    if (!selection || selection.length === 0) {
      await OBR.notification.show("Select tokens to add to combat", "WARNING");
      return;
    }

    const items = await OBR.scene.items.getItems(selection);
    const allPlayerIds = partyPlayers.map((p) => p.id);

    const participants: Participant[] = items.map((item: Item) => {
      // Check if token's creator is a player in the party
      const creatorId = item.createdUserId;
      const isPlayerOwned = creatorId && allPlayerIds.includes(creatorId);

      // Resolve player display name for player-owned tokens
      let displayName = item.name || "Unknown";
      if (isPlayerOwned) {
        const player = partyPlayers.find((p) => p.id === creatorId);
        if (player?.name) displayName = player.name;
      }

      return {
        id: crypto.randomUUID(),
        tokenId: item.id,
        name: displayName,
        customName: null,
        initiativeCard: null,
        status: "PENDING",
        controlledBy: isPlayerOwned ? creatorId : "GM",
      };
    });

    await updateCombatState({
      isActive: true,
      phase: "DRAWING",
      roundNumber: 1,
      participants,
      currentTurnIndex: 0,
      drawnCards: [],
    });

    await OBR.notification.show("Combat started!");
  };

  const drawCard = async (participantId: string) => {
    const participant = combatState.participants.find((p) => p.id === participantId);
    if (!participant || participant.initiativeCard !== null) return;

    const card = drawRandomCard();
    const newParticipants = combatState.participants.map((p) =>
      p.id === participantId ? { ...p, initiativeCard: card } : p
    );

    await updateCombatState({
      ...combatState,
      participants: newParticipants,
      drawnCards: [...combatState.drawnCards, card],
    });
  };

  const drawAllCards = async () => {
    const newParticipants = [...combatState.participants];
    const newDrawnCards = [...combatState.drawnCards];

    for (const p of newParticipants) {
      if (p.initiativeCard === null) {
        const available = [];
        for (let i = 1; i <= 10; i++) {
          if (!newDrawnCards.includes(i)) {
            available.push(i);
          }
        }
        const card = available[Math.floor(Math.random() * available.length)];
        p.initiativeCard = card;
        newDrawnCards.push(card);
      }
    }

    await updateCombatState({
      ...combatState,
      participants: newParticipants,
      drawnCards: newDrawnCards,
    });
  };

  const startRound = async () => {
    const sorted = getSortedParticipants(combatState.participants);
    const newParticipants = combatState.participants.map((p) => ({
      ...p,
      status: sorted[0]?.id === p.id ? "ACTIVE" : "PENDING",
    })) as Participant[];

    await updateCombatState({
      ...combatState,
      phase: "ACTIVE",
      participants: newParticipants,
      currentTurnIndex: 0,
    });
  };

  const act = async () => {
    const sorted = getSortedParticipants(combatState.participants);
    const current = sorted[combatState.currentTurnIndex];
    if (!current) return;

    const nextIndex = combatState.currentTurnIndex + 1;
    const isRoundComplete = nextIndex >= sorted.length;

    const newParticipants = combatState.participants.map((p) => {
      if (p.id === current.id) {
        return { ...p, status: "ACTED" as const };
      }
      if (!isRoundComplete && sorted[nextIndex]?.id === p.id) {
        return { ...p, status: "ACTIVE" as const };
      }
      return p;
    });

    await updateCombatState({
      ...combatState,
      phase: isRoundComplete ? "ROUND_COMPLETE" : "ACTIVE",
      participants: newParticipants,
      currentTurnIndex: isRoundComplete ? 0 : nextIndex,
    });
  };

  const initiateSwap = (participantId: string) => {
    setSwappingFrom(participantId);
  };

  const cancelSwap = () => {
    setSwappingFrom(null);
  };

  const executeSwap = async (targetId: string) => {
    const sorted = getSortedParticipants(combatState.participants);
    const swapper = sorted.find((p) => p.id === swappingFrom);
    const target = sorted.find((p) => p.id === targetId);

    if (!swapper || !target) return;

    // Exchange cards - swapper gets higher, target gets lower
    const swapperCard = swapper.initiativeCard!;
    const targetCard = target.initiativeCard!;

    const newParticipants = combatState.participants.map((p) => {
      if (p.id === swapper.id) {
        return {
          ...p,
          initiativeCard: targetCard,
          status: "WAITED" as const,
        };
      }
      if (p.id === target.id) {
        return {
          ...p,
          initiativeCard: swapperCard,
          status: "ACTIVE" as const,
        };
      }
      return p;
    });

    // Find new turn index after swap
    const newSorted = getSortedParticipants(newParticipants);
    const newTurnIndex = newSorted.findIndex((p) => p.status === "ACTIVE");

    await updateCombatState({
      ...combatState,
      participants: newParticipants,
      currentTurnIndex: newTurnIndex >= 0 ? newTurnIndex : 0,
    });

    setSwappingFrom(null);
  };

  const getValidSwapTargets = (): Participant[] => {
    const sorted = getSortedParticipants(combatState.participants);
    const current = sorted[combatState.currentTurnIndex];
    if (!current) return [];

    return sorted.filter(
      (p) =>
        p.id !== current.id &&
        p.status !== "ACTED" &&
        p.status !== "WAITED" &&
        (p.initiativeCard ?? 0) > (current.initiativeCard ?? 0)
    );
  };

  const addFerocity = async (participantId: string) => {
    const participant = combatState.participants.find((p) => p.id === participantId);
    if (!participant) return;

    const duplicate: Participant = {
      id: crypto.randomUUID(),
      tokenId: participant.tokenId,
      name: participant.name,
      customName: participant.customName,
      initiativeCard: null,
      status: "PENDING",
      controlledBy: participant.controlledBy,
    };

    await updateCombatState({
      ...combatState,
      participants: [...combatState.participants, duplicate],
    });
  };

  const newRound = async () => {
    const newParticipants = combatState.participants.map((p) => ({
      ...p,
      initiativeCard: null,
      status: "PENDING" as const,
    }));

    await updateCombatState({
      ...combatState,
      phase: "DRAWING",
      roundNumber: combatState.roundNumber + 1,
      participants: newParticipants,
      currentTurnIndex: 0,
      drawnCards: [],
    });
  };

  const endCombat = async () => {
    await OBR.room.setMetadata({ [METADATA_KEY]: undefined });
    setCombatState(INITIAL_COMBAT_STATE);
    await OBR.notification.show("Combat ended");
  };

  const removeParticipant = async (participantId: string) => {
    const participant = combatState.participants.find((p) => p.id === participantId);
    const newParticipants = combatState.participants.filter(
      (p) => p.id !== participantId
    );

    // Return card to pool if drawn
    let newDrawnCards = combatState.drawnCards;
    if (participant?.initiativeCard) {
      newDrawnCards = combatState.drawnCards.filter(
        (c) => c !== participant.initiativeCard
      );
    }

    // Adjust turn index
    const sorted = getSortedParticipants(combatState.participants);
    const removedIndex = sorted.findIndex((p) => p.id === participantId);
    let newTurnIndex = combatState.currentTurnIndex;
    if (removedIndex !== -1 && removedIndex < combatState.currentTurnIndex) {
      newTurnIndex = Math.max(0, combatState.currentTurnIndex - 1);
    }

    await updateCombatState({
      ...combatState,
      participants: newParticipants,
      drawnCards: newDrawnCards,
      currentTurnIndex: newTurnIndex,
    });
  };

  const addParticipants = async () => {
    const selection = await OBR.player.getSelection();
    if (!selection || selection.length === 0) {
      await OBR.notification.show("Select tokens to add", "WARNING");
      return;
    }

    const existingTokenIds = new Set(combatState.participants.map((p) => p.tokenId));
    const items = await OBR.scene.items.getItems(selection);
    const allPlayerIds = partyPlayers.map((p) => p.id);

    const newItems = items.filter((item: Item) => !existingTokenIds.has(item.id));
    if (newItems.length === 0) {
      await OBR.notification.show("Selected tokens are already in combat", "WARNING");
      return;
    }

    const newParticipants: Participant[] = newItems.map((item: Item) => {
      const creatorId = item.createdUserId;
      const isPlayerOwned = creatorId && allPlayerIds.includes(creatorId);

      // Resolve player display name for player-owned tokens
      let displayName = item.name || "Unknown";
      if (isPlayerOwned) {
        const player = partyPlayers.find((p) => p.id === creatorId);
        if (player?.name) displayName = player.name;
      }

      return {
        id: crypto.randomUUID(),
        tokenId: item.id,
        name: displayName,
        customName: null,
        initiativeCard: null,
        status: "PENDING",
        controlledBy: isPlayerOwned ? creatorId : "GM",
      };
    });

    await updateCombatState({
      ...combatState,
      participants: [...combatState.participants, ...newParticipants],
    });

    await OBR.notification.show(`Added ${newParticipants.length} participant(s)`);
  };

  // === RENDER ===

  if (!isReady) {
    return <div className="loading">Loading...</div>;
  }

  const sorted = getSortedParticipants(combatState.participants);
  const allDrawn = combatState.participants.every((p) => p.initiativeCard !== null);
  const currentParticipant = sorted[combatState.currentTurnIndex];
  const validSwapTargets = getValidSwapTargets();
  const isGM = role === "GM";

  const getStatusText = (): string => {
    if (!combatState.isActive) return "No Combat";
    if (combatState.phase === "DRAWING") return `Round ${combatState.roundNumber} - Drawing`;
    if (combatState.phase === "ROUND_COMPLETE") return `Round ${combatState.roundNumber} - Complete`;
    return `Round ${combatState.roundNumber} - Active`;
  };

  const getParticipantStatusText = (p: Participant): string => {
    if (p.status === "ACTIVE") return "Active";
    if (p.status === "ACTED") return "Acted";
    if (p.status === "WAITED") return "Waited";
    if (combatState.phase === "DRAWING" && p.initiativeCard === null) return "Draw card";
    return "";
  };

  // Determine display order
  const displayParticipants =
    combatState.phase === "DRAWING"
      ? combatState.participants
      : sorted.length > 0
      ? sorted
      : combatState.participants;

  return (
    <div className={`app ${theme.toLowerCase()}`}>
      {/* Header */}
      <div className="header">
        <h1>Draw Initiative</h1>
        <span className="status-badge">{getStatusText()}</span>
      </div>

      {/* No Combat State */}
      {!combatState.isActive && (
        <div className="empty-state">
          <p>No active combat</p>
          {isGM && (
            <button className="btn-primary" onClick={startCombat}>
              Start Combat
            </button>
          )}
          {!isGM && <p>Waiting for GM to start combat</p>}
        </div>
      )}

      {/* Combat Active */}
      {combatState.isActive && (
        <>
          <div className="scroll-area">
          {/* Participant List */}
          <div className="participant-list">
            {displayParticipants.map((p) => {
              const isActive = p.status === "ACTIVE" && combatState.phase === "ACTIVE";
              const canDraw =
                combatState.phase === "DRAWING" &&
                p.initiativeCard === null &&
                canControl(p);

              return (
                <div
                  key={p.id}
                  className={`participant-row ${isActive ? "active" : ""} ${
                    p.status === "ACTED" ? "acted" : ""
                  } ${p.status === "WAITED" ? "waited" : ""}`}
                >
                  {/* Initiative Card */}
                  <div className={`initiative-card ${p.initiativeCard === null ? "empty" : ""}`}>
                    {p.initiativeCard ?? "?"}
                  </div>

                  {/* Info */}
                  <div className="participant-info">
                    {isGM && combatState.phase === "DRAWING" && editingNameId === p.id ? (
                      <input
                        className="participant-name-input"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveCustomName(p.id, editingNameValue);
                          if (e.key === "Escape") setEditingNameId(null);
                        }}
                        onBlur={() => saveCustomName(p.id, editingNameValue)}
                        autoFocus
                      />
                    ) : (
                      <div
                        className={`participant-name ${isGM && combatState.phase === "DRAWING" ? "editable" : ""}`}
                        onClick={() => {
                          if (isGM && combatState.phase === "DRAWING") {
                            setEditingNameId(p.id);
                            setEditingNameValue(getDisplayName(p));
                          }
                        }}
                      >
                        {getDisplayName(p)}
                      </div>
                    )}
                    <div className="participant-status">{getParticipantStatusText(p)}</div>
                  </div>

                  {/* Actions */}
                  <div className="participant-actions">
                    {isGM && combatState.phase === "DRAWING" && p.controlledBy === "GM" && (
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => addFerocity(p.id)}
                        title="Add Ferocity"
                      >
                        +Ferocity
                      </button>
                    )}
                    {canDraw && (
                      <button className="btn-primary btn-small" onClick={() => drawCard(p.id)}>
                        Draw
                      </button>
                    )}

                    {isGM && (
                      <button
                        className="btn-danger btn-small"
                        onClick={() => removeParticipant(p.id)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Turn Actions */}
          {combatState.phase === "ACTIVE" && currentParticipant && canControl(currentParticipant) && (
            <div className="action-buttons sticky-actions">
              {swappingFrom === null ? (
                <>
                  <button className="btn-primary btn-full" onClick={act}>
                    Act
                  </button>
                  {validSwapTargets.length > 0 && (
                    <button
                      className="btn-secondary btn-full"
                      onClick={() => initiateSwap(currentParticipant.id)}
                    >
                      Wait
                    </button>
                  )}
                </>
              ) : (
                <div className="swap-targets">
                  <h4>Select swap target:</h4>
                  {validSwapTargets.map((t) => (
                    <button
                      key={t.id}
                      className="swap-target-btn btn-secondary"
                      onClick={() => executeSwap(t.id)}
                    >
                      <span className="initiative-card">{t.initiativeCard}</span>
                      <span>{getDisplayName(t)}</span>
                    </button>
                  ))}
                  <button className="btn-danger btn-full" onClick={cancelSwap}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Phase-specific GM actions */}
          {isGM && combatState.phase === "DRAWING" && (
            <div className="action-buttons sticky-actions">
              <button className="btn-secondary btn-full" onClick={drawAllCards} disabled={allDrawn}>
                Draw All Cards
              </button>
              <button className="btn-primary btn-full" onClick={startRound} disabled={!allDrawn}>
                Start Round
              </button>
            </div>
          )}

          {isGM && combatState.phase === "ROUND_COMPLETE" && (
            <div className="action-buttons sticky-actions">
              <button className="btn-primary btn-full" onClick={newRound}>
                Draw New Round
              </button>
            </div>
          )}

          </div>

          {/* Footer */}
          <div className="footer">
            <div className="footer-buttons">
              {isGM && combatState.phase === "DRAWING" && (
                <button className="btn-secondary" onClick={addParticipants}>
                  Add Participants
                </button>
              )}
              {isGM && (
                <button className="btn-danger" onClick={endCombat}>
                  End Combat
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
