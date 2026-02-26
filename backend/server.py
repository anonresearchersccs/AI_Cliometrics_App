"""
AI Cliometrics - Expert Panel Backend
Flask API for multi-round Delphi-style expert validation
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import sqlite3
import json
import os
import secrets

app = Flask(__name__, static_folder='../', static_url_path='/')
CORS(app)  # Enable CORS for GitHub Pages frontend

@app.route('/')
def index():
    return app.send_static_file('index.html')

# Configuration
DATABASE = os.environ.get('DATABASE_PATH', 'expert_panel.db')
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', 'admin123')  # Change in production!

# =====================================================
# DATABASE HELPERS
# =====================================================

def get_db():
    """Get database connection with row factory."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database schema."""
    conn = get_db()
    conn.executescript('''
        -- Experts table
        CREATE TABLE IF NOT EXISTS experts (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            profile TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Round status
        CREATE TABLE IF NOT EXISTS rounds (
            round_number INTEGER PRIMARY KEY,
            status TEXT DEFAULT 'open',
            opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            closed_at TIMESTAMP
        );
        
        -- Round 1: Factor validations
        CREATE TABLE IF NOT EXISTS factor_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expert_id TEXT NOT NULL,
            factor_id TEXT NOT NULL,
            action TEXT NOT NULL,
            comment TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (expert_id) REFERENCES experts(id),
            UNIQUE(expert_id, factor_id)
        );
        
        -- Round 2: Canon votes
        CREATE TABLE IF NOT EXISTS canon_votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expert_id TEXT NOT NULL,
            work_id TEXT NOT NULL,
            action TEXT NOT NULL,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (expert_id) REFERENCES experts(id),
            UNIQUE(expert_id, work_id)
        );
        
        -- Round 2: New reference suggestions
        CREATE TABLE IF NOT EXISTS suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expert_id TEXT NOT NULL,
            author TEXT NOT NULL,
            year INTEGER,
            title TEXT NOT NULL,
            work_type TEXT,
            url TEXT,
            justification TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (expert_id) REFERENCES experts(id)
        );
        
        -- Round 3: Valuations
        CREATE TABLE IF NOT EXISTS valuations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expert_id TEXT NOT NULL,
            work_id TEXT NOT NULL,
            factor_id TEXT NOT NULL,
            ai_value REAL NOT NULL,
            expert_value REAL NOT NULL,
            delta REAL NOT NULL,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (expert_id) REFERENCES experts(id),
            UNIQUE(expert_id, work_id, factor_id)
        );
        
        -- Initialize rounds if not exist
        INSERT OR IGNORE INTO rounds (round_number, status) VALUES (1, 'open');
        INSERT OR IGNORE INTO rounds (round_number, status) VALUES (2, 'waiting');
        INSERT OR IGNORE INTO rounds (round_number, status) VALUES (3, 'waiting');
    ''')
    conn.commit()
    conn.close()

# =====================================================
# EMAIL MOCK SERVICE
# =====================================================

def send_email(to, subject, body):
    """
    Mock email sender.
    In production, replace this with calls to SendGrid, Mailgun, or SMTP lib.
    """
    print(f"\n[EMAIL_MOCK] Sending email to: {to}")
    print(f"[EMAIL_MOCK] Subject: {subject}")
    print(f"[EMAIL_MOCK] Body: {body}")
    print("-" * 50 + "\n")

def notify_round_open(round_number):
    """Notify all experts that a new round is open."""
    conn = get_db()
    experts = conn.execute('SELECT * FROM experts WHERE email IS NOT NULL').fetchall()
    conn.close()

    round_names = ["", "Factors", "Canon", "Valuation"]
    r_name = round_names[round_number]

    for expert in experts:
        subject = f"Action Required: AI Cliometrics Round {round_number} ({r_name}) is now open"
        link = f"https://ai-cliometrics.github.io/?token={expert['token']}"
        body = f"""Dear {expert['name']},

The next round of the AI Cliometrics validation panel is now open.
Please visit the following link to participate:

{link}

Thank you for your contribution.
"""
        send_email(expert['email'], subject, body)

