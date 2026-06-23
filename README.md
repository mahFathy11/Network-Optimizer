# HENS Optimizer — Heat Exchanger Network Synthesis

A full-stack web application for **Heat Exchanger Network Synthesis (HENS)** using a 3-Stage
Superstructure MINLP model. Minimizes Total Annualized Cost (TAC) with Chen's LMTD
approximation and Big-M formulation.

---

## Architecture

```
hens_app/
├── backend/
│   ├── main.py           # FastAPI server + HENS MINLP solver
│   └── requirements.txt  # Python dependencies
├── frontend/
│   └── App.jsx           # React dashboard (Tailwind CSS)
├── HENS_Dashboard.html   # ← Self-contained preview (no server needed)
└── README.md
```

---

## Quick Preview (No Server Required)

Open **`HENS_Dashboard.html`** directly in any modern browser.
The solver is embedded in JavaScript and runs entirely in the browser.

---

## Full Stack Setup

### 1 · Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at: `http://localhost:8000`
Docs at: `http://localhost:8000/docs`

### 2 · Frontend (React + Vite)

```bash
# Create a new Vite project
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Copy App.jsx into src/App.jsx
# Update tailwind.config.js content: ["./index.html","./src/**/*.{js,jsx}"]
# Add @tailwind directives to src/index.css

npm run dev
```

Frontend available at: `http://localhost:5173`

---

## Mathematical Model

### Objective Function (TAC Minimization)

```
min TAC = Utility Cost + Capital Cost

Utility Cost  = Q_hot_util × CU_hot  +  Q_cold_util × CU_cold
              = Q_hot_util × 80       +  Q_cold_util × 20        [$/yr]

Capital Cost  = Σᵢⱼₖ [ CF × Aᵢⱼₖ^0.83 ]
              = Σᵢⱼₖ [ 0.26 × Aᵢⱼₖ^0.83 ]                      [$/yr]
```

### Chen's LMTD Approximation

```
LMTD ≈ ( ΔT₁ · ΔT₂ · (ΔT₁ + ΔT₂) / 2 )^(1/3)

Area = Q / (U × LMTD)    bounded: 0 ≤ Area ≤ 5000 m²
```

### Big-M Formulation (M = 100,000)

```
ΔTᵢⱼₖ ≥ HRAT − M × (1 − zᵢⱼₖ)     [HRAT = 10°C minimum approach]
Qᵢⱼₖ   ≤ M × zᵢⱼₖ                   [activate/deactivate match]
zᵢⱼₖ   ∈ {0, 1}                      [binary: match exists?]
```

### Structural Constraints

| Constraint | Formula |
|---|---|
| Hot heat balance (stage k) | `Mcp_H × (TH[k-1] − TH[k]) = Σⱼ Qᵢⱼₖ` |
| Cold heat balance (stage k) | `Mcp_C × (TC[k-1] − TC[k]) = Σᵢ Qᵢⱼₖ` |
| Hot utility (end-of-pipe) | `Q_hot_util  = Σⱼ max(0, remaining_cold[j])` |
| Cold utility (end-of-pipe) | `Q_cold_util = Σᵢ max(0, remaining_hot[i])` |
| Monotonic hot temps | `TH[i][k] ≤ TH[i][k-1]` |
| Monotonic cold temps | `TC[j][k] ≥ TC[j][k-1]` |
| Euler's rule | `Σᵢⱼₖ zᵢⱼₖ ≤ max_matches` (default 5) |

### Superstructure

```
Stage:          k=1              k=2              k=3
               ┌─────────────────────────────────────────┐
Hot H1 (175°C) ──→[  HX(1,1,1) ]──→[  HX(1,1,2) ]──→[  HX(1,1,3) ]──→ (45°C)
               │   [  HX(1,2,1) ]   [  HX(1,2,2) ]   [  HX(1,2,3) ]
Hot H2 (125°C) ──→[  HX(2,1,1) ]──→[  HX(2,1,2) ]──→[  HX(2,1,3) ]──→ (65°C)
               │   [  HX(2,2,1) ]   [  HX(2,2,2) ]   [  HX(2,2,3) ]
Cold C1 (20°C) ←──[           ]──←[            ]──←[            ] ←── (155°C)
Cold C2 (40°C) ←──[           ]──←[            ]──←[            ] ←── (112°C)
               └─────────────────────────────────────────┘
```

---

## API Reference

### `POST /optimize`

**Request Body:**
```json
{
  "hot_streams": [
    { "id": "H1", "Tin": 175, "Tout": 45, "Mcp": 10 },
    { "id": "H2", "Tin": 125, "Tout": 65, "Mcp": 40 }
  ],
  "cold_streams": [
    { "id": "C1", "Tin": 20,  "Tout": 155, "Mcp": 20 },
    { "id": "C2", "Tin": 40,  "Tout": 112, "Mcp": 15 }
  ],
  "U": 0.5,
  "annualized_cost": 0.26,
  "hot_utility_cost": 80,
  "cold_utility_cost": 20,
  "HRAT": 10,
  "max_matches": 5
}
```

**Response:**
```json
{
  "status": "optimal",
  "total_cost": 98432.10,
  "utility_cost": 72000.00,
  "capital_cost": 26432.10,
  "hot_utility": 600.0,
  "cold_utility": 800.0,
  "heat_exchangers": [
    {
      "hot_id": "H1", "cold_id": "C1", "stage": 1,
      "Q_ex": 433.33, "area": 12.45,
      "T_hot_in": 175, "T_hot_out": 131.67,
      "T_cold_in": 45.0, "T_cold_out": 66.67
    }
  ],
  "solver_message": "Solved 3-stage superstructure. 4 active matches selected..."
}
```

---

## Default Test Case (Linnhoff Benchmark)

| Stream | Tin (°C) | Tout (°C) | Mcp (kW/°C) | Duty (kW) |
|--------|----------|-----------|-------------|-----------|
| H1     | 175      | 45        | 10          | 1300      |
| H2     | 125      | 65        | 40          | 2400      |
| C1     | 20       | 155       | 20          | 2700      |
| C2     | 40       | 112       | 15          | 1080      |

Parameters: U = 0.5 kW/m²·°C, HRAT = 10°C, CF = 0.26 $/m^0.83/yr
