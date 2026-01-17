# Feature Improvement Proposal: Coin Economy & Player Engagement

## Overview
To boost player retention and engagement, we propose a comprehensive Coin Economy system. This system rewards players for active participation and skill, while providing desirable cosmetic and functional items to purchase.

## 1. The Economy: Earning Coins (Sources)
Players should feel a steady sense of progress.

*   **Game Rewards**:
    *   **Victory Bonus**: 1st Place: +50 Coins, 2nd Place: +30 Coins, 3rd Place: +15 Coins.
    *   **Correct Guesses**: +5 Coins for every correct guess during a game.
    *   **Artist Bonus**: +2 Coins every time someone correctly guesses your drawing.
*   **Daily Engagement**:
    *   **Daily Login Bonus**: Progressive rewards (Day 1: 10 coins -> Day 7: 100 coins).
    *   **Play Streak**: Bonus coins for playing at least one game 3 days in a row.
*   **Pi Network Integration**:
    *   **Ad Watch (Optional)**: Watch a short ad for +20 Coins.
    *   **Pi Payments**: Exchange Pi for a large bundle of Game Coins (Microtransactions).

## 2. The Shop: Spending Coins (Sinks)
Coins must have value. We focus on "Self-Expression" and "Light Gameplay Help".

### Cosmetic Upgrades (Status Symbols)
*   **Avatar Frames**: Golden, Neon, or Animated borders around the player's avatar in the lobby and leaderboard.
*   **Name Colors**: Allow username to appear in unique colors (e.g., "Matrix Green", "Royal Gold").
*   **Chat Bubbles**: Custom styles for chat messages.

### Drawing Tools (For the Artist)
*   **Special Brushes**: Neon Glow Brush, Chalk Style, varying opacity tools.
*   **Expanded Color Palettes**: Unlock "Retro", "Pastel", or "Cyberpunk" color sets.

### Gameplay Power-ups (For the Guesser)
*   *Note: Balanced to not break competitive integrity.*
*   **Hint Reveal**: Cost: 50 Coins. Reveals the first/random letter of the hidden word.
*   **Jumble Filter**: Cost: 30 Coins. Removes 3 incorrect letters from the letter bank (if using a letter bank system).

## 3. Technical Implementation Plan

### Phase 1: Foundation (Backend & State)
*   **Database**: Ensure `User` model has a persistent `coins` field (Already present).
*   **API**:
    *   `POST /api/shop/buy`: Endpoint to validate coin balance and deduct cost.
    *   `POST /api/game/end`: Update user coin balance based on game results.
*   **Frontend State**: Update `PiUser` or Create a `UserProfile` context to track live coin balance.

### Phase 2: The Shop UI
*   Create a **Store Component** accessible from the Main Menu.
*   Tabs: "Cosmetics", "Tools", "Power-ups".
*   Confirmation modals before purchase.

### Phase 3: Integration
*   **Game Loop**: Show a "Rewards Summary" modal after the game ends (e.g., "You earned 45 coins!").
*   **Lobby**: Display player's current coin balance prominently.
