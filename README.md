# NexChef 🍳

A modern React Native & Expo cooking application that guides home chefs through step-by-step recipes.

## Key Features

### ⏱️ Cooking Mode & Step Buffer Screen
- **Preparation Checklist**: Ensure all ingredients are prepped before starting the recipe.
- **Interactive Step Timers**: Real-time circular timer display with step progress tracking and warning notifications.
- **Step Buffer Screen**:
  - Automatically appears between cooking steps to allow users ample time to prepare for the upcoming step.
  - **30-Second Countdown Buffer**: Visual SVG circular countdown timer with haptic pulses.
  - **Upcoming Step Preview**: Displays the title, description, step number, and expected duration of the next step.
  - **Skip Buffer Action**: Tapping "Skip Buffer & Start Step" immediately advances to the next step.
  - **Auto-Proceed**: Automatically advances to the next step once the 30-second buffer finishes.
  - **Buffer Controls**: Pause/Resume countdown and +15s extra preparation time buttons.

## Get Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the app**
   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a development build, Android emulator, iOS simulator, or Web.

## Tech Stack
- **Framework**: Expo (v54) / React Native / Expo Router
- **Icons & UI**: @expo/vector-icons, React Native SVG, Expo Haptics
- **Backend & Auth**: Supabase integration