# =====================================================
# EXPERT AUTHENTICATION
# =====================================================

@app.route('/api/expert/register', methods=['POST'])
def register_expert():
    """Register a new expert and return unique token."""
    data = request.json
    expert_id = data.get('expert_id')
    profile = data.get('profile')
    name = data.get('name', 'Expert')
    email = data.get('email')
    
    if not expert_id or not profile:
        return jsonify({'error': 'Missing expert_id or profile'}), 400
    
    token = secrets.token_urlsafe(32)
    
    conn = get_db()
    try:
        conn.execute(
            'INSERT INTO experts (id, name, email, profile, token) VALUES (?, ?, ?, ?, ?)',
            (expert_id, name, email, profile, token)
        )
        conn.commit()
        
        # Send Welcome Email
        if email:
            link = f"https://ai-cliometrics.github.io/?token={token}"
            send_email(email, "Welcome to AI Cliometrics Expert Panel", 
                       f"Dear {name},\n\nYou have been invited to participate in the AI Cliometrics study.\nRound 1 is currently open.\n\nLink: {link}")
            
    except sqlite3.IntegrityError:
        # Expert already exists, get existing token
        row = conn.execute(
            'SELECT token FROM experts WHERE id = ?', (expert_id,)
        ).fetchone()
        if row:
            token = row['token']
    finally:
        conn.close()
    
    return jsonify({'token': token, 'expert_id': expert_id})

@app.route('/api/expert/validate', methods=['POST'])
def validate_expert():
    """Validate expert token and return profile."""
    token = request.json.get('token')
    
    conn = get_db()
    row = conn.execute(
        'SELECT id, profile FROM experts WHERE token = ?', (token,)
    ).fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'Invalid token'}), 401
    
    return jsonify({'expert_id': row['id'], 'profile': row['profile']})

