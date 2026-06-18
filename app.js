require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');

const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { readStore, bootstrapAdminPassword, writeStore } = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET || 'change-this-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
}));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/auth/login', loginLimiter);

app.use(csurf());

app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAdmin = Boolean(req.session?.admin);
    next();
});

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    etag: true
}));

app.get('/backend', (req, res) => {
    const csrfToken = req.csrfToken();
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin Login | Markaz Imam Ahmad bin Hanbal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://kit.fontawesome.com/4b1e9b3f2d.js" crossorigin="anonymous"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            emerald: { 50: '#f0fdf4', 100: '#dcfce7', 800: '#065f46', 900: '#044235', 950: '#022c22' },
            gold: { 50: '#fef9e7', 400: '#e5c158', 500: '#D4AF37', 600: '#b8932b' }
          },
          fontFamily: { sans: ['Poppins', 'sans-serif'], serif: ['Playfair Display', 'serif'] }
        }
      }
    }
  </script>
</head>
<body class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
    <div class="bg-emerald-900 text-white p-6 text-center">
      <h1 class="font-serif text-2xl font-bold text-gold-500">Backend Login</h1>
      <p class="text-emerald-100 text-sm mt-1">Authorized staff only</p>
    </div>

    <div class="p-6">
      <form id="backendLoginForm" class="space-y-4">
        <input type="hidden" id="csrfToken" value="${csrfToken}" />
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input id="adminUser" type="text" required class="w-full p-3 border rounded-lg outline-none focus:border-emerald-900" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input id="adminPass" type="password" required class="w-full p-3 border rounded-lg outline-none focus:border-emerald-900" />
        </div>
        <button type="submit" class="w-full bg-emerald-900 hover:bg-emerald-950 text-white font-semibold py-3 rounded-lg transition">
          Login
        </button>
        <a href="/" class="block text-center text-sm text-gray-500 hover:text-emerald-900 transition">Back to website</a>
      </form>
    </div>
  </div>

  <script>
    const form = document.getElementById('backendLoginForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('adminUser').value.trim();
      const password = document.getElementById('adminPass').value;
      const csrfToken = document.getElementById('csrfToken').value;

      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Login failed');

        window.location.href = '/';
      } catch (err) {
        alert(err.message || 'Invalid credentials.');
      }
    });
  </script>
</body>
</html>`);
});

app.use(publicRoutes);
app.use(adminRoutes);

app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ ok: false, message: 'Invalid CSRF token.' });
    }
    console.error(err);
    res.status(500).json({ ok: false, message: 'Server error.' });
});

function ensureBootstrapAdmin() {
    const store = readStore();
    if (!store.admin.salt || !store.admin.hash) {
        bootstrapAdminPassword(
            store,
            process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMeNow123!'
        );
        writeStore(store);
        console.log('Bootstrapped default admin credentials. Change them after first login.');
    }
}

ensureBootstrapAdmin();

app.listen(PORT, () => {
    console.log(`Markaz app running on http://localhost:${PORT}`);
});