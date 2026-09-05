import type { Commit } from "../types";

// Keep these in sync with the row height used in HistoryTab's CSS.
export const ROW_HEIGHT = 44;
export const COLUMN_WIDTH = 20;

const PALETTE = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f97316", // orange
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#84cc16", // lime
];

type Lane = { expecting: string; color: string } | null;

export type GraphNode = {
  commit: Commit;
  row: number;
  column: number;
  color: string;
};

export type GraphEdge = {
  path: string;
  color: string;
};

export type GraphLayout = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  laneCount: number;
};

/**
 * Assigns each commit a lane (column) and color, and builds the connector
 * paths down to its parents. `commits` must already be topologically
 * ordered (children before parents) — which is what `get_history` returns.
 *
 * The core idea: a "lane" is a column that is currently waiting for a
 * specific commit id to show up (its next expected continuation). When we
 * reach a commit, we either land in the lane that was waiting for it, or —
 * if nothing was waiting — we open a fresh lane (a new branch tip). Extra
 * parents beyond the first (merge commits) open/reuse lanes of their own.
 */
export function layoutGraph(commits: Commit[]): GraphLayout {
  const lanes: Lane[] = [];
  const nodes: GraphNode[] = [];
  const positionByCommit = new Map<string, { row: number; column: number }>();

  let colorIdx = 0;
  const nextColor = () => PALETTE[colorIdx++ % PALETTE.length];

  const findLane = (id: string) => lanes.findIndex((l) => l !== null && l.expecting === id);
  const firstFreeSlot = () => {
    const idx = lanes.findIndex((l) => l === null);
    return idx === -1 ? lanes.length : idx;
  };

  commits.forEach((commit, row) => {
    const parentIds = commit.parentIds ?? [];
    let column = findLane(commit.id);
    let color: string;

    if (column === -1) {
      // Nothing was waiting for this commit — it's a branch tip. Open a new lane.
      column = firstFreeSlot();
      color = nextColor();
    } else {
      color = lanes[column]!.color;
    }

    // If some other lane was ALSO waiting for this commit (two branches
    // converging on the same ancestor), that lane's job is done — close it.
    for (let i = 0; i < lanes.length; i++) {
      if (i !== column && lanes[i]?.expecting === commit.id) {
        lanes[i] = null;
      }
    }

    const [firstParent, ...mergeParents] = parentIds;

    if (firstParent) {
      const alreadyClaimed = findLane(firstParent);
      if (alreadyClaimed !== -1 && alreadyClaimed !== column) {
        // The first parent is already being tracked by another lane (this
        // commit is a fast-forward-able tip merging straight back in) —
        // free this lane rather than double-tracking the same target.
        lanes[column] = null;
      } else {
        lanes[column] = { expecting: firstParent, color };
      }
    } else {
      // Root commit — nothing left to follow.
      lanes[column] = null;
    }

    // Merge commits: every extra parent needs somewhere to draw a line to.
    for (const parentId of mergeParents) {
      if (findLane(parentId) === -1) {
        lanes[firstFreeSlot()] = { expecting: parentId, color: nextColor() };
      }
    }

    nodes.push({ commit, row, column, color });
    positionByCommit.set(commit.id, { row, column });
  });

  const edges: GraphEdge[] = [];
  for (const node of nodes) {
    for (const parentId of node.commit.parentIds ?? []) {
      const target = positionByCommit.get(parentId);
      if (!target) continue; // parent falls outside the loaded window

      const x1 = node.column * COLUMN_WIDTH + COLUMN_WIDTH / 2;
      const y1 = node.row * ROW_HEIGHT + ROW_HEIGHT / 2;
      const x2 = target.column * COLUMN_WIDTH + COLUMN_WIDTH / 2;
      const y2 = target.row * ROW_HEIGHT + ROW_HEIGHT / 2;

      const path =
        x1 === x2
          ? `M ${x1} ${y1} L ${x2} ${y2}`
          : `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;

      edges.push({ path, color: node.color });
    }
  }

  const laneCount = Math.max(1, ...nodes.map((n) => n.column + 1));
  return { nodes, edges, laneCount };
}