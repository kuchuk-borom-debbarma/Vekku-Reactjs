# Vekku Frontend

## Project Overview

**Vekku Frontend** is a modern, single-page application built with **React 19** and **TypeScript**, designed to serve as the user interface for the Vekku content management platform. It provides a clean, responsive dashboard for managing contents and tags, featuring robust authentication and a polished UI.

### Core Technologies
-   **Framework:** React 19 (via Vite)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS v4 (with `tailwindcss-animate`)
-   **UI Components:** shadcn/ui (Radix UI primitives)
-   **Icons:** Lucide React
-   **Routing:** React Router DOM
-   **State Management:** React Context (Auth) & Local State
-   **API Client:** Axios (with Interceptors)

## Architecture & Features

### 1. Authentication System
The application implements a secure, token-based authentication flow:
-   **Context:** `AuthContext.tsx` manages global user state (`user`, `isAuthenticated`, `isLoading`).
-   **Tokens:** Uses JWT Access Tokens (stored in localStorage) and Refresh Tokens.
-   **Flow:**
    -   **Login/Register:** Public routes.
    -   **Token Refresh:** Axios interceptors automatically catch 401 errors and attempt to refresh the session seamlessly.
    -   **Protection:** `ProtectedRoute` wrapper ensures only authenticated users access the dashboard.

### 2. API Communication
-   **Configuration:** Centralized in `src/lib/api.ts`.
-   **Environment:** Connects to the backend via `VITE_API_URL` environment variable.
-   **Proxy:** In development, Vite proxies `/api` requests to `http://localhost:3000` (configurable) if `VITE_API_URL` is not set.

### 3. Feature Modules
-   **Dashboard (`Home.tsx`):** Provides a high-level overview of recent activity and statistics.
-   **Contents:** content management (Create, Read, Update, Delete).
-   **Tags:** Semantic tag management.

### 4. UI/UX
-   **Design System:** Built on `shadcn/ui` components for consistency and accessibility.
-   **Layouts:**
    -   `AuthLayout`: Simplified layout for login/register pages.
    -   `DashboardLayout`: Main application shell with navigation.

## Building and Running

### Prerequisites
-   Node.js (latest LTS recommended)
-   npm (or bun/yarn/pnpm)

### Key Commands

| Command | Description |
| :--- | :--- |
| `npm install` | Install dependencies. |
| `npm run dev` | Start the development server (default port 5173). |
| `npm run build` | Type-check and build the application for production. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint to check for code quality issues. |

## Development Conventions

*   **Component Structure:** Components are located in `src/components`. Reusable UI primitives (shadcn) are in `src/components/ui`.
*   **Pages:** Route-level components are in `src/pages`.
*   **Styling:** Utility-first CSS using Tailwind classes. Avoid custom CSS files where possible; use `tailwind.config.js` for theme customization.
*   **Type Safety:** Strict TypeScript mode is enabled. Define interfaces for all data structures (e.g., `User`, `Content`, `Tag`).
*   **Imports:** Use the `@` alias to import from `src` (e.g., `import api from "@/lib/api"`).

## Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# URL of the backend API (optional for local dev if using proxy)
VITE_API_URL=http://localhost:3000/api
```

### Vite Config
The `vite.config.ts` handles:
-   Path aliases (`@` -> `src`)
-   API Proxying (for `/api` calls during development)