# =====================================================
# ROUND STATUS
# =====================================================

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current round status."""
    conn = get_db()
    rows = conn.execute('SELECT * FROM rounds ORDER BY round_number').fetchall()
    conn.close()
    
    current_round = 0
    for row in rows:
        if row['status'] == 'open':
            current_round = row['round_number']
            break
    
    return jsonify({
        'current_round': current_round,
        'rounds': [dict(row) for row in rows]
    })

# =====================================================
# ROUND 1: FACTOR VALIDATION
# =====================================================

@app.route('/api/round1/submit', methods=['POST'])
def submit_round1():
    """Submit factor validations."""
    data = request.json
    expert_id = data.get('expert_id')
    validations = data.get('validations', {})
    
    conn = get_db()
    
    # Check round is open
    round_status = conn.execute(
        'SELECT status FROM rounds WHERE round_number = 1'
    ).fetchone()
    if round_status['status'] != 'open':
        conn.close()
        return jsonify({'error': 'Round 1 is closed'}), 403
    
    # Insert/update validations
    for factor_id, vote_data in validations.items():
        conn.execute('''
            INSERT OR REPLACE INTO factor_votes 
            (expert_id, factor_id, action, comment) 
            VALUES (?, ?, ?, ?)
        ''', (expert_id, factor_id, vote_data['action'], vote_data.get('comment', '')))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'count': len(validations)})

@app.route('/api/round1/results', methods=['GET'])
def get_round1_results():
    """Get aggregated Round 1 results."""
    conn = get_db()
    
    # Count votes per factor per action
    rows = conn.execute('''
        SELECT factor_id, action, COUNT(*) as count
        FROM factor_votes
        GROUP BY factor_id, action
    ''').fetchall()
    
    # Get all comments
    comments = conn.execute('''
        SELECT factor_id, expert_id, comment 
        FROM factor_votes 
        WHERE comment IS NOT NULL AND comment != ''
    ''').fetchall()
    
    conn.close()
    
    results = {}
    for row in rows:
        fid = row['factor_id']
        if fid not in results:
            results[fid] = {'ok': 0, 'modify': 0, 'comments': []}
        results[fid][row['action']] = row['count']
    
    for c in comments:
        fid = c['factor_id']
        if fid in results:
            results[fid]['comments'].append({
                'expert_id': c['expert_id'],
                'comment': c['comment']
            })
    
    return jsonify(results)

# =====================================================
# ROUND 2: CANON VALIDATION
# =====================================================

@app.route('/api/round2/submit', methods=['POST'])
def submit_round2():
    """Submit canon validations."""
    data = request.json
    expert_id = data.get('expert_id')
    votes = data.get('votes', {})
    
    conn = get_db()
    
    # Check round is open
    round_status = conn.execute(
        'SELECT status FROM rounds WHERE round_number = 2'
    ).fetchone()
    if round_status['status'] != 'open':
        conn.close()
        return jsonify({'error': 'Round 2 is closed'}), 403
    
    for work_id, action in votes.items():
        conn.execute('''
            INSERT OR REPLACE INTO canon_votes 
            (expert_id, work_id, action) 
            VALUES (?, ?, ?)
        ''', (expert_id, work_id, action))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'count': len(votes)})

@app.route('/api/round2/suggest', methods=['POST'])
def suggest_reference():
    """Suggest a new reference to add to canon."""
    data = request.json
    
    conn = get_db()
    conn.execute('''
        INSERT INTO suggestions 
        (expert_id, author, year, title, work_type, url, justification)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('expert_id'),
        data.get('author'),
        data.get('year'),
        data.get('title'),
        data.get('work_type'),
        data.get('url'),
        data.get('justification')
    ))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/round2/canon', methods=['GET'])
def get_canon():
    """Get canon list with vote counts."""
    conn = get_db()
    
    # Get votes for original works
    votes = conn.execute('''
        SELECT work_id, action, COUNT(*) as count
        FROM canon_votes
        GROUP BY work_id, action
    ''').fetchall()
    
    # Get approved suggestions
    suggestions = conn.execute('''
        SELECT * FROM suggestions WHERE status = 'approved'
    ''').fetchall()
    
    conn.close()
    
    vote_summary = {}
    for v in votes:
        wid = v['work_id']
        if wid not in vote_summary:
            vote_summary[wid] = {'keep': 0, 'remove': 0}
        vote_summary[wid][v['action']] = v['count']
    
    return jsonify({
        'votes': vote_summary,
        'suggestions': [dict(s) for s in suggestions]
    })

@app.route('/api/round2/suggestions', methods=['GET'])
def get_suggestions():
    """Get all suggestions for admin review."""
    conn = get_db()
    rows = conn.execute('SELECT * FROM suggestions ORDER BY submitted_at DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# =====================================================
# ROUND 3: VALUATION
# =====================================================

@app.route('/api/round3/works', methods=['GET'])
def get_works_for_valuation():
    """Get final list of works for Round 3 valuation."""
    conn = get_db()
    
    # Get works with majority "keep" votes
    votes = conn.execute('''
        SELECT work_id, 
           SUM(CASE WHEN action = 'keep' THEN 1 ELSE 0 END) as keep_count,
           SUM(CASE WHEN action = 'remove' THEN 1 ELSE 0 END) as remove_count
        FROM canon_votes
        GROUP BY work_id
        HAVING keep_count >= remove_count
    ''').fetchall()
    
    # Get approved suggestions
    suggestions = conn.execute('''
        SELECT * FROM suggestions WHERE status = 'approved'
    ''').fetchall()
    
    conn.close()
    
    return jsonify({
        'approved_works': [v['work_id'] for v in votes],
        'added_works': [dict(s) for s in suggestions]
    })

@app.route('/api/round3/submit', methods=['POST'])
def submit_round3():
    """Submit valuations."""
    data = request.json
    expert_id = data.get('expert_id')
    work_id = data.get('work_id')
    valuations = data.get('valuations', [])
    
    conn = get_db()
    
    # Check round is open
    round_status = conn.execute(
        'SELECT status FROM rounds WHERE round_number = 3'
    ).fetchone()
    if round_status['status'] != 'open':
        conn.close()
        return jsonify({'error': 'Round 3 is closed'}), 403
    
    for v in valuations:
        conn.execute('''
            INSERT OR REPLACE INTO valuations 
            (expert_id, work_id, factor_id, ai_value, expert_value, delta)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (expert_id, work_id, v['factor_id'], v['ai_value'], v['expert_value'], v['delta']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/round3/results', methods=['GET'])
def get_round3_results():
    """Get all valuation results."""
    conn = get_db()
    rows = conn.execute('''
        SELECT v.*, e.profile as expert_profile
        FROM valuations v
        JOIN experts e ON v.expert_id = e.id
        ORDER BY work_id, factor_id
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# =====================================================
# ADMIN ENDPOINTS
# =====================================================

def check_admin(request):
    """Verify admin token."""
    token = request.headers.get('X-Admin-Token')
    return token == ADMIN_TOKEN

@app.route('/api/admin/close-round', methods=['POST'])
def close_round():
    """Close current round and open next."""
    if not check_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    round_number = request.json.get('round')
    
    conn = get_db()
    conn.execute('''
        UPDATE rounds SET status = 'closed', closed_at = ? 
        WHERE round_number = ?
    ''', (datetime.now().isoformat(), round_number))
    
    # Open next round
    next_round = round_number + 1
    if next_round <= 3:
        conn.execute('''
            UPDATE rounds SET status = 'open', opened_at = ? 
            WHERE round_number = ?
        ''', (datetime.now().isoformat(), next_round))
    
    conn.commit()
    conn.close()
    
    # Trigger notifications
    if next_round <= 3:
        notify_round_open(next_round)
    
    return jsonify({'success': True, 'next_round': min(next_round, 3)})

@app.route('/api/admin/approve-suggestion', methods=['POST'])
def approve_suggestion():
    """Approve a suggested reference."""
    if not check_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    suggestion_id = request.json.get('id')
    
    conn = get_db()
    conn.execute('UPDATE suggestions SET status = ? WHERE id = ?', ('approved', suggestion_id))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/admin/reject-suggestion', methods=['POST'])
def reject_suggestion():
    """Reject a suggested reference."""
    if not check_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    suggestion_id = request.json.get('id')
    
    conn = get_db()
    conn.execute('UPDATE suggestions SET status = ? WHERE id = ?', ('rejected', suggestion_id))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/admin/export', methods=['GET'])
def export_data():
    """Export all data as JSON."""
    if not check_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db()
    
    data = {
        'experts': [dict(r) for r in conn.execute('SELECT * FROM experts').fetchall()],
        'factor_votes': [dict(r) for r in conn.execute('SELECT * FROM factor_votes').fetchall()],
        'canon_votes': [dict(r) for r in conn.execute('SELECT * FROM canon_votes').fetchall()],
        'suggestions': [dict(r) for r in conn.execute('SELECT * FROM suggestions').fetchall()],
        'valuations': [dict(r) for r in conn.execute('SELECT * FROM valuations').fetchall()],
        'rounds': [dict(r) for r in conn.execute('SELECT * FROM rounds').fetchall()],
    }
    
    conn.close()
    return jsonify(data)

@app.route('/api/admin/export-csv', methods=['GET'])
def export_csv():
    """Export valuations as CSV (compatible with project scripts)."""
    if not check_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db()
    rows = conn.execute('''
        SELECT v.expert_id, e.profile as expert_profile, v.work_id, 
               v.factor_id as factor, v.ai_value, v.expert_value, v.delta
        FROM valuations v
        JOIN experts e ON v.expert_id = e.id
        ORDER BY v.expert_id, v.work_id, v.factor_id
    ''').fetchall()
    conn.close()
    
    # Build CSV
    csv_lines = ['expert_id,expert_profile,work_id,work_type,factor,ai_value,expert_value,delta']
    for r in rows:
        csv_lines.append(f"{r['expert_id']},{r['expert_profile']},{r['work_id']},,{r['factor']},{r['ai_value']},{r['expert_value']},{r['delta']}")
    
    return '\n'.join(csv_lines), 200, {'Content-Type': 'text/csv'}

# =====================================================
# HEALTH CHECK
# =====================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

# =====================================================
# MAIN
# =====================================================

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
