// made by namar0x0309 with ❤️ at GoAIX
import 'dotenv/config';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Wekan } from "./wekan.js";

const BASE_URL = process.env["WEKAN_BASE_URL"]?.replace(/\/$/, "") || "";
const TOKEN = process.env["WEKAN_API_TOKEN"] || "";
const USERNAME = process.env["WEKAN_USERNAME"] || "";
const PASSWORD = process.env["WEKAN_PASSWORD"] || "";
const USER_ID = process.env["WEKAN_USER_ID"] || "";

if (!BASE_URL || (!TOKEN && !(USERNAME && PASSWORD))) {
  // Fail fast so agent surfaces a clear error.
  throw new Error("Set WEKAN_BASE_URL and either WEKAN_API_TOKEN or both WEKAN_USERNAME and WEKAN_PASSWORD");
}

const wekan = new Wekan({
  baseUrl: BASE_URL,
  token: TOKEN,
  username: USERNAME,
  password: PASSWORD,
  userId: USER_ID
});

const server = new McpServer(
  { name: "mcp-wekan", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// Register tools
server.tool("listBoards", "List accessible Wekan boards", {}, async () => {
  const boards = await wekan.listBoards(USER_ID);
  return { content: [{ type: "text", text: JSON.stringify(boards.map((b) => ({ id: b._id, title: b.title })))}] };
});

server.tool("listLists", "List lists in a board", {
  boardId: z.string()
}, async (args) => {
  const { boardId } = args;
  const lists = await wekan.listLists(boardId);
  return { content: [{ type: "text", text: JSON.stringify(lists.map((l) => ({ id: l._id, title: l.title })))}] };
});

server.tool("listSwimlanes", "List swimlanes in a board", {
  boardId: z.string()
}, async (args) => {
  const { boardId } = args;
  const lanes = await wekan.listSwimlanes(boardId);
  return { content: [{ type: "text", text: JSON.stringify(lanes.map((s) => ({ id: s._id, title: s.title })))}] };
});

server.tool("listCards", "List cards in a board+list", {
  boardId: z.string(),
  listId: z.string()
}, async (args) => {
  const { boardId, listId } = args;
  const cards = await wekan.listCards(boardId, listId);
  return { content: [{ type: "text", text: JSON.stringify(cards.map((c) => ({ id: c._id, title: c.title, desc: c.description })))}] };
});

server.tool("createCard", "Create a card", {
  boardId: z.string(),
  listId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  swimlaneId: z.string(),
  due: z.string().datetime().optional(),
  members: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional()
}, async (args) => {
  const { boardId, listId, title, description, swimlaneId, due, members, labels } = args;
  const body: any = {
    authorId: USER_ID,
    title,
    description: description || "",
    swimlaneId
  };
  if (due) body.dueAt = due;
  if (members) body.members = members;
  if (labels) body.labelIds = labels;
  const card = await wekan.createCard(boardId, listId, body);
  return { content: [{ type: "text", text: JSON.stringify({ id: card._id, title: card.title }) }] };
});

server.tool("moveCard", "Move a card to another list. Only requires cardId and list name - board and current list are found automatically.", {
  cardId: z.string().describe("The card ID (from card.id in getMyPendingCards/getMyCards)"),
  listName: z.string().describe("The destination list name (partial match, case-insensitive). Examples: 'Em Desenvolvimento', 'Backlog', 'Merge'")
}, async (args) => {
  const { cardId, listName } = args;
  const result = await wekan.moveCardToList(USER_ID, cardId, listName);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

server.tool("addCardComment", "Add a comment to a card. Only requires cardId - the board is found automatically.", {
  cardId: z.string().describe("The card ID (from card.id in getMyPendingCards/getMyCards)"),
  comment: z.string().min(1).describe("The comment text to add")
}, async (args) => {
  const { cardId, comment } = args;
  const result = await wekan.addCommentByCardId(USER_ID, cardId, comment);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});

// ============================================
// Aggregated tools - simplify agent workflows
// ============================================

server.tool("getBoardOverview", "Get complete board overview with lists, swimlanes, custom fields, and card counts. Use this to understand the board structure before working with cards.", {
  boardName: z.string().describe("The board name (partial match, case-insensitive). Example: 'uan' matches 'uan®'")
}, async (args) => {
  const { boardName } = args;
  const board = await wekan.findBoardByName(USER_ID, boardName);
  if (!board) {
    return { content: [{ type: "text", text: JSON.stringify({ error: `Board not found: ${boardName}` }) }] };
  }
  const overview = await wekan.getBoardOverview(board._id);
  return { content: [{ type: "text", text: JSON.stringify(overview, null, 2) }] };
});

server.tool("getCardDetails", "Get a single card with full context: board/list/swimlane names, custom fields mapped by name, and comments. Use this when you need complete information about a specific card.", {
  boardName: z.string().describe("The board name (partial match, case-insensitive)"),
  cardTitle: z.string().describe("The card title (partial match, case-insensitive)"),
  includeComments: z.boolean().optional().describe("Whether to include comments (default: true)")
}, async (args) => {
  const { boardName, cardTitle, includeComments = true } = args;

  // Find board
  const board = await wekan.findBoardByName(USER_ID, boardName);
  if (!board) {
    return { content: [{ type: "text", text: JSON.stringify({ error: `Board not found: ${boardName}` }) }] };
  }

  // Search for card in all lists
  const lists = await wekan.listLists(board._id);
  const lowerCardTitle = cardTitle.toLowerCase();

  for (const list of lists) {
    const cards = await wekan.listCards(board._id, list._id);
    const foundCard = cards.find((c: any) => c.title.toLowerCase().includes(lowerCardTitle));
    if (foundCard) {
      const card = await wekan.getCardWithContext(board._id, list._id, foundCard._id, includeComments);
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  }

  return { content: [{ type: "text", text: JSON.stringify({ error: `Card not found: ${cardTitle}` }) }] };
});

server.tool("getDetailedCards", "Get all cards with full details (board/list names, custom fields mapped, comments). Use filters to narrow results.", {
  boardName: z.string().optional().describe("Filter by board name (partial match, case-insensitive)"),
  listName: z.string().optional().describe("Filter by list name (partial match, case-insensitive)"),
  includeComments: z.boolean().optional().describe("Include comments for each card (default: false)")
}, async (args) => {
  const { boardName, listName, includeComments = false } = args;
  const options: { boardName?: string; listName?: string; includeComments?: boolean } = { includeComments };
  if (boardName) options.boardName = boardName;
  if (listName) options.listName = listName;
  // Use getMyCardsByName but without assignee filter (all cards)
  const cards = await wekan.getMyCardsByName(USER_ID, options);
  return { content: [{ type: "text", text: JSON.stringify(cards, null, 2) }] };
});

server.tool("getMyCards", "Get all cards assigned to me with full details. This is the PRIMARY tool for retrieving your tasks. Use friendly name filters instead of IDs.", {
  boardName: z.string().optional().describe("Filter by board name (partial match, case-insensitive). Example: 'uan' matches 'uan®'"),
  listName: z.string().optional().describe("Filter by list name (partial match, case-insensitive). Example: 'backlog' matches 'Backlog'"),
  includeComments: z.boolean().optional().describe("Include comments for each card (default: false)")
}, async (args) => {
  const { boardName, listName, includeComments = false } = args;
  const options: { boardName?: string; listName?: string; includeComments?: boolean } = { includeComments };
  if (boardName) options.boardName = boardName;
  if (listName) options.listName = listName;
  const cards = await wekan.getMyCardsByName(USER_ID, options);
  return { content: [{ type: "text", text: JSON.stringify(cards, null, 2) }] };
});

server.tool("getMyPendingCards", "Get my pending cards - those in 'Backlog*', 'Em Desenvolvimento' or 'Merge' lists where I need to take action. Excludes cards where: last comment is mine (waiting for response) OR no comments but uuid+PR both filled (work complete). Always includes comments with author names. This is the BEST tool for daily workflow.", {
  boardName: z.string().optional().describe("Filter by board name (partial match, case-insensitive). Example: 'uan' matches 'uan®'")
}, async (args) => {
  const { boardName } = args;
  const options: { boardName?: string } = {};
  if (boardName) options.boardName = boardName;
  const cards = await wekan.getMyPendingCards(USER_ID, options);
  return { content: [{ type: "text", text: JSON.stringify(cards, null, 2) }] };
});

// ============================================
// Update tools
// ============================================

server.tool("updateCardField", "Update a custom field on a card. Use IDs from getMyCards/getMyPendingCards. Fields: Downstream, Upstream, Planejamento, Manual de Planejamento, PR, etc.", {
  boardId: z.string().describe("The board ID (from card.board.id)"),
  listId: z.string().describe("The list ID (from card.list.id)"),
  cardId: z.string().describe("The card ID (from card.id)"),
  fieldName: z.string().describe("The custom field name to update (e.g., 'Downstream', 'Upstream', 'Planejamento', 'PR')"),
  value: z.string().describe("The new value for the field")
}, async (args) => {
  const { boardId, listId, cardId, fieldName, value } = args;
  const result = await wekan.updateCardField(boardId, listId, cardId, fieldName, value);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// Start transport
const transport = new StdioServerTransport();
await server.connect(transport);
