import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Ensure database directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Error creating data directory:', e);
  }
}

// In-Memory Database Structure
interface DatabaseSchema {
  schools: any[];
  positions: any[];
  candidates: any[];
  voters: any[];
  votes: any[];
  lastUpdated: string;
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading database file, using empty default:', err);
  }
  return {
    schools: [],
    positions: [],
    candidates: [],
    voters: [],
    votes: [],
    lastUpdated: new Date().toISOString(),
  };
}

let db: DatabaseSchema = loadDatabase();

function saveDatabase() {
  try {
    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

// Global Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to generate voter code
function generateRandomVoterCode(schoolCode: string, index: number): string {
  const cleanSchoolCode = (schoolCode || 'MX-001').trim().toUpperCase();
  const padIndex = String(index).padStart(4, '0');
  return `${cleanSchoolCode}-${padIndex}`;
}

// ================= API ROUTES ================= //

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    schoolsCount: db.schools.length,
    votersCount: db.voters.length,
    votesCount: db.votes.length,
    lastUpdated: db.lastUpdated,
  });
});

// Fetch full current database
app.get('/api/data', (req, res) => {
  res.json(db);
});

// Full Sync endpoint (Client pushes its local changes and pulls server updates)
app.post('/api/sync', (req, res) => {
  try {
    const clientData = req.body;
    if (!clientData) {
      return res.json(db);
    }

    let modified = false;

    // Merge schools
    if (Array.isArray(clientData.schools)) {
      for (const clientSchool of clientData.schools) {
        if (!clientSchool || !clientSchool.id) continue;
        const index = db.schools.findIndex((s) => s.id === clientSchool.id);
        if (index === -1) {
          db.schools.push(clientSchool);
          modified = true;
        } else {
          // Merge preserving newer updates
          db.schools[index] = { ...db.schools[index], ...clientSchool };
          modified = true;
        }
      }
    }

    // Merge positions
    if (Array.isArray(clientData.positions)) {
      for (const clientPos of clientData.positions) {
        if (!clientPos || !clientPos.id) continue;
        const index = db.positions.findIndex((p) => p.id === clientPos.id);
        if (index === -1) {
          db.positions.push(clientPos);
          modified = true;
        } else {
          db.positions[index] = { ...db.positions[index], ...clientPos };
          modified = true;
        }
      }
    }

    // Merge candidates
    if (Array.isArray(clientData.candidates)) {
      for (const clientCand of clientData.candidates) {
        if (!clientCand || !clientCand.id) continue;
        const index = db.candidates.findIndex((c) => c.id === clientCand.id);
        if (index === -1) {
          db.candidates.push(clientCand);
          modified = true;
        } else {
          db.candidates[index] = { ...db.candidates[index], ...clientCand };
          modified = true;
        }
      }
    }

    // Merge voters
    if (Array.isArray(clientData.voters)) {
      for (const clientVoter of clientData.voters) {
        if (!clientVoter || !clientVoter.id) continue;
        const index = db.voters.findIndex((v) => v.id === clientVoter.id);
        if (index === -1) {
          db.voters.push(clientVoter);
          modified = true;
        } else {
          // If voter has voted on either side, keep hasVoted = true
          if (clientVoter.hasVoted && !db.voters[index].hasVoted) {
            db.voters[index] = { ...db.voters[index], ...clientVoter };
            modified = true;
          }
        }
      }
    }

    // Merge votes
    if (Array.isArray(clientData.votes)) {
      for (const clientVote of clientData.votes) {
        if (!clientVote || !clientVote.id) continue;
        const exists = db.votes.some((v) => v.id === clientVote.id);
        if (!exists) {
          db.votes.push(clientVote);
          modified = true;
        }
      }
    }

    if (modified) {
      saveDatabase();
    }

    res.json(db);
  } catch (err: any) {
    console.error('Error during /api/sync:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// Authentication Endpoint: Allows user to sign in from ANY device with email & password
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email or registration number and password.',
      });
    }

    const cleanIdent = String(identifier).trim().toLowerCase();
    const school = db.schools.find(
      (s) =>
        (s.email?.toLowerCase() === cleanIdent ||
          s.regNumber?.toLowerCase() === cleanIdent ||
          s.schoolCode?.toLowerCase() === cleanIdent ||
          s.name?.toLowerCase() === cleanIdent) &&
        s.passwordHash === password
    );

    if (!school) {
      return res.status(401).json({
        success: false,
        error: 'Invalid school email/registration number or password.',
      });
    }

    res.json({
      success: true,
      school,
      fullData: db,
    });
  } catch (err: any) {
    console.error('Error during /api/auth/login:', err);
    res.status(500).json({ success: false, error: err.message || 'Authentication error' });
  }
});

