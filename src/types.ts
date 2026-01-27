export type CombatPhase = "DRAWING" | "ACTIVE" | "ROUND_COMPLETE";

export type ParticipantStatus = "PENDING" | "ACTIVE" | "ACTED" | "WAITED";

export interface Participant {
  id: string;
  tokenId: string;
  name: string;
  initiativeCard: number | null;
  status: ParticipantStatus;
  controlledBy: string; // Player ID or "GM"
}

export interface CombatState {
  isActive: boolean;
  phase: CombatPhase;
  roundNumber: number;
  participants: Participant[];
  currentTurnIndex: number;
  drawnCards: number[];
}

export const INITIAL_COMBAT_STATE: CombatState = {
  isActive: false,
  phase: "DRAWING",
  roundNumber: 0,
  participants: [],
  currentTurnIndex: 0,
  drawnCards: [],
};

export const METADATA_KEY = "com.dragonbane-initiative/combat-state";
