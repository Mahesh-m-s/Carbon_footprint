# 🌿 Carbon Footprint Emission Management System
### DBMS Mini Project — College IT Infrastructure Carbon Tracking

---

## 📁 Project Structure

```
carbon-footprint/
├── database/
│   └── schema.sql          ← MySQL schema + sample data
├── backend/
│   ├── server.js           ← Node.js + Express API
│   ├── package.json        ← Dependencies
│   └── .env                ← DB credentials (edit this)
└── frontend/
    ├── index.html          ← Main SPA
    ├── css/style.css       ← Styles
    └── js/app.js           ← Frontend logic
```

---

## 🚀 Setup Instructions

### Step 1 — MySQL Database

1. Open MySQL Workbench or phpMyAdmin
2. Run the SQL file:
   ```sql
   SOURCE /path/to/carbon-footprint/database/schema.sql;
   ```
   Or paste the contents directly into the SQL editor and execute.

---

### Step 2 — Backend (Node.js)

1. Open terminal and navigate to backend folder:
   ```bash
   cd carbon-footprint/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Edit `.env` file with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=carbon_footprint_db
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm start
   ```
   You should see:
   ```
   ✅ MySQL Connected
   🌿 Carbon Footprint Server running at http://localhost:3000
   ```

---

### Step 3 — Open the App

Open your browser and go to:
```
http://localhost:3000
```

The frontend is served directly by the Express backend.

---

## 📊 Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Overview of total CO₂ emissions with charts |
| **Device Usage** | Log hours used by computers, servers, mobiles |
| **Internet Usage** | Track data consumption per department |
| **Electricity** | Log kWh from meter readings per lab |
| **Reports** | Emission analysis, department comparison, Green IT tips |

---

## 🧮 Emission Factors Used

| Source | Factor | Standard |
|--------|--------|---------|
| Electricity | 0.716 kg CO₂/kWh | India Grid (CEA 2023) |
| Internet Data | 0.06 kg CO₂/GB | IEA Global Average |

---

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MySQL 8.x
- **ORM**: mysql2 (native driver, no ORM)

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | List all departments |
| GET | `/api/devices` | List all devices |
| GET/POST | `/api/device-usage` | Device usage records |
| DELETE | `/api/device-usage/:id` | Delete a record |
| GET/POST | `/api/internet` | Internet consumption |
| DELETE | `/api/internet/:id` | Delete a record |
| GET/POST | `/api/electricity` | Electricity usage |
| DELETE | `/api/electricity/:id` | Delete a record |
| GET | `/api/dashboard/summary` | Dashboard stats |
| GET | `/api/dashboard/monthly` | Monthly trend data |

---

## 👨‍💻 Requirements

- Node.js v16 or higher
- MySQL 8.x
- Browser: Chrome / Firefox / Edge (modern)



