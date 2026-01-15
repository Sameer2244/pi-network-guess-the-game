# Pi Draw & Guess (PiDraw)

Welcome to **Pi Draw & Guess**, a real-time multiplayer drawing and guessing game built for the Pi Network ecosystem. This project demonstrates how to build an interactive, socket-based web game using modern web technologies and integrate it with the Pi Network SDK.

## 🎮 Game Overview

Players can join lobbies, create rooms, and play a game where one person draws a word while others try to guess it in real-time.

*   **Lobby System:** Create or join game rooms.
*   **Real-time Canvas:** Synchronized drawing across all clients.
*   **Chat & Guessing:** Type guesses in the chat; the server detects correct answers automatically.
*   **Pi Network Integration:** Authenticate with Pi credentials (or Mock Mode) and simulating payments.

## 🛠 Tech Stack

### Frontend (Client)
*   **Framework:** React 19 (via Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Real-time:** Socket.io Client
*   **State Management:** React Hooks (`useState`, `useEffect`, `useRef`)

### Backend (Server)
*   **Runtime:** Node.js
*   **Framework:** Express
*   **Real-time:** Socket.io
*   **Language:** TypeScript
*   **Data Structure:** In-memory Maps (Rooms, Players)

---

## 📂 Project Structure

Here is a high-level overview of the most key files and folders:

```text
pi-draw-&-guess/
├── package.json          # Frontend dependencies and scripts
├── src/
│   ├── App.tsx           # Main application logic (Auth, Routing, Game Loop)
│   ├── components/
│   │   ├── Lobby.tsx       # Room selection screen
│   │   ├── CanvasBoard.tsx # Drawing area (Canvas API + Events)
│   │   └── ChatBox.tsx     # Chat interface for messaging and guessing
│   ├── services/
│   │   ├── piService.ts    # Pi Network SDK integration
│   │   └── socketService.ts# Socket.io connection wrapper
│   └── types.ts          # Shared TypeScript interfaces (Room, Player, GameState)
│
└── server/               # Backend logic
    ├── package.json      # Server dependencies
    ├── index.ts          # Main Server entry point (Socket listeners, Game Logic)
    └── types.ts          # Server-side type definitions
```

---

## 🚀 Installation & Setup

You need to run both the **Backend** and the **Frontend** simultaneously for the game to work.

### 1. Prerequisites
*   Node.js (v16 or higher recommended)
*   npm

### 2. Setup Backend Server
The server handles room management and game state.

1.  Open a terminal and navigate to the server folder:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    *   The server will start on `http://localhost:3001`

### 3. Setup Frontend Client
The frontend is the visual game interface.

1.  Open a **new** terminal (keep the server running) and navigate to the project root:
    ```bash
    cd ..  # If you are in server/
    # or just open the root folder
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the frontend:
    ```bash
    npm run dev
    ```
4.  Open your browser at the URL shown (usually `http://localhost:5173`).

---

## 🧩 How the Game Works (Under the Hood)

### 1. Authentication & Connection (`App.tsx`)
*   When the app loads, it tries to authenticate via `piService`.
*   If running in a standard browser (Chrome/Edge), it might show a specific error or allow "Mock Mode" for testing.
*   Once authenticated, it connects to the Socket.io server using the user's ID/Username.

### 2. The Lobby Phase (`Lobby.tsx` / Server)
*   **Server**: Maintains a `Map<roomId, Room>` of active rooms.
*   **Client**: Listens for `rooms_update` events to display the list of rooms.
*   **Action**: Sending `create_room` or `join_room` moves the player into a room context.

### 3. The Game Loop (`server/index.ts`)
The server controls the "Source of Truth".

1.  **Waiting**: Players join a room. The host clicks "Start Game" (requires 2+ players).
2.  **Game Start**:
    *   Server sets phase to `PLAYING`.
    *   Selects a random **Drawer**.
    *   Selects a random **Word** (e.g., "Apple").
    *   Starts a 60-second timer.
3.  **Drawing**:
    *   **Drawer's View**: Sees the word "Apple" and drawing tools.
    *   **Others' View**: Sees "Hint: _ _ _ _ _" and the canvas updates.
    *   **Sync**: Drawing events (`draw_stroke`) are sent to the server and broadcast to other players in that room.
4.  **Guessing**:
    *   Players type in the chat.
    *   Server checks: `if (message == currentWord)`?
    *   **If Match**: 
        *   System announces "Player X guessed the Word!".
        *   Points are awarded (10 for guesser, 5 for drawer).
    *   **If No Match**: Message appears as normal chat.
5.  **Round End**:
    *   When timer hits 0, server sets phase to `ROUND_END`.
    *   Clients show a "Round Over" screen.

### 4. Canvas Logic (`CanvasBoard.tsx`)
*   Uses HTML5 `<canvas>`.
*   Captures mouse/touch coordinates relative to the canvas element.
*   **Optimization**: Instead of sending full image data, we send "strokes":
    ```typescript
    { start: {x,y}, end: {x,y}, color: "#000", width: 3 }
    ```
    This keeps the game fast and responsive.

---

## 🧪 Testing with Mock Mode

If you are not inside the Pi Browser, use **Mock Mode**:
1.  Launch the app.
2.  Click **"Play in Mock Mode (Desktop)"** if you see the Connection Failed screen.
3.  This creates a "Guest_User" purely for testing the gameplay logic without real Pi authentication.
