# AI Cliometrics Expert Panel

A multi-round Delphi-style web application for collecting expert valuations on AI narratives about the Industrial Revolution.

## 🏗️ Architecture

- **Frontend**: Static HTML/CSS/JS → GitHub Pages
- **Backend**: Python Flask API → Render.com

## 🚀 Quick Start

### Local Development

1. **Start the backend**:

```bash
cd app/backend
pip install -r requirements.txt
python server.py
```

1. **Update API URL in `data.js`**:

```javascript
const API_BASE = 'http://localhost:5000/api';
```

1. **Open frontend** in browser:

```
app/index.html
```

## 📦 Deployment

### Frontend (GitHub Pages)

1. Push the `app/` folder to a GitHub repository
2. Go to **Settings → Pages**
3. Select **Source: main branch** and folder: `/app`
4. Your site will be at: `https://username.github.io/repo-name/`

### Backend (Render.com)

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `app/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app`
4. Add environment variable:
   - `ADMIN_TOKEN`: Your secret admin token
5. Add a **Disk** for SQLite persistence:
   - Name: `data`
   - Mount Path: `/data`
   - Size: 1 GB

6. Update `API_BASE` in `data.js` with your Render URL:

```javascript
const API_BASE = 'https://your-app.onrender.com/api';
```

## 📋 Admin Panel

Access the admin panel at the bottom of the page (click "Admin" link).

**Admin Functions**:

- Close rounds to advance to the next phase
- Approve/reject suggested references
- Export all data as JSON
- Export valuations as CSV (compatible with analysis scripts)

## 🔄 Research Workflow

1. **Week 1 - Round 1 (Factors)**
   - Send expert links
   - Experts validate 8 explanatory factors
   - Admin closes round, reviews results

2. **Week 2 - Round 2 (Canon)**
   - Open Round 2 from admin panel
   - Experts vote on canonical works, suggest additions
   - Admin approves/rejects suggestions, closes round

3. **Week 3 - Round 3 (Valuation)**
   - Open Round 3 from admin panel
   - Experts adjust AI weights with sliders
   - Admin exports final CSV for analysis

## 📊 Data Format

The exported CSV matches the project's analysis scripts:

```csv
expert_id,expert_profile,work_id,work_type,factor,ai_value,expert_value,delta
EXP_01,Global,Allen_2009,Materialist,Institutions,20,10,-10.0
```

## 🔗 Publication Links

All canonical works include DOI links for expert reference:

| Work | DOI |
|------|-----|
| Allen 2009 | [10.1017/CBO9780511816680](https://doi.org/10.1017/CBO9780511816680) |
| Pomeranz 2000 | [10.1515/9781400823499](https://doi.org/10.1515/9781400823499) |
| ... | ... |

## 🛠️ Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- Flask 2.3+
- SQLite
- CORS enabled for cross-origin requests