// School Registration Endpoint
app.post('/api/schools/register', (req, res) => {
  try {
    const params = req.body;
    if (!params.name || !params.regNumber || !params.email || !params.password) {
      return res.status(400).json({
        success: false,
        error: 'All required registration fields must be provided.',
      });
    }

    const cleanReg = params.regNumber.trim().toLowerCase();
    const cleanEmail = params.email.trim().toLowerCase();

    const existing = db.schools.find(
      (s) =>
        s.regNumber?.toLowerCase() === cleanReg ||
        s.email?.toLowerCase() === cleanEmail
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `A school with this Registration Number (${params.regNumber}) or Email (${params.email}) is already registered.`,
      });
    }

    const schoolId = `school_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initials = params.name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0].toUpperCase())
      .join('')
      .slice(0, 3) || 'MX';
    const schoolCode = `${initials}-${Math.floor(100 + Math.random() * 900)}`;
    const count = Math.max(1, Number(params.studentCount) || 50);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const payRef = params.paymentReference?.trim() || `PP-REG-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const receiptNo = `REC-MX-${Math.floor(100000 + Math.random() * 900000)}`;
    const isPaid = params.isPaid !== undefined ? params.isPaid : true;

    const newSchool = {
      id: schoolId,
      name: params.name.trim(),
      regNumber: params.regNumber.trim(),
      email: cleanEmail,
      passwordHash: params.password,
      studentCount: count,
      schoolCode,
      motto: params.motto?.trim() || 'Excellence, Truth & Service',
      createdAt: now.toISOString(),
      electionStatus: 'active',
      electionTitle: `${params.name.trim()} Student Council Elections`,
      academicYear: params.academicYear || '2026/2027',
      licenseFee: 50000,
      licenseCurrency: 'UGX',
      licenseDuration: '1 Month (30 Days)',
      licenseStatus: isPaid ? 'active' : 'pending_payment',
      licenseActivatedAt: now.toISOString(),
      licenseExpiresAt: expiresAt.toISOString(),
      paidAmount: isPaid ? 50000 : 0,
      recipientPhone: 'https://www.paypal.com/ncp/payment/MQS9SB3PQDQUY',
      payerPhone: params.payerPhone || '',
      paymentMethod: params.paymentMethod || 'PayPal / Cards',
      paymentReference: payRef,
      receiptNumber: receiptNo,
      paymentVerifiedAt: isPaid ? now.toISOString() : undefined,
      paymentHistory: isPaid
        ? [
            {
              id: `pay_${Date.now()}`,
              schoolId,
              amount: 50000,
              currency: 'UGX',
              recipientPhone: 'https://www.paypal.com/ncp/payment/MQS9SB3PQDQUY',
              payerPhone: params.payerPhone || '',
              paymentMethod: params.paymentMethod || 'PayPal / Cards',
              paymentReference: payRef,
              receiptNumber: receiptNo,
              status: 'confirmed',
              durationDays: 30,
              activatedAt: now.toISOString(),
              expiresAt: expiresAt.toISOString(),
              verifiedBy: 'Memon Xule PayPal Secure Gateway',
            },
          ]
        : [],
    };

    // Generate Pupil Voter IDs
    const generatedVoters = [];
    for (let i = 1; i <= count; i++) {
      generatedVoters.push({
        id: `voter_${schoolId}_${i}`,
        schoolId,
        voterCode: generateRandomVoterCode(schoolCode, i),
        studentIndex: i,
        hasVoted: false,
      });
    }

    db.schools.push(newSchool);
    db.voters.push(...generatedVoters);
    saveDatabase();

    res.json({
      success: true,
      school: newSchool,
      fullData: db,
    });
  } catch (err: any) {
    console.error('Error during /api/schools/register:', err);
    res.status(500).json({ success: false, error: err.message || 'Registration error' });
  }
});

