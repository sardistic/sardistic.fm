# 🎛️ Sardistic.fm Dashboard

A high-fidelity, aesthetic personal analytics dashboard for visualizing Last.fm listening habits, tracking user interactions, and exploring music data through a premium "frosted glass" UI.

![Dashboard Preview](https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop) 


## 🎵 Features

*   **Deep Dive Analytics**: Explore listening history by Year, Month, and Artist with granular stats (minutes listened, time of day "vibes").
*   **Real-time Player**: "Now Playing" card with 3D tilt effects, live visualizers, and YouTube audio integration.
*   **Interaction Tracking**: Built-in analytics system tracking mouse movements (heatmaps), page dwell time, and click events.
*   **Aesthetic Design**: Custom "Glassmorphism" UI using Tailwind CSS, Framer Motion animations, and dynamic particle effects.
*   **Binge Reports**: Analyze listening streaks and obsession periods for specific artists.

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Recharts
*   **Backend**: Node.js (Express)
*   **Database**: SQLite (Analytics & Scrobble cache)
*   **APIs**: Last.fm (Music Data), YouTube (Audio Playback)

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python 3.8+ (For initial data generation)
*   Last.fm API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/sardistic/sardistic.fm.git
    cd sardistic.fm
    ```

2.  **Install Frontend Dependencies**
    ```bash
    cd dashboard-app
    npm install
    ```

3.  **Install Backend Dependencies**
    ```bash
    cd server
    npm install
    ```

4.  **Environment Setup**
    Create a `.env` file in `dashboard-app/server/`:
    ```env
    LASTFM_API_KEY=your_api_key_here
    LASTFM_USER=your_username
    PORT=3001
    ```
    Create a `.env` file in `dashboard-app/`:
    ```env
    VITE_SERVER_URL=http://localhost:3001
    ```

### 📊 Data Generation (Methodology)

To populate the dashboard with **YOUR** data, you need to generate the static JSON payloads. The app uses a hybrid approach: real-time data from the API and historical data from a static JSON file for speed.

1.  **Export Last.fm Data**: Use a tool like [Last.fm to CSV](https://benjaminbenben.com/lastfm-to-csv/) to get your full listening history. Save it as `recenttracks.csv` in the root folder.

2.  **Run the Processor**:
    ```bash
    # From the project root
    python data_processor.py recenttracks.csv
    ```
    This script will:
    *   Parse your CSV history.
    *   Calculate deep metrics (binges, streaks, genre vibes).
    *   Generate `dashboard-app/src/data/dashboard_payload.json`.

3.  **(Optional) Fetch Album Art**:
    Run `python fetch_art.py` to pre-cache album artwork for your top albums to avoid rate limits during runtime.

### Running Locally

1.  **Start the Backend**
    ```bash
    cd dashboard-app/server
    npm start
    ```

2.  **Start the Frontend** (in a new terminal)
    ```bash
    cd dashboard-app
    npm run dev
    ```

Visit `http://localhost:5173` to view the app.

## 📦 Deployment

*   **Frontend**: Deployed on Vercel.
*   **Backend**: Deployed on Railway.

## ❤️ Credits

Built by **Antigravity** & **Sardistic**.
Special thanks to Amazon Forest for the initial inspiration.