// Confirm / Renew Payment
app.post('/api/schools/confirm-payment', (req, res) => {
  try {
    const { schoolId, paymentMethod, paymentReference, payerEmailOrPhone, gatewayUrl } = req.body;
    const index = db.schools.findIndex((s) => s.id === schoolId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'School not found.' });
    }

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const payRef = paymentReference?.trim() || `PP-TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const receiptNo = `REC-MX-${Math.floor(100000 + Math.random() * 900000)}`;
    const gateway = gatewayUrl || 'https://www.paypal.com/ncp/payment/MQS9SB3PQDQUY';

    const currentHistory = db.schools[index].paymentHistory || [];
    const newPaymentRecord = {
      id: `pay_${Date.now()}`,
      schoolId,
      amount: 50000,
      currency: 'UGX',
      recipientPhone: gateway,
      payerPhone: payerEmailOrPhone || '',
      paymentMethod: paymentMethod || 'PayPal Secure Payment',
      paymentReference: payRef,
      receiptNumber: receiptNo,
      status: 'confirmed',
      durationDays: 30,
      activatedAt: now.toISOString(),
      expiresAt: newExpiresAt.toISOString(),
      verifiedBy: `Memon Xule PayPal Gateway (${gateway})`,
    };

    db.schools[index] = {
      ...db.schools[index],
      licenseFee: 50000,
      licenseCurrency: 'UGX',
      licenseDuration: '1 Month (30 Days)',
      licenseStatus: 'active',
      licenseActivatedAt: now.toISOString(),
      licenseExpiresAt: newExpiresAt.toISOString(),
      paidAmount: 50000,
      recipientPhone: gateway,
      payerPhone: payerEmailOrPhone || '',
      paymentMethod: paymentMethod || 'PayPal / Card',
      paymentReference: payRef,
      receiptNumber: receiptNo,
      paymentVerifiedAt: now.toISOString(),
      paymentHistory: [newPaymentRecord, ...currentHistory],
      electionStatus: db.schools[index].electionStatus === 'closed' ? 'closed' : 'active',
    };

    saveDatabase();
    res.json({ success: true, school: db.schools[index], fullData: db });
  } catch (err: any) {
    console.error('Error during /api/schools/confirm-payment:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment confirmation error' });
  }
});

// Cast Student Vote
app.post('/api/votes/cast', (req, res) => {
  try {
    const { schoolId, voterCode, selections } = req.body;
    const cleanCode = (voterCode || '').trim().toUpperCase();

    const voterIndex = db.voters.findIndex(
      (v) => v.schoolId === schoolId && v.voterCode.toUpperCase() === cleanCode
    );

    if (voterIndex === -1) {
      return res.status(404).json({ success: false, error: 'Student Voter record not found.' });
    }

    if (db.voters[voterIndex].hasVoted) {
      return res.status(400).json({ success: false, error: 'This ballot has already been submitted.' });
    }

    // Mark voter as voted
    db.voters[voterIndex].hasVoted = true;
    db.voters[voterIndex].votedAt = new Date().toISOString();

    // Anonymous vote record
    const voteRecord = {
      id: `vote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      schoolId,
      voterCodeHash: `hash_${Date.now()}`,
      timestamp: new Date().toISOString(),
      selections: selections || {},
    };

    db.votes.push(voteRecord);
    saveDatabase();

    res.json({ success: true, vote: voteRecord, fullData: db });
  } catch (err: any) {
    console.error('Error during /api/votes/cast:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to cast ballot' });
  }
});

// Vite Middleware for development / Static file serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Memon Xule Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
