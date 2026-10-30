/* ═══════════════════════════════════════════════════════
   منصة إتقان — app.js
   (Core + Auth · Home/Chat/Rooms · Bot/Quiz/Cards · Profile/Settings/Admin · Enhancements)
   ═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   منصة إتقان — Core + Auth
   ═══════════════════════════════════════════════════════ */
(function() {
'use strict';

// ═══════════════════════════════════════════════════════
// 1) Firebase Config
// ═══════════════════════════════════════════════════════
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBU4LQ6TKX5Vn9uiQKr-tFrmTj6H8eoZRA",
  authDomain: "aaaa-c3572.firebaseapp.com",
  databaseURL: "https://aaaa-c3572-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "aaaa-c3572",
  storageBucket: "aaaa-c3572.firebasestorage.app",
  messagingSenderId: "374251579590",
  appId: "1:374251579590:web:083c379107735906380fc7"
};

var ADMIN = {
  name: 'admin',
  email: 'admin@itqan.dev',
  password: 'Itqan@2025'
};

// ═══════════════════════════════════════════════════════
// 2) State
// ═══════════════════════════════════════════════════════
var State = {
  user: null,
  screen: 'auth'
};

// ═══════════════════════════════════════════════════════
// 3) Utils
// ═══════════════════════════════════════════════════════
var U = {
  $: function(id) { return document.getElementById(id); },
  $$: function(sel) { return document.querySelectorAll(sel); },
  esc: function(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  },
  safeKey: function(k) { return /^[\w\-]+$/.test(String(k)); },
  genId: function(p) {
    return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },
  initials: function(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  },
  fmtTime: function(ts) {
    try { return new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
    catch(e) { return ''; }
  },
  haptic: function(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch(e) {}
  },
  genSalt: function() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  },
  sha256: function(text) {
    return new Promise(function(resolve) {
      try {
        var buf = new TextEncoder().encode(text);
        crypto.subtle.digest('SHA-256', buf).then(function(hash) {
          var hex = Array.from(new Uint8Array(hash)).map(function(b) {
            return b.toString(16).padStart(2, '0');
          }).join('');
          resolve(hex);
        }).catch(function() { resolve(U.fallbackHash(text)); });
      } catch(e) {
        resolve(U.fallbackHash(text));
      }
    });
  },
  fallbackHash: function(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) {
      h = ((h << 5) - h) + text.charCodeAt(i);
      h = h | 0;
    }
    return Math.abs(h).toString(16);
  },
  hashPw: function(pw, salt) {
    return U.sha256(salt + '::' + pw + '::itqan_v1');
  }
};

// ═══════════════════════════════════════════════════════
// 4) UI
// ═══════════════════════════════════════════════════════
var UI = {
  toast: function(msg, type, dur) {
    type = type || 'info';
    dur = dur || 3000;
    var root = U.$('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    root.appendChild(el);
    requestAnimationFrame(function() { el.classList.add('show'); });
    setTimeout(function() {
      el.classList.remove('show');
      setTimeout(function() { if (el.parentNode) el.remove(); }, 300);
    }, dur);
  },
  modal: function(opts) {
    opts = opts || {};
    var id = U.genId('m');
    var root = U.$('modal-root');
    if (!root) return null;
    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = id;
    var html = '<div class="modal-content">';
    if (opts.title) {
      html += '<div class="modal-header">';
      html += '<h3 class="modal-title">' + U.esc(opts.title) + '</h3>';
      html += '<button class="modal-close" onclick="document.getElementById(\'' + id + '\').remove()">✕</button>';
      html += '</div>';
    }
    html += opts.content || '';
    html += '</div>';
    modal.innerHTML = html;
    root.appendChild(modal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });
    return modal;
  },
  closeAll: function() {
    U.$$('.modal').forEach(function(m) { m.remove(); });
  },
  confirm: function(title, msg) {
    return new Promise(function(resolve) {
      var modal = UI.modal({
        title: title,
        content: '<p style="margin-bottom:20px;color:var(--text-2);font-weight:600">' + U.esc(msg) + '</p>' +
          '<div style="display:flex;gap:8px;justify-content:flex-end">' +
          '<button class="btn btn-secondary" id="c-no">إلغاء</button>' +
          '<button class="btn btn-danger" id="c-yes">تأكيد</button>' +
          '</div>'
      });
      modal.querySelector('#c-yes').onclick = function() { modal.remove(); resolve(true); };
      modal.querySelector('#c-no').onclick = function() { modal.remove(); resolve(false); };
    });
  }
};

// ═══════════════════════════════════════════════════════
// 5) Theme
// ═══════════════════════════════════════════════════════
var Theme = {
  init: function() {
    var saved = localStorage.getItem('itqan_theme');
    if (!saved) {
      var h = new Date().getHours();
      saved = (h >= 18 || h < 6) ? 'dark' : 'light';
    }
    this.set(saved);
  },
  set: function(t) {
    document.body.setAttribute('data-theme', t);
    try { localStorage.setItem('itqan_theme', t); } catch(e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0A1929' : '#064E3B');
  },
  toggle: function() {
    var c = document.body.getAttribute('data-theme');
    this.set(c === 'dark' ? 'light' : 'dark');
  },
  isDark: function() {
    return document.body.getAttribute('data-theme') === 'dark';
  }
};

// ═══════════════════════════════════════════════════════
// 6) Session
// ═══════════════════════════════════════════════════════
var Session = {
  levels: [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000],
  progress: function() {
    var xp = (State.user && State.user.xp) || 0, t = Session.levels, i = 0;
    for (var k = t.length - 1; k >= 0; k--) { if (xp >= t[k]) { i = k; break; } }
    if (t[i + 1] == null) return { pct: 100, cur: xp - t[i], need: 0, max: true };
    return { pct: Math.round((xp - t[i]) / (t[i + 1] - t[i]) * 100), cur: xp - t[i], need: t[i + 1] - t[i], max: false };
  },
  touchStreak: function() {
    try {
      var today = new Date().toISOString().slice(0, 10);
      var d = JSON.parse(localStorage.getItem('itqan_streak') || '{}');
      if (d.last === today) return d.count || 1;
      var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      var count = d.last === y ? (d.count || 0) + 1 : 1;
      localStorage.setItem('itqan_streak', JSON.stringify({ last: today, count: count }));
      return count;
    } catch(e) { return 1; }
  },
  getStreak: function() {
    try { return (JSON.parse(localStorage.getItem('itqan_streak') || '{}').count) || 0; } catch(e) { return 0; }
  },
  load: function() {
    try {
      var s = localStorage.getItem('itqan_session');
      if (s) { State.user = JSON.parse(s); return true; }
    } catch(e) {}
    return false;
  },
  save: function(user) {
    State.user = {
      uid: user.uid,
      name: user.name || '',
      email: user.email || '',
      avatar: user.avatar || '',
      role: user.role || 'member',
      level: user.level || 1,
      xp: user.xp || 0
    };
    try { localStorage.setItem('itqan_session', JSON.stringify(State.user)); } catch(e) {}
    Session.touchStreak();
  },
  clear: function() {
    State.user = null;
    try { localStorage.removeItem('itqan_session'); } catch(e) {}
  },
  isLoggedIn: function() { return !!(State.user && State.user.uid); },
  isAdmin: function() {
    if (!State.user) return false;
    return State.user.role === 'admin' || State.user.role === 'developer';
  },
  addXP: function(n) {
    if (!State.user) return;
    var oldLvl = State.user.level || 1;
    State.user.xp = (State.user.xp || 0) + n;
    var t = Session.levels;
    var lvl = 1;
    for (var i = t.length - 1; i >= 0; i--) {
      if (State.user.xp >= t[i]) { lvl = i + 1; break; }
    }
    State.user.level = lvl;
    if (lvl > oldLvl) {
      UI.toast('🎉 وصلت للمستوى ' + lvl, 'success', 4000);
      if (UI.confetti) UI.confetti();
    }
    try { localStorage.setItem('itqan_session', JSON.stringify(State.user)); } catch(e) {}
    if (window.db && State.user.uid && State.user.uid.indexOf('guest') !== 0) {
      window.db.ref('users/' + State.user.uid).update({
        xp: State.user.xp,
        level: State.user.level,
        lastActive: Date.now()
      }).catch(function() {});
    }
  }
};

// ═══════════════════════════════════════════════════════
// 7) Router
// ═══════════════════════════════════════════════════════
var Router = {
  routes: {},
  hooks: [],
  onRender: function(fn) { this.hooks.push(fn); },
  afterRender: function() {
    this.hooks.forEach(function(h) { try { h(); } catch(e) { console.error(e); } });
  },
  current: null,
  register: function(name, fn) { this.routes[name] = fn; },
  go: function(name, params) {
    var fn = this.routes[name];
    if (!fn) { console.warn('No route:', name); return false; }
    this.current = name;
    State.screen = name;
    var root = U.$('app-root');
    if (!root) return false;
    try {
      root.innerHTML = fn(params || {}) || '';
      window.scrollTo(0, 0);
      Router.afterRender();
      return true;
    } catch(e) {
      console.error('Render error:', name, e);
      root.innerHTML = '<div style="padding:40px;text-align:center;color:var(--red-600)">حدث خطأ</div>';
      return false;
    }
  }
};

// ═══════════════════════════════════════════════════════
// 8) Firebase Init
// ═══════════════════════════════════════════════════════
function initFirebase() {
  try {
    if (typeof firebase === 'undefined') return false;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    window.db = firebase.database();
    window.fbAuth = firebase.auth();
    return true;
  } catch(e) {
    console.error('Firebase error:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// 9) Layout Helpers
// ═══════════════════════════════════════════════════════
function Sidebar(active) {
  if (!Session.isLoggedIn()) return '';
  var s = State.user;
  var items = [
    { screen: 'home', icon: '🏠', label: 'الرئيسية' },
    { screen: 'chat', icon: '💬', label: 'الدردشة' },
    { screen: 'rooms', icon: '🏘️', label: 'الغرف' },
    { screen: 'bot', icon: '🤖', label: 'المساعد' },
    { screen: 'quiz', icon: '📄', label: 'الاختبارات' },
    { screen: 'cards', icon: '🃏', label: 'البطاقات' },
    { screen: 'profile', icon: '👤', label: 'الملف' }
  ];
  var navHtml = items.map(function(item) {
    return '<button class="sidebar-item ' + (active === item.screen ? 'active' : '') + '" onclick="App.go(\'' + item.screen + '\')">' +
      '<span class="sidebar-item-icon">' + item.icon + '</span><span>' + item.label + '</span></button>';
  }).join('');

  if (Session.isAdmin()) {
    navHtml += '<button class="sidebar-item ' + (active === 'admin' ? 'active' : '') + '" onclick="App.go(\'admin\')">' +
      '<span class="sidebar-item-icon">👑</span><span>لوحة التحكم</span></button>';
  }

  navHtml += '<button class="sidebar-item ' + (active === 'settings' ? 'active' : '') + '" onclick="App.go(\'settings\')">' +
    '<span class="sidebar-item-icon">⚙️</span><span>الإعدادات</span></button>';

  return '<aside class="app-sidebar">' +
    '<div class="sidebar-brand">' +
    '<div class="sidebar-logo">إ</div>' +
    '<div><div class="sidebar-name">منصة إتقان</div><div class="sidebar-sub">حيث يتقن العلم</div></div>' +
    '</div>' +
    '<nav class="sidebar-nav">' + navHtml + '</nav>' +
    '<div class="sidebar-footer">' +
    '<div class="sidebar-user" onclick="App.go(\'profile\')">' +
    '<div class="avatar">' + (s.avatar ? '<img src="' + U.esc(s.avatar) + '" alt="">' : U.initials(s.name)) + '</div>' +
    '<div><div class="sidebar-user-name">' + U.esc(s.name) + '</div><div class="sidebar-user-lvl">Level ' + s.level + '</div></div>' +
    '</div>' +
    '</div>' +
    '</aside>';
}

function Header(title) {
  return '<header class="app-header">' +
    '<h1 class="header-title">' + U.esc(title) + '</h1>' +
    '<button class="btn-icon" onclick="App.toggleTheme();this.textContent=App.theme.isDark()?\'☀️\':\'🌙\'" aria-label="تبديل الثيم">' + (Theme.isDark() ? '☀️' : '🌙') + '</button>' +
    '</header>';
}

function BottomNav(active) {
  var items = [
    { screen: 'home', icon: '🏠', label: 'الرئيسية' },
    { screen: 'chat', icon: '💬', label: 'دردشة' },
    { screen: 'rooms', icon: '🏘️', label: 'غرف' },
    { screen: 'quiz', icon: '📄', label: 'اختبار' },
    { screen: 'profile', icon: '👤', label: 'ملفي' }
  ];
  return '<nav class="bottom-nav">' +
    items.map(function(item) {
      return '<button class="nav-item ' + (active === item.screen ? 'active' : '') + '" onclick="App.go(\'' + item.screen + '\')">' +
        '<span class="nav-item-icon">' + item.icon + '</span><span>' + item.label + '</span></button>';
    }).join('') +
    '</nav>';
}

// ═══════════════════════════════════════════════════════
// 10) AUTH SCREEN
// ═══════════════════════════════════════════════════════
function AuthScreen() {
  return '<div class="auth-screen">' +
    '<div class="auth-container">' +
    '<div class="auth-header">' +
    '<div class="auth-logo">إ</div>' +
    '<h1 class="auth-title">منصة إتقان</h1>' +
    '<p class="auth-subtitle">حيث يتقن العلم</p>' +
    '</div>' +
    '<div class="auth-card">' +
    '<button class="btn btn-google btn-block btn-lg" onclick="Auth.googleSignIn()" id="google-btn">' +
    '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>' +
    '<span>المتابعة بـ Google</span>' +
    '</button>' +
    '<div class="auth-divider"><span>أو</span></div>' +
    '<div class="auth-tabs">' +
    '<button class="auth-tab active" onclick="Auth.switchTab(\'signin\')">تسجيل الدخول</button>' +
    '<button class="auth-tab" onclick="Auth.switchTab(\'signup\')">حساب جديد</button>' +
    '</div>' +
    '<form class="auth-form active" id="form-signin" onsubmit="Auth.signin(event)">' +
    '<div class="field"><label>البريد الإلكتروني أو اسم المستخدم</label>' +
    '<input class="input" type="text" id="signin-email" placeholder="you@example.com" autocomplete="username" required></div>' +
    '<div class="field"><label>كلمة المرور</label>' +
    '<div class="password-wrapper">' +
    '<input class="input" type="password" id="signin-password" placeholder="••••••••" autocomplete="current-password" required>' +
    '<button type="button" class="password-toggle" onclick="Auth.togglePw(this,\'signin-password\')">👁️</button>' +
    '</div></div>' +
    '<button type="submit" class="btn btn-block btn-lg" id="signin-btn">تسجيل الدخول</button>' +
    '</form>' +
    '<form class="auth-form" id="form-signup" onsubmit="Auth.signup(event)">' +
    '<div class="field"><label>الاسم الكامل</label>' +
    '<input class="input" type="text" id="signup-name" placeholder="اسمك" maxlength="40" autocomplete="name" required></div>' +
    '<div class="field"><label>البريد الإلكتروني</label>' +
    '<input class="input" type="email" id="signup-email" placeholder="you@example.com" autocomplete="email" required></div>' +
    '<div class="field"><label>كلمة المرور</label>' +
    '<div class="password-wrapper">' +
    '<input class="input" type="password" id="signup-password" placeholder="6 أحرف على الأقل" minlength="6" autocomplete="new-password" required>' +
    '<button type="button" class="password-toggle" onclick="Auth.togglePw(this,\'signup-password\')">👁️</button>' +
    '</div><div class="field-hint">6 أحرف على الأقل</div></div>' +
    '<button type="submit" class="btn btn-block btn-lg" id="signup-btn">إنشاء الحساب</button>' +
    '</form>' +
    '<div class="auth-divider"><span>أو</span></div>' +
    '<button class="btn btn-secondary btn-block" onclick="Auth.guest()">👤 الدخول كضيف</button>' +
    '</div>' +
    '<div class="auth-footer">© 2025 منصة إتقان</div>' +
    '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════
// 11) AUTH METHODS
// ═══════════════════════════════════════════════════════
var Auth = {
  switchTab: function(tab) {
    var tabs = U.$$('.auth-tab');
    tabs.forEach(function(t, i) {
      t.classList.toggle('active', i === (tab === 'signin' ? 0 : 1));
    });
    var forms = U.$$('.auth-form');
    forms.forEach(function(f) {
      f.classList.toggle('active', f.id === 'form-' + tab);
    });
  },

  togglePw: function(btn, id) {
    var inp = U.$(id);
    if (!inp) return;
    var isPw = inp.type === 'password';
    inp.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁️';
  },

  signin: async function(e) {
    e.preventDefault();
    var email = U.$('signin-email').value.trim().toLowerCase();
    var pw = U.$('signin-password').value;

    if (!email || !pw) { UI.toast('أكمل البيانات', 'error'); return; }

    var btn = U.$('signin-btn');
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>...';

    try {
      if (!window.db) throw new Error('Firebase غير متصل');

      // Admin shortcut
      if ((email === ADMIN.name || email === ADMIN.email) && pw === ADMIN.password) {
        var snap = await window.db.ref('users').once('value');
        var users = snap.val() || {};
        var adminUid = null, adminData = null;
        for (var uid in users) {
          if (users[uid].name === 'admin' || users[uid].email === ADMIN.email) {
            adminUid = uid;
            adminData = users[uid];
            break;
          }
        }
        if (!adminUid) {
          var salt = U.genSalt();
          var hash = await U.hashPw(ADMIN.password, salt);
          adminUid = 'admin_' + Date.now();
          adminData = {
            name: 'admin',
            email: ADMIN.email,
            salt: salt,
            hash: hash,
            role: 'developer',
            level: 99,
            xp: 0,
            createdAt: Date.now()
          };
          await window.db.ref('users/' + adminUid).set(adminData);
        }
        Session.save({
          uid: adminUid,
          name: adminData.name,
          email: adminData.email,
          role: adminData.role,
          level: adminData.level,
          xp: adminData.xp
        });
        UI.toast('مرحباً يا أدمن', 'success');
        U.haptic(20);
        setTimeout(function() { Router.go('home'); }, 200);
        return;
      }

      // Find user
      var user = null, foundUid = null;
      var byEmail = await window.db.ref('users').orderByChild('email').equalTo(email).once('value');
      if (byEmail.exists()) {
        var val = byEmail.val();
        foundUid = Object.keys(val)[0];
        user = val[foundUid];
      } else {
        var byName = await window.db.ref('users').orderByChild('name').equalTo(email).once('value');
        if (byName.exists()) {
          var val2 = byName.val();
          foundUid = Object.keys(val2)[0];
          user = val2[foundUid];
        }
      }

      if (!user) {
        UI.toast('البريد أو كلمة المرور غير صحيحة', 'error');
        btn.disabled = false;
        btn.innerHTML = orig;
        return;
      }

      if (user.banned) {
        UI.toast('🚫 الحساب محظور', 'error');
        btn.disabled = false;
        btn.innerHTML = orig;
        return;
      }

      var userHash = await U.hashPw(pw, user.salt || '');
      if (userHash !== user.hash) {
        UI.toast('البريد أو كلمة المرور غير صحيحة', 'error');
        btn.disabled = false;
        btn.innerHTML = orig;
        return;
      }

      Session.save({
        uid: foundUid,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        level: user.level,
        xp: user.xp
      });
      await window.db.ref('users/' + foundUid + '/lastActive').set(Date.now());
      UI.toast('مرحباً ' + user.name, 'success');
      U.haptic(20);
      setTimeout(function() { Router.go('home'); }, 200);

    } catch(err) {
      console.error(err);
      UI.toast('خطأ: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  },

  signup: async function(e) {
    e.preventDefault();
    var name = U.$('signup-name').value.trim();
    var email = U.$('signup-email').value.trim().toLowerCase();
    var pw = U.$('signup-password').value;

    if (!name || name.length < 2) { UI.toast('الاسم قصير', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.toast('بريد غير صالح', 'error'); return; }
    if (pw.length < 6) { UI.toast('كلمة المرور قصيرة', 'error'); return; }

    var btn = U.$('signup-btn');
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>...';

    try {
      if (!window.db) throw new Error('Firebase غير متصل');
      var snap = await window.db.ref('users').orderByChild('email').equalTo(email).once('value');
      if (snap.exists()) {
        UI.toast('البريد مستخدم', 'error');
        btn.disabled = false;
        btn.innerHTML = orig;
        return;
      }

      var uid = U.genId('u');
      var salt = U.genSalt();
      var hash = await U.hashPw(pw, salt);
      var data = {
        name: name,
        email: email,
        avatar: '',
        salt: salt,
        hash: hash,
        role: 'member',
        level: 1,
        xp: 0,
        createdAt: Date.now(),
        lastActive: Date.now()
      };
      await window.db.ref('users/' + uid).set(data);
      Session.save({
        uid: uid,
        name: name,
        email: email,
        avatar: '',
        role: 'member',
        level: 1,
        xp: 0
      });
      UI.toast('تم إنشاء حسابك', 'success');
      U.haptic(20);
      setTimeout(function() { Router.go('home'); }, 200);

    } catch(err) {
      console.error(err);
      UI.toast('خطأ: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  },

  googleSignIn: async function() {
    var btn = U.$('google-btn');
    if (!btn) return;
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> جاري الاتصال...';

    try {
      if (!window.fbAuth) throw new Error('Firebase Auth غير متصل');
      var provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      var result = await window.fbAuth.signInWithPopup(provider);
      var guser = result.user;

      if (!guser || !guser.email) throw new Error('لم يتم الحصول على البيانات');

      var snap = await window.db.ref('users').orderByChild('email').equalTo(guser.email.toLowerCase()).once('value');

      var uid, userData;

      if (snap.exists()) {
        var val = snap.val();
        uid = Object.keys(val)[0];
        userData = val[uid];
        await window.db.ref('users/' + uid).update({
          lastActive: Date.now(),
          googleUid: guser.uid,
          avatar: userData.avatar || guser.photoURL || ''
        });
        userData.avatar = userData.avatar || guser.photoURL || '';
      } else {
        uid = U.genId('u');
        userData = {
          name: guser.displayName || guser.email.split('@')[0],
          email: guser.email.toLowerCase(),
          avatar: guser.photoURL || '',
          googleUid: guser.uid,
          role: 'member',
          level: 1,
          xp: 0,
          provider: 'google',
          createdAt: Date.now(),
          lastActive: Date.now()
        };
        await window.db.ref('users/' + uid).set(userData);
      }

      Session.save({
        uid: uid,
        name: userData.name,
        email: userData.email,
        avatar: userData.avatar || '',
        role: userData.role,
        level: userData.level,
        xp: userData.xp
      });
      UI.toast('مرحباً ' + userData.name, 'success');
      U.haptic(20);
      setTimeout(function() { Router.go('home'); }, 300);

    } catch(err) {
      console.error(err);
      var code = err.code || '';
      if (code === 'auth/popup-closed-by-user') {
        UI.toast('تم إغلاق النافذة', 'warning');
      } else if (code === 'auth/popup-blocked') {
        UI.toast('المتصفح منع النافذة', 'error');
      } else if (code === 'auth/operation-not-allowed') {
        UI.toast('فعّل Google في Firebase Console', 'error', 6000);
      } else if (code === 'auth/unauthorized-domain') {
        UI.toast('الدومين غير مصرح', 'error', 6000);
      } else {
        UI.toast('فشل: ' + (err.message || 'خطأ'), 'error');
      }
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  },

  guest: function() {
    var guestId = U.genId('guest');
    Session.save({
      uid: guestId,
      name: 'ضيف',
      email: '',
      avatar: '',
      role: 'guest',
      level: 1,
      xp: 0
    });
    UI.toast('دخلت كضيف', 'info');
    setTimeout(function() { Router.go('home'); }, 100);
  }
};

// ═══════════════════════════════════════════════════════
// 12) Global API
// ═══════════════════════════════════════════════════════
window.App = {
  state: State,
  utils: U,
  ui: UI,
  theme: Theme,
  session: Session,
  router: Router,
  auth: Auth,
  config: { ADMIN: ADMIN, firebase: FIREBASE_CONFIG },
  go: function(name, params) { return Router.go(name, params); },
  current: function() { return Router.current; },
  toggleTheme: function() { Theme.toggle(); },
  isLoggedIn: function() { return Session.isLoggedIn(); },
  isAdmin: function() { return Session.isAdmin(); },
  addXP: function(n) { Session.addXP(n); },
  layout: {
    Sidebar: Sidebar,
    Header: Header,
    BottomNav: BottomNav
  }
};

window.Auth = Auth;
window.UI = UI;
window.Session = Session;
window.Router = Router;
window.U = U;

// ═══════════════════════════════════════════════════════
// 13) Register Auth Route
// ═══════════════════════════════════════════════════════
Router.register('auth', AuthScreen);

// ═══════════════════════════════════════════════════════
// 14) Init
// ═══════════════════════════════════════════════════════
function init() {
  console.log('%c🚀 منصة إتقان — Loading...', 'color:#059669;font-size:14px;font-weight:bold;');

  var fbOk = initFirebase();
  console.log(fbOk ? '  ✓ Firebase' : '  ✗ Firebase');

  Theme.init();
  console.log('  ✓ Theme');

  var hasSession = Session.load();
  if (hasSession) Session.touchStreak();
  console.log('  ' + (hasSession ? '✓' : '–') + ' Session');

  setTimeout(function() {
    var splash = U.$('splash');
    if (splash) {
      splash.classList.add('hide');
      setTimeout(function() { if (splash.parentNode) splash.remove(); }, 500);
    }

    if (hasSession && Session.isLoggedIn()) {
      Router.go('home');
    } else {
      Router.go('auth');
    }
  }, 900);

  console.log('%c✅ Core + Auth Ready', 'color:#10B981;font-weight:bold;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();

/* ═══════════════════════════════════════════════════════
   منصة إتقان — Home + Chat + Rooms
   ═══════════════════════════════════════════════════════ */
(function() {
'use strict';

if (!window.App) { console.error('App not loaded'); return; }

var App = window.App;
var U = App.utils;
var UI = App.ui;
var Session = App.session;
var Router = App.router;
var layout = App.layout;

// ═══════════════════════════════════════════════════════
// 1) HOME SCREEN
// ═══════════════════════════════════════════════════════
function HomeScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }
  var s = App.state.user;
  var hour = new Date().getHours();
  var greet = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير';

  var pr = Session.progress();
  var progressHtml = '<div class="xp-bar"><div class="xp-bar-fill" style="width:' + pr.pct + '%"></div></div>' +
    '<div class="xp-meta"><span>المستوى ' + (s.level || 1) + '</span><span>' + (pr.max ? 'أعلى مستوى 👑' : pr.cur + ' / ' + pr.need + ' XP') + '</span></div>';
  var tips = [
    'ذاكر بنظام بومودورو: ٢٥ دقيقة تركيز و٥ دقايق راحة',
    'اشرح الدرس بصوت عالي — لو عرفت تشرحه يبقى فهمته',
    'راجع بعد ٢٤ ساعة، التكرار المتباعد بيثبّت المعلومة',
    'نوم ٧–٨ ساعات بيثبّت اللي ذاكرته',
    'ابعد الموبايل وقت المذاكرة',
    'قسّم المنهج لأجزاء صغيرة وخلّص جزء كل يوم',
    'اختبر نفسك أكتر ما بتقرا — الاسترجاع أقوى من القراءة'
  ];
  var tip = tips[new Date().getDate() % tips.length];

  var actions = [
    { screen: 'chat', icon: '💬', label: 'الدردشة', desc: 'تحدث مع زمايلك', bg: 'linear-gradient(135deg,#DBEAFE,#BFDBFE)' },
    { screen: 'bot', icon: '🤖', label: 'المساعد', desc: 'اسأل أي حاجة', bg: 'linear-gradient(135deg,#D1FAE5,#A7F3D0)' },
    { screen: 'quiz', icon: '📄', label: 'الاختبارات', desc: 'اختبر نفسك', bg: 'linear-gradient(135deg,#FEF3C7,#FDE68A)' },
    { screen: 'cards', icon: '🃏', label: 'البطاقات', desc: 'احفظ المفاهيم', bg: 'linear-gradient(135deg,#EDE9FE,#DDD6FE)' }
  ];

  return '<div class="app-layout">' +
    layout.Sidebar('home') +
    '<div class="app-main">' +
    layout.Header('الرئيسية') +
    '<main class="app-content">' +
    '<div class="welcome">' +
    '<div class="welcome-greet">' + greet + '،</div>' +
    '<div class="welcome-name">' + U.esc(s.name) + '</div>' +
    '<div class="welcome-sub">مستعد للتعلم؟</div>' +
    progressHtml +
    '</div>' +
    '<div class="stats">' +
    '<div class="stat"><div class="stat-icon" style="background:#FEF3C7;color:#D97706">⚡</div><div class="stat-value" data-count="' + (s.xp || 0) + '">' + (s.xp || 0) + '</div><div class="stat-label">XP</div></div>' +
    '<div class="stat"><div class="stat-icon" style="background:#D1FAE5;color:#059669">🏅</div><div class="stat-value">' + (s.level || 1) + '</div><div class="stat-label">المستوى</div></div>' +
    '<div class="stat"><div class="stat-icon" style="background:#DBEAFE;color:#2563EB">🔥</div><div class="stat-value" data-count="' + Session.getStreak() + '">' + Session.getStreak() + '</div><div class="stat-label">Streak</div></div>' +
    '</div>' +
    '<div class="tip-card"><div class="tip-icon">💡</div><div><div class="tip-title">نصيحة اليوم</div><div class="tip-text">' + U.esc(tip) + '</div></div></div>' +
    '<h3 class="section-title">إيه اللي عايز تعمله؟</h3>' +
    '<div class="quick-actions">' +
    actions.map(function(a) {
      return '<div class="quick-action" onclick="App.go(\'' + a.screen + '\')">' +
        '<div class="quick-icon" style="background:' + a.bg + '">' + a.icon + '</div>' +
        '<div style="flex:1"><div class="quick-title">' + a.label + '</div><div class="quick-desc">' + a.desc + '</div></div>' +
        '<span style="color:var(--text-3);font-size:18px">‹</span>' +
        '</div>';
    }).join('') +
    '</div>' +
    '</main>' +
    layout.BottomNav('home') +
    '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════
// 2) CHAT STATE
// ═══════════════════════════════════════════════════════
var ChatState = {
  room: 'GENERAL',
  messages: {},
  users: {},
  listeners: [],
  heartbeatInt: null,
  typingTimeout: null,
  replyTo: null,
  pendingMedia: null,
  mediaRecorder: null,
  recordChunks: [],
  recordStart: 0,
  recordTimer: null,
  isRecording: false,
  currentAudio: null,
  currentAudioId: null
};
window.ChatState = ChatState;

// ═══════════════════════════════════════════════════════
// 3) CHAT SCREEN
// ═══════════════════════════════════════════════════════
function ChatScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }
  setTimeout(function() { startChatSession(); }, 100);

  return '<div class="app-layout">' +
    layout.Sidebar('chat') +
    '<div class="app-main">' +
    layout.Header('الدردشة') +
    '<main class="app-content" style="padding:12px">' +
    '<div class="chat-container">' +
    '<div class="chat-header">' +
    '<button class="btn-icon" onclick="App.go(\'rooms\')" title="الغرف">🏘️</button>' +
    '<div class="chat-header-icon">💬</div>' +
    '<div class="chat-header-info">' +
    '<div class="chat-header-title" id="chat-room-name">' + U.esc(ChatState.room) + '</div>' +
    '<div class="chat-header-sub" id="chat-online">جاري التحميل...</div>' +
    '</div>' +
    '</div>' +
    '<div class="typing-indicator" id="chat-typing"></div>' +
    '<div class="chat-body" id="chat-body">' +
    '<div class="chat-empty"><div class="chat-empty-icon">💬</div><div class="chat-empty-title">جاري التحميل...</div></div>' +
    '</div>' +
    '<div class="reply-preview" id="chat-reply-preview">' +
    '<div class="reply-preview-content">' +
    '<div class="reply-preview-name" id="chat-reply-name"></div>' +
    '<div class="reply-preview-text" id="chat-reply-text"></div>' +
    '</div>' +
    '<button class="reply-preview-close" onclick="Chat.cancelReply()">✕</button>' +
    '</div>' +
    '<div class="chat-input-area">' +
    '<button class="chat-btn" onclick="Chat.showEmoji(this)">😊</button>' +
    '<button class="chat-btn" onclick="Chat.pickImage()">📷</button>' +
    '<button class="chat-btn" id="chat-mic-btn" onclick="Chat.toggleRecord()">🎤</button>' +
    '<input class="input chat-input" id="chat-input" type="text" placeholder="اكتب رسالة..." ' +
    'onkeypress="if(event.key===\'Enter\'){Chat.send()}" oninput="Chat.typing()">' +
    '<button class="chat-send" onclick="Chat.send()">➤</button>' +
    '</div>' +
    '</div>' +
    '</main>' +
    layout.BottomNav('chat') +
    '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════
// 4) CHAT SESSION
// ═══════════════════════════════════════════════════════
function startChatSession() {
  var s = App.state.user;
  if (!window.db || !s.uid) return;

  var uid = s.uid;
  var room = ChatState.room;

  ChatState.listeners.forEach(function(ref) { try { ref.off(); } catch(e) {} });
  ChatState.listeners = [];
  if (ChatState.heartbeatInt) clearInterval(ChatState.heartbeatInt);

  var userRef = window.db.ref('rooms/' + room + '/users/' + uid);
  userRef.set({ name: s.name, avatar: s.avatar || '', lastSeen: firebase.database.ServerValue.TIMESTAMP });
  userRef.onDisconnect().remove();

  ChatState.heartbeatInt = setInterval(function() {
    window.db.ref('rooms/' + room + '/users/' + uid + '/lastSeen')
      .set(firebase.database.ServerValue.TIMESTAMP);
  }, 20000);

  var usersRef = window.db.ref('rooms/' + room + '/users');
  usersRef.on('value', function(snap) {
    var users = snap.val() || {};
    ChatState.users = users;
    var el = U.$('chat-online');
    if (el) el.textContent = Object.keys(users).length + ' متصل';
  });
  ChatState.listeners.push(usersRef);

  var msgRef = window.db.ref('rooms/' + room + '/messages').limitToLast(100);
  msgRef.on('value', function(snap) {
    ChatState.messages = snap.val() || {};
    renderMessages();
  });
  ChatState.listeners.push(msgRef);

  var typingRef = window.db.ref('rooms/' + room + '/typing');
  typingRef.on('value', function(snap) {
    var t = snap.val() || {};
    var names = Object.keys(t)
      .filter(function(k) { return k !== uid && (Date.now() - (t[k].ts || 0)) < 4000; })
      .map(function(k) { return t[k].name; });
    var bar = U.$('chat-typing');
    if (bar) bar.textContent = names.length ? names.join(', ') + ' يكتب...' : '';
  });
  ChatState.listeners.push(typingRef);

  console.log('🔌 Chat session:', room);
}

// ═══════════════════════════════════════════════════════
// 5) RENDER MESSAGES
// ═══════════════════════════════════════════════════════
function renderMessages() {
  var body = U.$('chat-body');
  if (!body) return;
  var msgs = ChatState.messages;
  var keys = Object.keys(msgs).filter(U.safeKey).sort(function(a, b) {
    return (msgs[a].timestamp || 0) - (msgs[b].timestamp || 0);
  });

  if (!keys.length) {
    body.innerHTML = '<div class="chat-empty"><div class="chat-empty-icon">💬</div><div class="chat-empty-title">لا رسائل بعد</div><div class="chat-empty-desc">كن أول من يبدأ</div></div>';
    return;
  }

  var atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 100;
  var s = App.state.user;

  body.innerHTML = keys.map(function(k) {
    return renderOneMessage(k, msgs[k], s);
  }).join('');

  if (atBottom) body.scrollTop = body.scrollHeight;
}

function renderOneMessage(id, m, s) {
  var mine = m.userId === s.uid;
  var time = m.timestamp ? U.fmtTime(m.timestamp) : '';
  var initials = U.initials(m.name || '?');
  var avatarHtml = m.avatar ? '<img src="' + U.esc(m.avatar) + '" alt="">' : initials;

  var replyCtx = '';
  if (m.replyTo) {
    replyCtx = '<div class="msg-reply-ctx"><div class="rname">↩ ' + U.esc(m.replyTo.name) + '</div><div class="rprev">' + U.esc(m.replyTo.preview) + '</div></div>';
  }

  var content = '';
  if (m.type === 'image' && m.media && m.media.data) {
    content = '<img class="msg-img" src="' + U.esc(m.media.data) + '" onclick="Chat.lightbox(\'' + id + '\')" loading="lazy">';
    if (m.text) content += '<div style="margin-top:4px">' + U.esc(m.text) + '</div>';
  } else if (m.type === 'audio' && m.media && m.media.data) {
    var dur = Math.round(m.media.duration || 0);
    var bars = '';
    for (var i = 0; i < 20; i++) bars += '<span style="height:' + (4 + Math.random() * 14) + 'px"></span>';
    content = '<div class="msg-audio"><button class="msg-audio-play" onclick="Chat.toggleAudio(\'' + id + '\')" id="play-' + id + '">▶</button><div class="audio-wave">' + bars + '</div><span style="font-size:11px;opacity:.8">' + dur + 'ث</span></div><audio id="audio-' + id + '" src="' + U.esc(m.media.data) + '" preload="metadata"></audio>';
  } else {
    content = U.esc(m.text || '');
  }

  var reactions = '';
  if (m.reactions && Object.keys(m.reactions).length) {
    reactions = '<div class="msg-reactions">';
    Object.keys(m.reactions).forEach(function(emo) {
      if (!/^[^'"\\<>&]{1,8}$/.test(emo)) return;
      var users = m.reactions[emo] || {};
      var count = Object.keys(users).length;
      var isMine = users[s.uid];
      reactions += '<button class="reaction-chip ' + (isMine ? 'mine' : '') + '" onclick="Chat.react(\'' + id + '\',\'' + emo + '\')">' + emo + ' ' + count + '</button>';
    });
    reactions += '</div>';
  }

  var actions = '<div class="msg-actions">' +
    '<button class="msg-action" onclick="Chat.replyTo(\'' + id + '\')">رد</button>' +
    '<button class="msg-action" onclick="Chat.react(\'' + id + '\',\'❤️\')">❤️</button>' +
    '<button class="msg-action" onclick="Chat.react(\'' + id + '\',\'👍\')">👍</button>' +
    (mine ? '<button class="msg-action" onclick="Chat.deleteMsg(\'' + id + '\')">🗑</button>' : '') +
    '</div>';

  return '<div class="msg ' + (mine ? 'mine' : '') + '">' +
    '<div class="msg-avatar">' + avatarHtml + '</div>' +
    '<div class="msg-content">' +
    '<div class="msg-meta">' + U.esc(m.name || '?') + ' • ' + time + '</div>' +
    '<div class="msg-bubble">' + replyCtx + content + '</div>' +
    reactions + actions +
    '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════
// 6) CHAT METHODS
// ═══════════════════════════════════════════════════════
var Chat = {
  send: async function() {
    var inp = U.$('chat-input');
    var text = inp && inp.value.trim();
    if (!text) return;
    if (!window.db) { UI.toast('Firebase غير متصل', 'error'); return; }

    var s = App.state.user;
    var id = U.genId('m');
    var payload = {
      type: 'text',
      text: text,
      name: s.name,
      avatar: s.avatar || '',
      userId: s.uid,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    if (ChatState.replyTo) {
      payload.replyTo = ChatState.replyTo;
      Chat.cancelReply();
    }

    try {
      await window.db.ref('rooms/' + ChatState.room + '/messages/' + id).set(payload);
      inp.value = '';
      Session.addXP(2);
    } catch(e) { UI.toast('فشل: ' + e.message, 'error'); }
  },

  typing: function() {
    var s = App.state.user;
    if (!s.uid || !window.db) return;
    var ref = window.db.ref('rooms/' + ChatState.room + '/typing/' + s.uid);
    ref.set({ name: s.name, ts: Date.now() });
    ref.onDisconnect().remove();
    clearTimeout(ChatState.typingTimeout);
    ChatState.typingTimeout = setTimeout(function() { ref.remove(); }, 2500);
  },

  replyTo: function(id) {
    var m = ChatState.messages[id];
    if (!m) return;
    var preview = m.type === 'image' ? '📷 صورة' : m.type === 'audio' ? '🎤 صوت' : (m.text || '').slice(0, 50);
    ChatState.replyTo = { id: id, name: m.name || '?', preview: preview };
    var nameEl = U.$('chat-reply-name');
    var textEl = U.$('chat-reply-text');
    var previewEl = U.$('chat-reply-preview');
    if (nameEl) nameEl.textContent = '↩ ' + ChatState.replyTo.name;
    if (textEl) textEl.textContent = preview;
    if (previewEl) previewEl.classList.add('show');
    U.$('chat-input') && U.$('chat-input').focus();
  },

  cancelReply: function() {
    ChatState.replyTo = null;
    var el = U.$('chat-reply-preview');
    if (el) el.classList.remove('show');
  },

  react: function(id, emo) {
    var s = App.state.user;
    if (!s.uid) return;
    var ref = window.db.ref('rooms/' + ChatState.room + '/messages/' + id + '/reactions/' + emo + '/' + s.uid);
    ref.once('value').then(function(snap) {
      if (snap.val()) ref.remove();
      else ref.set(true);
    });
  },

  deleteMsg: function(id) {
    UI.confirm('حذف', 'حذف هذه الرسالة؟').then(function(ok) {
      if (!ok) return;
      window.db.ref('rooms/' + ChatState.room + '/messages/' + id).remove();
      UI.toast('تم الحذف', 'success');
    });
  },

  showEmoji: function(btn) {
    var existing = document.querySelector('.emoji-picker');
    if (existing) { existing.remove(); return; }
    var emojis = ['😀','😁','😂','🤣','😊','😍','🤔','😎','😢','😡','👍','👎','❤️','🔥','✨','🎉','💯','👏','🙏','💪','🎓','📚','📝','✅','❌','⭐','🚀','💡'];
    var picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.innerHTML = emojis.map(function(e) { return '<button onclick="Chat.insertEmoji(\'' + e + '\')">' + e + '</button>'; }).join('');
    btn.parentNode.appendChild(picker);
    setTimeout(function() {
      document.addEventListener('click', function close(e) {
        if (!picker.contains(e.target) && e.target !== btn) {
          picker.remove();
          document.removeEventListener('click', close);
        }
      }, { once: true });
    }, 10);
  },

  insertEmoji: function(e) {
    var inp = U.$('chat-input');
    if (inp) { inp.value += e; inp.focus(); }
    var p = document.querySelector('.emoji-picker');
    if (p) p.remove();
  },

  pickImage: function() {
    var s = App.state.user;
    if (!s.uid) return;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { UI.toast('الصورة كبيرة (5MB max)', 'error'); return; }
      UI.toast('جاري المعالجة...', 'info', 1500);
      var reader = new FileReader();
      reader.onload = function(ev) {
        ChatState.pendingMedia = { type: 'image', dataUrl: ev.target.result };
        Chat.showMediaPreview();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  toggleRecord: async function() {
    var s = App.state.user;
    if (!s.uid) return;
    if (ChatState.isRecording && ChatState.mediaRecorder && ChatState.mediaRecorder.state === 'recording') {
      Chat.stopRecord();
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      ChatState.mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      ChatState.recordChunks = [];
      ChatState.isRecording = true;
      ChatState.mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) ChatState.recordChunks.push(e.data); };
      ChatState.mediaRecorder.onstop = function() {
        stream.getTracks().forEach(function(t) { t.stop(); });
        clearInterval(ChatState.recordTimer);
        ChatState.isRecording = false;
        var duration = (Date.now() - ChatState.recordStart) / 1000;
        var micBtn = U.$('chat-mic-btn');
        if (micBtn) { micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; }
        if (duration < 1) { UI.toast('تسجيل قصير', 'error'); return; }
        var blob = new Blob(ChatState.recordChunks, { type: ChatState.mediaRecorder.mimeType || 'audio/webm' });
        var reader = new FileReader();
        reader.onload = function(ev) {
          ChatState.pendingMedia = { type: 'audio', dataUrl: ev.target.result, duration: duration };
          Chat.showMediaPreview();
        };
        reader.readAsDataURL(blob);
      };
      ChatState.mediaRecorder.start();
      ChatState.recordStart = Date.now();
      var micBtn = U.$('chat-mic-btn');
      if (micBtn) { micBtn.classList.add('recording'); micBtn.textContent = '⏹'; }
      UI.toast('🎤 جاري التسجيل — اضغط تاني للإيقاف', 'info', 2500);
      ChatState.recordTimer = setInterval(function() {
        var sec = Math.floor((Date.now() - ChatState.recordStart) / 1000);
        if (sec >= 180) { Chat.stopRecord(); UI.toast('الحد 3 دقائق', 'warning'); }
      }, 500);
    } catch(e) {
      UI.toast('تعذّر الميكروفون: ' + e.message, 'error');
      ChatState.isRecording = false;
    }
  },

  stopRecord: function() {
    if (ChatState.mediaRecorder && ChatState.mediaRecorder.state === 'recording') ChatState.mediaRecorder.stop();
    ChatState.isRecording = false;
    var micBtn = U.$('chat-mic-btn');
    if (micBtn) { micBtn.classList.remove('recording'); micBtn.textContent = '🎤'; }
  },

  showMediaPreview: function() {
    if (!ChatState.pendingMedia) return;
    var isImg = ChatState.pendingMedia.type === 'image';
    var html = isImg
      ? '<img src="' + ChatState.pendingMedia.dataUrl + '" style="max-width:100%;max-height:300px;border-radius:12px;margin:0 auto 12px">'
      : '<audio controls src="' + ChatState.pendingMedia.dataUrl + '" style="width:100%;margin-bottom:12px"></audio><p style="font-size:13px;color:var(--text-2);font-weight:600">المدة: ' + Math.round(ChatState.pendingMedia.duration) + ' ثانية</p>';
    UI.modal({
      title: isImg ? '📷 معاينة' : '🎤 معاينة',
      content: '<div style="text-align:center;padding:16px 0">' + html + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:16px">' +
        '<button class="btn btn-block" onclick="Chat.sendPending()">📤 إرسال</button>' +
        '<button class="btn btn-secondary btn-block" onclick="Chat.cancelPending()">إلغاء</button>' +
        '</div>'
    });
  },

  sendPending: function() {
    if (!ChatState.pendingMedia || !window.db) return;
    var s = App.state.user;
    var media = ChatState.pendingMedia;
    var id = U.genId('m');
    var payload = {
      type: media.type,
      media: { data: media.dataUrl, duration: media.duration || 0 },
      name: s.name,
      avatar: s.avatar || '',
      userId: s.uid,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    if (ChatState.replyTo) {
      payload.replyTo = ChatState.replyTo;
      Chat.cancelReply();
    }
    window.db.ref('rooms/' + ChatState.room + '/messages/' + id).set(payload)
      .then(function() {
        UI.toast('تم الإرسال', 'success');
        Session.addXP(3);
        ChatState.pendingMedia = null;
        UI.closeAll();
      })
      .catch(function(e) { UI.toast('فشل: ' + e.message, 'error'); });
  },

  cancelPending: function() {
    ChatState.pendingMedia = null;
    UI.closeAll();
  },

  toggleAudio: function(id) {
    var audio = U.$('audio-' + id);
    var btn = U.$('play-' + id);
    if (!audio) return;
    if (ChatState.currentAudio && ChatState.currentAudio !== audio) {
      ChatState.currentAudio.pause();
      var prevBtn = U.$('play-' + ChatState.currentAudioId);
      if (prevBtn) prevBtn.textContent = '▶';
    }
    if (audio.paused) {
      audio.play();
      if (btn) btn.textContent = '⏸';
      ChatState.currentAudio = audio;
      ChatState.currentAudioId = id;
      audio.onended = function() { if (btn) btn.textContent = '▶'; };
    } else {
      audio.pause();
      if (btn) btn.textContent = '▶';
    }
  },

  lightbox: function(id) {
    var m = ChatState.messages[id];
    if (!m || !m.media) return;
    UI.modal({
      title: '🖼️',
      content: '<img src="' + U.esc(m.media.data) + '" style="max-width:100%;max-height:80vh;border-radius:12px;margin:0 auto;display:block">'
    });
  }
};
window.Chat = Chat;

// ═══════════════════════════════════════════════════════
// 7) ROOMS SCREEN
// ═══════════════════════════════════════════════════════
function RoomsScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }
  setTimeout(loadPublicRooms, 100);

  return '<div class="app-layout">' +
    layout.Sidebar('rooms') +
    '<div class="app-main">' +
    layout.Header('الغرف') +
    '<main class="app-content">' +
    '<div class="rooms-actions">' +
    '<div class="room-action-card" onclick="Rooms.showCreate()">' +
    '<div class="room-action-icon">➕</div>' +
    '<div class="room-action-title">غرفة جديدة</div>' +
    '<div class="room-action-desc">أنشئ غرفة خاصة أو عامة</div>' +
    '</div>' +
    '<div class="room-action-card" onclick="Rooms.showJoin()">' +
    '<div class="room-action-icon">🔐</div>' +
    '<div class="room-action-title">انضم بكود</div>' +
    '<div class="room-action-desc">عندك كود غرفة؟</div>' +
    '</div>' +
    '</div>' +
    '<h3 class="rooms-section-title">الغرفة العامة</h3>' +
    '<div class="room-list" style="margin-bottom:26px">' +
    '<div class="room-card" onclick="Rooms.enter(\'GENERAL\')">' +
    '<div class="room-card-icon">💬</div>' +
    '<div class="room-card-info"><div class="room-card-name">الغرفة العامة</div>' +
    '<div class="room-card-meta"><span class="room-tag">GENERAL</span><span>كل النقاشات</span></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<h3 class="rooms-section-title">الغرف العامة</h3>' +
    '<div id="public-rooms-list"><div style="text-align:center;padding:20px;color:var(--text-3);font-weight:600">جاري التحميل...</div></div>' +
    '</main>' +
    layout.BottomNav('rooms') +
    '</div>' +
    '</div>';
}

async function loadPublicRooms() {
  var list = U.$('public-rooms-list');
  if (!list || !window.db) return;
  try {
    var snap = await window.db.ref('roomsMeta').once('value');
    var rooms = snap.val() || {};
    var publicRooms = Object.keys(rooms)
      .filter(function(k) { return U.safeKey(k) && !rooms[k].password && rooms[k].type !== 'private' && k !== 'GENERAL'; })
      .map(function(k) { return { code: k, data: rooms[k] }; })
      .sort(function(a, b) { return (b.data.createdAt || 0) - (a.data.createdAt || 0); });

    if (!publicRooms.length) {
      list.innerHTML = '<div class="room-empty"><div class="room-empty-icon">🏘️</div><div class="room-empty-title">لا غرف عامة بعد</div><div class="room-empty-desc">كن أول من ينشئ غرفة</div></div>';
      return;
    }

    list.innerHTML = '<div class="room-list">' + publicRooms.slice(0, 30).map(function(r) {
      return '<div class="room-card" onclick="Rooms.enter(\'' + U.esc(r.code) + '\')">' +
        '<div class="room-card-icon">🏠</div>' +
        '<div class="room-card-info"><div class="room-card-name">' + U.esc(r.data.name || r.code) + '</div>' +
        '<div class="room-card-meta"><span class="room-tag">' + U.esc(r.code) + '</span>' +
        (r.data.createdBy ? '<span>بواسطة ' + U.esc(r.data.createdBy) + '</span>' : '') +
        '</div></div>' +
        '</div>';
    }).join('') + '</div>';
  } catch(e) {
    list.innerHTML = '<div class="room-empty">فشل التحميل</div>';
  }
}

var Rooms = {
  showCreate: function() {
    UI.modal({
      title: 'غرفة جديدة',
      content: '<div class="field"><label>اسم الغرفة</label>' +
        '<input class="input" id="cr-name" placeholder="مثال: الرياضيات" maxlength="40"></div>' +
        '<div class="field"><label>كلمة سر (اختياري)</label>' +
        '<input class="input" id="cr-password" type="password" placeholder="اتركها فاضية للعامة"></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
        '<button class="btn btn-secondary" onclick="App.ui.closeAll()">إلغاء</button>' +
        '<button class="btn" id="create-room-btn" onclick="Rooms.create()">إنشاء</button>' +
        '</div>'
    });
  },

  create: async function() {
    var name = U.$('cr-name').value.trim();
    var password = U.$('cr-password').value.trim();
    if (!name) { UI.toast('أدخل الاسم', 'error'); return; }
    if (!window.db) { UI.toast('Firebase غير متصل', 'error'); return; }

    var btn = U.$('create-room-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>...';

    var s = App.state.user;
    var code = 'R' + Math.random().toString(36).slice(2, 7).toUpperCase();

    try {
      await window.db.ref('roomsMeta/' + code).set({
        name: name,
        password: password || null,
        type: password ? 'private' : 'public',
        createdBy: s.name,
        createdById: s.uid,
        createdAt: Date.now()
      });
      UI.toast('تم: ' + code, 'success', 5000);
      UI.closeAll();
      setTimeout(function() { Rooms.enter(code); }, 500);
    } catch(e) {
      UI.toast('خطأ: ' + e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = 'إنشاء';
    }
  },

  showJoin: function() {
    UI.modal({
      title: 'انضم لغرفة',
      content: '<div class="field"><label>كود الغرفة</label>' +
        '<input class="input" id="jr-code" placeholder="مثال: RABC12" maxlength="10" style="text-align:center;font-weight:800;letter-spacing:3px;text-transform:uppercase;font-size:18px"></div>' +
        '<div class="field"><label>كلمة سر (لو محمية)</label>' +
        '<input class="input" id="jr-password" type="password" placeholder="اتركها فاضية"></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
        '<button class="btn btn-secondary" onclick="App.ui.closeAll()">إلغاء</button>' +
        '<button class="btn" id="join-room-btn" onclick="Rooms.join()">انضمام</button>' +
        '</div>'
    });
  },

  join: async function() {
    var code = U.$('jr-code').value.trim().toUpperCase();
    var password = U.$('jr-password').value;
    if (!code) { UI.toast('أدخل الكود', 'error'); return; }
    if (!U.safeKey(code)) { UI.toast('كود غير صالح', 'error'); return; }
    if (!window.db) { UI.toast('Firebase غير متصل', 'error'); return; }

    var btn = U.$('join-room-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>...';

    try {
      var snap = await window.db.ref('roomsMeta/' + code).once('value');
      var room = snap.val();
      if (!room) { UI.toast('الغرفة غير موجودة', 'error'); btn.disabled = false; btn.innerHTML = 'انضمام'; return; }
      if (room.password && room.password !== password) { UI.toast('كلمة السر غلط', 'error'); btn.disabled = false; btn.innerHTML = 'انضمام'; return; }
      UI.closeAll();
      Rooms.enter(code);
    } catch(e) {
      UI.toast('خطأ: ' + e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = 'انضمام';
    }
  },

  enter: function(code) {
    if (!code) return;
    var s = App.state.user;
    if (s.uid && window.db && ChatState.room && ChatState.room !== code) {
      window.db.ref('rooms/' + ChatState.room + '/users/' + s.uid).remove().catch(function() {});
    }
    ChatState.room = code;
    UI.toast('دخلت: ' + code, 'success');
    Router.go('chat');
  }
};
window.Rooms = Rooms;

// ═══════════════════════════════════════════════════════
// 8) Register Routes
// ═══════════════════════════════════════════════════════
Router.register('home', HomeScreen);
Router.register('chat', ChatScreen);
Router.register('rooms', RoomsScreen);

console.log('✓ Home + Chat + Rooms Registered');

})();

/* ═══════════════════════════════════════════════════════
   منصة إتقان — Bot + Quiz + Cards
   ═══════════════════════════════════════════════════════ */
(function() {
'use strict';

if (!window.App) { console.error('App not loaded'); return; }

var App = window.App;
var U = App.utils;
var UI = App.ui;
var Session = App.session;
var Router = App.router;
var layout = App.layout;

// ═══════════════════════════════════════════════════════
// 1) BOT SCREEN
// ═══════════════════════════════════════════════════════
function BotScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }

  return '<div class="app-layout">' +
    layout.Sidebar('bot') +
    '<div class="app-main">' +
    layout.Header('المساعد') +
    '<main class="app-content" style="padding:12px">' +
    '<div class="chat-container">' +
    '<div class="chat-header">' +
    '<div class="chat-header-icon" style="background:var(--brand-soft);color:var(--brand)">🤖</div>' +
    '<div class="chat-header-info">' +
    '<div class="chat-header-title">المساعد الذكي</div>' +
    '<div class="chat-header-sub">متاح دائماً</div>' +
    '</div>' +
    '<button class="btn-icon" onclick="Bot.reset()" title="محادثة جديدة">🔄</button>' +
    '</div>' +
    '<div class="chat-body" id="bot-body">' +
    '<div class="msg"><div class="msg-avatar" style="background:linear-gradient(135deg,var(--brand),var(--brand-dark))">🤖</div>' +
    '<div class="msg-content"><div class="msg-bubble">أهلاً! 👋 أنا المساعد الذكي. اسألني عن أي حاجة.</div></div></div>' +
    '<div class="msg"><div class="msg-avatar" style="background:linear-gradient(135deg,var(--brand),var(--brand-dark))">🤖</div>' +
    '<div class="msg-content"><div class="msg-bubble">💡 <strong>جرّب:</strong><br>• "5 + 7"<br>• "2x + 5 = 13"<br>• "اشرح الجاذبية"<br>• "الفرق بين الجمع والطرح"</div></div></div>' +
    '</div>' +
    '<div class="chat-input-area">' +
    '<input class="input chat-input" id="bot-input" type="text" placeholder="اسألني..." ' +
    'onkeypress="if(event.key===\'Enter\'){Bot.send()}">' +
    '<button class="chat-send" onclick="Bot.send()">➤</button>' +
    '</div>' +
    '</div>' +
    '</main>' +
    layout.BottomNav('bot') +
    '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════
// 2) BOT METHODS
// ═══════════════════════════════════════════════════════
var Bot = {
  send: function() {
    var inp = U.$('bot-input');
    var text = inp && inp.value.trim();
    if (!text) return;
    var body = U.$('bot-body');
    if (!body) return;

    var s = App.state.user;
    var initials = U.initials(s.name);

    var userRow = document.createElement('div');
    userRow.className = 'msg mine';
    userRow.innerHTML = '<div class="msg-avatar">' + initials + '</div>' +
      '<div class="msg-content"><div class="msg-bubble">' + U.esc(text) + '</div></div>';
    body.appendChild(userRow);
    body.scrollTop = body.scrollHeight;
    inp.value = '';

    var typingRow = document.createElement('div');
    typingRow.className = 'msg';
    typingRow.innerHTML = '<div class="msg-avatar" style="background:linear-gradient(135deg,var(--brand),var(--brand-dark))">🤖</div>' +
      '<div class="msg-content"><div class="msg-bubble" style="font-style:italic;opacity:.7">يفكر...</div></div>';
    body.appendChild(typingRow);
    body.scrollTop = body.scrollHeight;

    setTimeout(function() {
      typingRow.remove();
      var reply = Bot.reply(text);
      var formatted = U.esc(reply).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      var botRow = document.createElement('div');
      botRow.className = 'msg';
      botRow.innerHTML = '<div class="msg-avatar" style="background:linear-gradient(135deg,var(--brand),var(--brand-dark))">🤖</div>' +
        '<div class="msg-content"><div class="msg-bubble">' + formatted + '</div></div>';
      body.appendChild(botRow);
      body.scrollTop = body.scrollHeight;
      Session.addXP(1);
    }, 400);
  },

  reply: function(text) {
    var t = text.toLowerCase().trim();

    if (/^(مرحبا|السلام|اهلا|هلا|hi|hello)/.test(t)) {
      var hour = new Date().getHours();
      var greet = hour < 12 ? 'صباح الخير ☀️' : hour < 18 ? 'أهلاً 👋' : 'مساء الخير 🌙';
      return greet + '\n\nاسألني عن أي حاجة 📚';
    }

    if (/شكرا|thanks/.test(t)) return 'العفو! 😊';

    if (/نصيحه|نصائح/.test(t)) {
      var tips = [
        'ذاكر بومودورو — ٢٥ دقيقة تركيز + ٥ راحة',
        'اشرح بصوت عالٍ — أعمق طريقة للفهم',
        'راجع بعد ٢٤ ساعة — التكرار المتباعد',
        'نم ٧-٨ ساعات — الدماغ يثبت المعلومات',
        'ابعد الموبايل أثناء المذاكرة'
      ];
      return '💡 ' + tips[Math.floor(Math.random() * tips.length)];
    }

    if (/الفرق بين/.test(text)) {
      var m = text.match(/الفرق\s+بين\s+([^\s]+)\s+(?:و|و\s)([^\s]+)/);
      if (m) {
        var a = this.search(m[1]);
        var b = this.search(m[2]);
        if (a || b) {
          var parts = ['⚖️ **الفرق بين ' + m[1] + ' و ' + m[2] + ':**\n'];
          if (a) parts.push('🔹 **' + a.t + ':**\n' + a.d + '\n📌 ' + (a.e || ''));
          else parts.push('❓ **' + m[1] + ':** مش موجود');
          parts.push('');
          if (b) parts.push('🔸 **' + b.t + ':**\n' + b.d + '\n📌 ' + (b.e || ''));
          else parts.push('❓ **' + m[2] + ':** مش موجود');
          return parts.join('\n');
        }
      }
    }

    var mathResult = this.solveMath(text);
    if (mathResult) return mathResult;

    var kb = this.search(text);
    if (kb) {
      var out = '📖 **' + kb.t + ':**\n' + kb.d;
      if (kb.w) out += '\n\n💡 **ليه؟** ' + kb.w;
      if (kb.e) out += '\n\n🌟 **مثال:** ' + kb.e;
      out += '\n\n_المجال: ' + kb.c + '_';
      return out;
    }

    return '🤔 مش لاقي إجابة محددة.\n\n**جرّب:**\n• "5 + 7"\n• "2x + 5 = 13"\n• "اشرح الجاذبية"\n• "الفرق بين الجمع والطرح"\n\n**أو اسألني عن:**\nرياضيات، فيزياء، كيمياء، أحياء، عربي، إنجليزي، تاريخ، جغرافيا';
  },

  solveMath: function(text) {
    var t = text.toLowerCase().replace(/[×✕]/g, '*').replace(/÷/g, '/').replace(/[س]/g, 'x').replace(/\s+/g, '');

    var m = t.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);
    if (m) {
      var a = parseFloat(m[1]), op = m[2], b = parseFloat(m[3]);
      var r;
      if (op === '+') r = a + b;
      else if (op === '-') r = a - b;
      else if (op === '*') r = a * b;
      else r = b !== 0 ? +(a / b).toFixed(4) : 'غير معرّف';
      return '🧮 ' + a + ' ' + op + ' ' + b + ' = **' + r + '**';
    }

    var pct = t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:من|of)\s*(\d+(?:\.\d+)?)/);
    if (pct) {
      var pa = parseFloat(pct[1]), pb = parseFloat(pct[2]);
      return '📊 ' + pa + '% من ' + pb + ' = **' + (pa * pb / 100) + '**';
    }

    var eq = t.match(/(\d+)\s*[x]?\s*([+\-])\s*(\d+)\s*=\s*(\d+)/);
    if (eq) {
      var ea = +eq[1], eop = eq[2], eb = +eq[3], ec = +eq[4];
      var x = eop === '+' ? (ec - eb) / ea : (ec + eb) / ea;
      return '📐 **' + ea + 'x ' + eop + ' ' + eb + ' = ' + ec + '**\n\n**الخطوات:**\n1. ننقل ' + eb + ' للطرف التاني\n2. ' + ea + 'x = ' + (ec - eb) + '\n3. x = ' + (ec - eb) + ' ÷ ' + ea + '\n\n✅ x = **' + (Math.round(x * 1000) / 1000) + '**';
    }

    return null;
  },

  search: function(query) {
    var KB = [
      { t: 'الجمع', c: 'رياضيات', k: ['جمع', 'إضافة'], d: 'ضم مجموعتين، رمزه (+)', w: 'الطريقة الأساسية لمعرفة الكمية', e: '٣+٥=٨' },
      { t: 'الطرح', c: 'رياضيات', k: ['طرح', 'ناقص'], d: 'إيجاد الفرق، رمزه (−)', w: 'يقيس كم يبقى', e: '١٠−٤=٦' },
      { t: 'الضرب', c: 'رياضيات', k: ['ضرب'], d: 'جمع متكرر، رمزه (×)', w: 'يختصر جمع نفس العدد', e: '٥×٦=٣٠' },
      { t: 'القسمة', c: 'رياضيات', k: ['قسمة'], d: 'توزيع متساوي، رمزها (÷)', w: 'عكس الضرب', e: '١٢÷٣=٤' },
      { t: 'الكسور', c: 'رياضيات', k: ['كسر', 'كسور'], d: 'جزء من كل (بسط/مقام)', w: 'نحتاج توحيد المقامات للجمع', e: '١/٢+١/٣=٥/٦' },
      { t: 'النسبة المئوية', c: 'رياضيات', k: ['نسبة', 'مئوية'], d: 'من كل ١٠٠، رمزها (%)', w: 'تسهل المقارنة', e: '٢٠% من ٥٠=١٠' },
      { t: 'المعادلة الخطية', c: 'رياضيات', k: ['معادلة خطية'], d: 'المتغير من الدرجة الأولى', w: 'المتغير مرفوع للأس ١', e: '٢س+٥=١٣ ⇒ س=٤' },
      { t: 'فيثاغورس', c: 'رياضيات', k: ['فيثاغورس'], d: 'في المثلث القائم: ج²=أ²+ب²', w: 'مساحة المربع على الوتر = مجموع المساحتين', e: '٣،٤ ⇒ الوتر=٥' },
      { t: 'المثلث', c: 'رياضيات', k: ['مثلث'], d: '٣ أضلاع، مجموع زواياه ١٨٠°', w: 'مجموع زواياه ثابت', e: 'مساحة=½×ق×ع' },
      { t: 'الدائرة', c: 'رياضيات', k: ['دائرة'], d: 'كل نقاطه على بعد ثابت من المركز', w: 'كل نقطة على المحيط بنفس المسافة', e: 'مساحة=π نق²' },
      { t: 'الجاذبية', c: 'فيزياء', k: ['جاذبية', 'جذب'], d: 'قوة تجاذب بين الأجسام', w: 'كل جسم له كتلة', e: 'سقوط التفاحة' },
      { t: 'السرعة', c: 'فيزياء', k: ['سرعة'], d: 'المسافة÷الزمن', w: 'تقيس المسافة في وحدة زمن', e: '٧٥ كم/س' },
      { t: 'التسارع', c: 'فيزياء', k: ['تسارع'], d: 'التغير في السرعة÷الزمن', w: 'يقيس سرعة تغير السرعة', e: '٠ إلى ١٠٠ في ١٠ ث' },
      { t: 'قوانين نيوتن', c: 'فيزياء', k: ['نيوتن'], d: '٣ قوانين للحركة', w: 'تفسر الحركة والقوى', e: 'ق=ك×ت' },
      { t: 'الطاقة', c: 'فيزياء', k: ['طاقة'], d: 'القدرة على إنجاز شغل', w: 'قانون حفظ الطاقة', e: 'كهرباء←ضوء' },
      { t: 'الضوء', c: 'فيزياء', k: ['ضوء'], d: 'موجة كهرومغناطيسية بسرعة ٣×١٠⁸ م/ث', w: 'لا يحتاج وسطاً', e: 'من الشمس ~٨ دقائق' },
      { t: 'الصوت', c: 'فيزياء', k: ['صوت'], d: 'موجة ميكانيكية طولية', w: 'يحتاج وسطاً مادياً', e: '٣٤٣ م/ث في الهواء' },
      { t: 'الذرة', c: 'كيمياء', k: ['ذرة'], d: 'أصغر وحدة من العنصر', w: 'نواة وإلكترونات', e: 'الهيدروجين: بروتون وإلكترون' },
      { t: 'العنصر', c: 'كيمياء', k: ['عنصر'], d: 'مادة من نوع واحد من الذرات', w: 'لا يتحلل لمواد أبسط', e: 'الذهب، الأكسجين' },
      { t: 'الحمض', c: 'كيمياء', k: ['حمض'], d: 'pH أقل من ٧', w: 'يعطي H⁺ في الماء', e: 'HCl، الليمون' },
      { t: 'القاعدة', c: 'كيمياء', k: ['قاعدة'], d: 'pH أعلى من ٧', w: 'تعطي OH⁻ في الماء', e: 'NaOH' },
      { t: 'الخلية', c: 'أحياء', k: ['خلية'], d: 'أصغر وحدة حية', w: 'تحتوي على ما تحتاجه للحياة', e: 'كرات الدم' },
      { t: 'النواة', c: 'أحياء', k: ['نواة'], d: 'مركز التحكم، تحتوي DNA', w: 'تنظم أنشطة الخلية', e: '٤٦ كروموسوم بشري' },
      { t: 'التمثيل الضوئي', c: 'أحياء', k: ['تمثيل ضوئي'], d: 'النباتات تصنع غذاءها بضوء الشمس', w: 'النبات ذاتي التغذية', e: '6CO₂+6H₂O→C₆H₁₂O₆+6O₂' },
      { t: 'المبتدأ', c: 'عربي', k: ['مبتدأ'], d: 'اسم مرفوع نبدأ به الجملة الاسمية', w: 'يحتاج خبراً', e: 'العلمُ نورٌ' },
      { t: 'الفاعل', c: 'عربي', k: ['فاعل'], d: 'اسم مرفوع يدل على من قام بالفعل', w: 'مرفوع بالضمة', e: 'كتبَ الطالبُ' },
      { t: 'المفعول به', c: 'عربي', k: ['مفعول به'], d: 'اسم منصوب يقع عليه الفعل', w: 'منصوب', e: 'كتبَ الطالبُ الدرسَ' },
      { t: 'Present Simple', c: 'إنجليزي', k: ['present simple'], d: 'وصف العادات والحقائق', w: 'للروتين', e: 'I go daily' },
      { t: 'Past Simple', c: 'إنجليزي', k: ['past simple'], d: 'حدث انتهى', w: 'للفعل المكتمل', e: 'I went yesterday' },
      { t: 'نهر النيل', c: 'جغرافيا', k: ['النيل'], d: 'أطول نهر (~٦٦٥٠ كم)', w: 'مصر "هبة النيل"', e: 'يمر بـ ١١ دولة' },
      { t: 'مصر', c: 'جغرافيا', k: ['مصر'], d: 'شمال أفريقيا، عاصمتها القاهرة', w: 'موقع استراتيجي', e: '~١٠٥ مليون نسمة' },
      { t: 'بومودورو', c: 'مهارات', k: ['بومودورو'], d: '٢٥ دقيقة تركيز + ٥ راحة', w: 'الدماغ يحتاج راحة', e: '٤ بومودورو = ٢ ساعة' }
    ];

    var q = query.toLowerCase();
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (q.indexOf(KB[i].k[j]) !== -1) return KB[i];
      }
    }
    return null;
  },

  reset: function() {
    UI.confirm('محادثة جديدة', 'مسح المحادثة؟').then(function(ok) {
      if (!ok) return;
      var body = U.$('bot-body');
      if (body) {
        body.innerHTML = '<div class="msg"><div class="msg-avatar" style="background:linear-gradient(135deg,var(--brand),var(--brand-dark))">🤖</div><div class="msg-content"><div class="msg-bubble">أهلاً! 👋 اسألني عن أي حاجة.</div></div></div>';
      }
      UI.toast('محادثة جديدة', 'success');
    });
  }
};
window.Bot = Bot;

// ═══════════════════════════════════════════════════════
// 3) QUIZ SCREEN
// ═══════════════════════════════════════════════════════
var QuizState = { questions: [], answers: [], current: 0 };
window.QuizState = QuizState;

function QuizScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }

  return '<div class="app-layout">' +
    layout.Sidebar('quiz') +
    '<div class="app-main">' +
    layout.Header('الاختبارات') +
    '<main class="app-content">' +
    '<div id="quiz-setup">' +
    '<div class="pdf-upload-area" onclick="Quiz.pickPDF()">' +
    '<div class="pdf-upload-icon">📄</div>' +
    '<div class="pdf-upload-title">ارفع ملف PDF</div>' +
    '<div class="pdf-upload-desc">20MB max</div>' +
    '<div id="pdf-status" class="pdf-status"></div>' +
    '</div>' +
    '<div class="quiz-section-divider"><span>أو الصق النص</span></div>' +
    '<div class="card" style="margin-bottom:16px">' +
    '<textarea class="textarea" id="quiz-text" placeholder="الصق أي نص تعليمي..." rows="8"></textarea>' +
    '<p class="field-hint" style="margin-top:8px">النص لازم 80 حرف على الأقل</p>' +
    '</div>' +
    '<button class="btn btn-block btn-lg" onclick="Quiz.generate()">✨ توليد الأسئلة</button>' +
    '</div>' +
    '<div id="quiz-display" style="display:none">' +
    '<div class="card" style="margin-bottom:16px">' +
    '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;font-weight:700">' +
    '<span>سؤال <span id="q-cur">1</span> من <span id="q-tot">5</span></span>' +
    '<span style="color:var(--brand)" id="q-percent">0%</span>' +
    '</div>' +
    '<div class="quiz-progress"><div class="quiz-progress-bar" id="q-prog"></div></div>' +
    '</div>' +
    '<div id="quiz-q"></div>' +
    '<button class="btn btn-secondary btn-block" style="margin-top:16px" onclick="Quiz.reset()">إلغاء</button>' +
    '</div>' +
    '<div id="quiz-result" style="display:none"></div>' +
    '</main>' +
    layout.BottomNav('quiz') +
    '</div>' +
    '</div>';
}

var Quiz = {
  pickPDF: function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (file) Quiz.handlePDF(file);
    };
    input.click();
  },

  handlePDF: async function(file) {
    var status = U.$('pdf-status');
    if (status) { status.className = 'pdf-status loading'; status.textContent = '⏳ جاري استخراج النص...'; }

    try {
      if (typeof pdfjsLib === 'undefined') {
        await new Promise(function(resolve, reject) {
          var s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      var arrayBuffer = await file.arrayBuffer();
      var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      var text = '';
      for (var i = 1; i <= pdf.numPages; i++) {
        var page = await pdf.getPage(i);
        var content = await page.getTextContent();
        text += content.items.map(function(x) { return x.str; }).join(' ') + '\n';
      }

      var textarea = U.$('quiz-text');
      if (textarea) textarea.value = text.trim();

      if (status) { status.className = 'pdf-status success'; status.textContent = '✅ ' + pdf.numPages + ' صفحة مستخرجة'; }
      UI.toast('تم استخراج النص', 'success');
    } catch(e) {
      if (status) { status.className = 'pdf-status error'; status.textContent = '❌ ' + e.message; }
      UI.toast('فشل: ' + e.message, 'error');
    }
  },

  generate: function() {
    var text = U.$('quiz-text') && U.$('quiz-text').value.trim();
    if (!text || text.length < 80) { UI.toast('النص قصير (80+)', 'error'); return; }

    var sentences = text.split(/[.؟!؟\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length >= 20; });
    if (sentences.length < 3) { UI.toast('النص مش كافي', 'error'); return; }

    var allWords = {};
    sentences.forEach(function(s) {
      s.split(/\s+/).forEach(function(w) {
        w = w.replace(/[،,.!؟]/g, '');
        if (w.length >= 4) allWords[w] = true;
      });
    });
    var words = Object.keys(allWords);
    if (words.length < 4) { UI.toast('كلمات غير كافية', 'error'); return; }

    var qs = [];
    var shuffled = sentences.slice().sort(function() { return Math.random() - 0.5; });

    for (var i = 0; i < shuffled.length; i++) {
      if (qs.length >= 5) break;
      var sen = shuffled[i];
      var senWords = sen.split(/\s+/).map(function(w) { return w.replace(/[،,.!؟]/g, ''); }).filter(function(w) { return w.length >= 4; });
      if (!senWords.length) continue;
      var cw = senWords.sort(function(a, b) { return b.length - a.length; })[0];
      var idx = sen.indexOf(cw);
      if (idx === -1) continue;
      var q = (sen.slice(0, idx) + '______' + sen.slice(idx + cw.length)).trim();
      if (q.length < 15) continue;
      var distractors = words.filter(function(w) { return w !== cw; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
      var opts = [cw].concat(distractors).sort(function() { return Math.random() - 0.5; });
      qs.push({ question: q, options: opts, correct: opts.indexOf(cw) });
    }

    if (!qs.length) { UI.toast('فشل التوليد', 'error'); return; }

    QuizState.questions = qs;
    QuizState.answers = new Array(qs.length).fill(null);
    QuizState.current = 0;
    U.$('quiz-setup').style.display = 'none';
    U.$('quiz-display').style.display = 'block';
    U.$('quiz-result').style.display = 'none';
    this.renderQuestion();
  },

  renderQuestion: function() {
    var q = QuizState.questions[QuizState.current];
    var total = QuizState.questions.length;
    var pct = Math.round((QuizState.current / total) * 100);
    U.$('q-cur').textContent = QuizState.current + 1;
    U.$('q-tot').textContent = total;
    U.$('q-percent').textContent = pct + '%';
    U.$('q-prog').style.width = pct + '%';
    var ans = QuizState.answers[QuizState.current];
    var html = '<div class="card" style="margin-bottom:16px">' +
      '<div style="font-size:11px;color:var(--brand);font-weight:800;margin-bottom:10px">السؤال ' + (QuizState.current + 1) + '</div>' +
      '<div style="font-size:16px;font-weight:800;margin-bottom:16px;line-height:1.6">' + U.esc(q.question) + '</div>';
    q.options.forEach(function(opt, i) {
      html += '<button class="quiz-option ' + (ans === i ? 'selected' : '') + '" onclick="Quiz.pick(' + i + ')">' + String.fromCharCode(65 + i) + '. ' + U.esc(opt) + '</button>';
    });
    html += '</div>';
    html += '<button class="btn btn-block" ' + (ans === null ? 'disabled' : '') + ' onclick="Quiz.next()">' + (QuizState.current < total - 1 ? 'التالي' : 'النتيجة') + '</button>';
    U.$('quiz-q').innerHTML = html;
  },

  pick: function(i) {
    QuizState.answers[QuizState.current] = i;
    this.renderQuestion();
  },

  next: function() {
    if (QuizState.answers[QuizState.current] === null) return;
    if (QuizState.current < QuizState.questions.length - 1) {
      QuizState.current++;
      this.renderQuestion();
    } else {
      this.showResult();
    }
  },

  showResult: function() {
    var score = 0;
    QuizState.questions.forEach(function(q, i) {
      if (QuizState.answers[i] === q.correct) score++;
    });
    var pct = Math.round((score / QuizState.questions.length) * 100);
    var emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📚';
    var review = QuizState.questions.map(function(q, i) {
      var ok = QuizState.answers[i] === q.correct;
      return '<div class="review-item ' + (ok ? 'ok' : 'bad') + '">' +
        '<div class="review-q">' + (ok ? '✅' : '❌') + ' ' + U.esc(q.question) + '</div>' +
        (ok ? '' : '<div class="review-a">إجابتك: ' + U.esc(q.options[QuizState.answers[i]]) + '</div>') +
        '<div class="review-c">الصحيحة: ' + U.esc(q.options[q.correct]) + '</div></div>';
    }).join('');

    var hist = [];
    try { hist = JSON.parse(localStorage.getItem('itqan_quizHistory') || '[]'); } catch(e) {}
    hist.unshift({ date: Date.now(), score: score, total: QuizState.questions.length, percent: pct });
    if (hist.length > 50) hist.length = 50;
    try { localStorage.setItem('itqan_quizHistory', JSON.stringify(hist)); } catch(e) {}

    Session.addXP(score * 5);
    if (pct >= 80 && UI.confetti) UI.confetti();

    U.$('quiz-display').style.display = 'none';
    U.$('quiz-result').style.display = 'block';
    U.$('quiz-result').innerHTML = '<div class="card quiz-result">' +
      '<div class="quiz-result-emoji">' + emoji + '</div>' +
      '<div class="quiz-result-score">' + score + ' / ' + QuizState.questions.length + '</div>' +
      '<div class="quiz-result-percent">' + pct + '%</div>' +
      '<p style="color:var(--text-2);margin-bottom:20px;font-weight:700">تم حفظ النتيجة</p>' +
      '<button class="btn btn-block" onclick="Quiz.reset()">اختبار جديد</button>' +
      '</div>' +
      '<div class="card" style="margin-top:16px"><h3 class="section-title">مراجعة الإجابات</h3>' + review + '</div>';
  },

  reset: function() {
    QuizState.questions = [];
    QuizState.answers = [];
    QuizState.current = 0;
    U.$('quiz-setup').style.display = 'block';
    U.$('quiz-display').style.display = 'none';
    U.$('quiz-result').style.display = 'none';
  }
};
window.Quiz = Quiz;

// ═══════════════════════════════════════════════════════
// 4) CARDS SCREEN
// ═══════════════════════════════════════════════════════
var FlashState = { cards: [], index: 0 };
window.FlashState = FlashState;

var TEMPLATES = {
  multiplication: Array.from({ length: 12 }, function(_, i) {
    return { front: (i + 1) + ' × 7', back: String((i + 1) * 7) };
  }),
  capitals: [
    { front: 'عاصمة مصر؟', back: 'القاهرة' },
    { front: 'عاصمة السعودية؟', back: 'الرياض' },
    { front: 'عاصمة فرنسا؟', back: 'باريس' },
    { front: 'عاصمة اليابان؟', back: 'طوكيو' },
    { front: 'عاصمة إنجلترا؟', back: 'لندن' }
  ],
  english: [
    { front: 'Book', back: 'كتاب' },
    { front: 'School', back: 'مدرسة' },
    { front: 'Teacher', back: 'مدرس' },
    { front: 'Student', back: 'طالب' }
  ],
  science: [
    { front: 'رمز الماء؟', back: 'H₂O' },
    { front: 'كم كوكب؟', back: '8' },
    { front: 'أكبر كوكب؟', back: 'المشتري' }
  ]
};

function CardsScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }

  return '<div class="app-layout">' +
    layout.Sidebar('cards') +
    '<div class="app-main">' +
    layout.Header('البطاقات') +
    '<main class="app-content">' +
    '<div id="cards-setup">' +
    '<div class="cards-generate-area">' +
    '<div class="cards-generate-title">✨ توليد بطاقات من نص</div>' +
    '<div class="cards-generate-desc">الصق أي نص تعليمي، والمنصة هتولّد منه بطاقات تلقائياً</div>' +
    '<textarea class="textarea" id="cards-input-text" placeholder="الصق النص هنا (100 حرف على الأقل)..." style="margin-bottom:12px"></textarea>' +
    '<button class="btn btn-block" onclick="Cards.generateFromText()">🎴 توليد البطاقات</button>' +
    '</div>' +
    '<div class="cards-divider"><span>أو اختر قالب</span></div>' +
    '<div class="card" style="margin-bottom:16px">' +
    '<label style="font-weight:800;font-size:14px;display:block;margin-bottom:14px">قوالب جاهزة</label>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
    '<button class="btn btn-secondary" onclick="Cards.loadTemplate(\'multiplication\')">جدول الضرب</button>' +
    '<button class="btn btn-secondary" onclick="Cards.loadTemplate(\'capitals\')">عواصم</button>' +
    '<button class="btn btn-secondary" onclick="Cards.loadTemplate(\'english\')">إنجليزي</button>' +
    '<button class="btn btn-secondary" onclick="Cards.loadTemplate(\'science\')">علوم</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div id="cards-display" style="display:none">' +
    '<div class="cards-stats">' +
    '<div class="card" style="text-align:center;padding:12px"><div style="font-size:20px;font-weight:800;color:var(--brand)" id="card-cur">1</div><div style="font-size:11px;color:var(--text-2);font-weight:700">الحالية</div></div>' +
    '<div class="card" style="text-align:center;padding:12px"><div style="font-size:20px;font-weight:800;color:var(--brand)" id="card-tot">0</div><div style="font-size:11px;color:var(--text-2);font-weight:700">الإجمالي</div></div>' +
    '<div class="card" style="text-align:center;padding:12px"><div style="font-size:20px;font-weight:800;color:var(--brand)" id="card-known">0</div><div style="font-size:11px;color:var(--text-2);font-weight:700">عرفت</div></div>' +
    '</div>' +
    '<div class="flashcard-container" onclick="Cards.flip()">' +
    '<div class="flashcard-inner" id="fc-inner">' +
    '<div class="flashcard-face flashcard-front" id="fc-front">?</div>' +
    '<div class="flashcard-face flashcard-back" id="fc-back">?</div>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:8px">' +
    '<button class="btn btn-danger btn-block" onclick="Cards.review(false)">لم أتذكر</button>' +
    '<button class="btn btn-success btn-block" onclick="Cards.review(true)">تذكرت</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn btn-secondary btn-block" onclick="Cards.prev()">← السابق</button>' +
    '<button class="btn btn-secondary btn-block" onclick="Cards.next()">التالي →</button>' +
    '</div>' +
    '</div>' +
    '</main>' +
    layout.BottomNav('cards') +
    '</div>' +
    '</div>';
}

var Cards = {
  loadTemplate: function(name) {
    var t = TEMPLATES[name];
    if (!t) return;
    FlashState.cards = t.map(function(c) { return { front: c.front, back: c.back, known: false }; });
    FlashState.index = 0;
    U.$('cards-setup').style.display = 'none';
    U.$('cards-display').style.display = 'block';
    this.renderCard();
    UI.toast(t.length + ' بطاقة', 'success');
  },

  generateFromText: function() {
    var textarea = U.$('cards-input-text');
    if (!textarea) return;
    var text = textarea.value.trim();
    if (!text || text.length < 100) { UI.toast('النص قصير (100+)', 'error'); return; }

    var sentences = text.split(/[.؟!؟\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length >= 20; });
    if (sentences.length < 3) { UI.toast('محتاج 3 جمل على الأقل', 'error'); return; }

    var cards = [];
    var used = {};

    for (var i = 0; i < sentences.length; i++) {
      if (cards.length >= 15) break;
      var sen = sentences[i];
      var words = sen.split(/\s+/).map(function(w) { return w.replace(/[،,.!؟]/g, ''); }).filter(function(w) { return w.length >= 4; });
      if (!words.length) continue;
      words.sort(function(a, b) { return b.length - a.length; });
      var keyword = words[0];
      if (used[keyword]) continue;
      used[keyword] = true;
      cards.push({ front: 'ما معنى: ' + keyword + '؟', back: sen, known: false });
    }

    if (cards.length < 3) { UI.toast('فشل التوليد', 'error'); return; }

    FlashState.cards = cards;
    FlashState.index = 0;
    U.$('cards-setup').style.display = 'none';
    U.$('cards-display').style.display = 'block';
    this.renderCard();
    UI.toast(cards.length + ' بطاقة', 'success');
  },

  renderCard: function() {
    if (!FlashState.cards.length) return;
    var c = FlashState.cards[FlashState.index];
    U.$('fc-front').textContent = c.front;
    U.$('fc-back').textContent = c.back;
    U.$('fc-inner').style.transform = 'rotateY(0)';
    U.$('card-cur').textContent = FlashState.index + 1;
    U.$('card-tot').textContent = FlashState.cards.length;
    var known = FlashState.cards.filter(function(x) { return x.known; }).length;
    U.$('card-known').textContent = known;
  },

  flip: function() {
    var inner = U.$('fc-inner');
    inner.style.transform = inner.style.transform === 'rotateY(180deg)' ? 'rotateY(0)' : 'rotateY(180deg)';
  },

  review: function(known) {
    if (!FlashState.cards.length) return;
    FlashState.cards[FlashState.index].known = known;
    if (known) Session.addXP(1);
    this.next();
  },

  next: function() {
    if (FlashState.index < FlashState.cards.length - 1) {
      FlashState.index++;
      this.renderCard();
    } else {
      var known = FlashState.cards.filter(function(c) { return c.known; }).length;
      UI.toast('عرفت ' + known + ' من ' + FlashState.cards.length, 'success', 4000);
    }
  },

  prev: function() {
    if (FlashState.index > 0) {
      FlashState.index--;
      this.renderCard();
    }
  }
};
window.Cards = Cards;

// ═══════════════════════════════════════════════════════
// 5) Register Routes
// ═══════════════════════════════════════════════════════
Router.register('bot', BotScreen);
Router.register('quiz', QuizScreen);
Router.register('cards', CardsScreen);

console.log('✓ Bot + Quiz + Cards Registered');

})();

/* ═══════════════════════════════════════════════════════
   منصة إتقان — Profile + Settings + Admin
   ═══════════════════════════════════════════════════════ */
(function() {
'use strict';

if (!window.App) { console.error('App not loaded'); return; }

var App = window.App;
var U = App.utils;
var UI = App.ui;
var Session = App.session;
var Router = App.router;
var layout = App.layout;
var Theme = App.theme;

// ═══════════════════════════════════════════════════════
// 1) PROFILE SCREEN
// ═══════════════════════════════════════════════════════
function ProfileScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }
  var s = App.state.user;
  var hist = [];
  try { hist = JSON.parse(localStorage.getItem('itqan_quizHistory') || '[]'); } catch(e) {}
  var totalQuizzes = hist.length;
  var avgScore = totalQuizzes > 0 ? Math.round(hist.reduce(function(sum, h) { return sum + h.percent; }, 0) / totalQuizzes) : 0;

  return '<div class="app-layout">' +
    layout.Sidebar('profile') +
    '<div class="app-main">' +
    layout.Header('الملف') +
    '<main class="app-content">' +
    '<div class="profile-hero">' +
    '<div class="profile-avatar" onclick="Profile.uploadAvatar()" id="profile-avatar">' +
    (s.avatar ? '<img src="' + U.esc(s.avatar) + '" alt="">' : U.initials(s.name)) +
    '</div>' +
    '<h1 class="profile-name">' + U.esc(s.name) + '</h1>' +
    '<p class="profile-email">' + U.esc(s.email || 'ضيف') + '</p>' +
    '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
    '<span class="badge badge-brand">Level ' + s.level + '</span>' +
    '<span class="badge badge-gold">' + s.xp + ' XP</span>' +
    '</div>' +
    '</div>' +
    '<div class="stats" style="margin-bottom:20px">' +
    '<div class="stat"><div class="stat-icon" style="background:#FEF3C7;color:#D97706">⚡</div><div class="stat-value" data-count="' + (s.xp || 0) + '">' + (s.xp || 0) + '</div><div class="stat-label">XP</div></div>' +
    '<div class="stat"><div class="stat-icon" style="background:#D1FAE5;color:#059669">📄</div><div class="stat-value">' + totalQuizzes + '</div><div class="stat-label">اختبار</div></div>' +
    '<div class="stat"><div class="stat-icon" style="background:#DBEAFE;color:#2563EB">🏅</div><div class="stat-value">' + avgScore + '%</div><div class="stat-label">متوسط</div></div>' +
    '</div>' +
    '<div class="profile-actions">' +
    '<button class="profile-action" onclick="Profile.edit()">' +
    '<div class="profile-action-icon" style="background:var(--brand-soft);color:var(--brand)">✏️</div>' +
    '<div class="profile-action-info"><div class="profile-action-title">تعديل الملف</div><div class="profile-action-sub">تغيير الاسم أو الصورة</div></div>' +
    '<span style="color:var(--text-3);font-size:18px">‹</span>' +
    '</button>' +
    '<button class="profile-action" onclick="App.go(\'settings\')">' +
    '<div class="profile-action-icon" style="background:var(--g-100);color:var(--text-2)">⚙️</div>' +
    '<div class="profile-action-info"><div class="profile-action-title">الإعدادات</div><div class="profile-action-sub">الثيم والتفضيلات</div></div>' +
    '<span style="color:var(--text-3);font-size:18px">‹</span>' +
    '</button>' +
    '<button class="profile-action" onclick="Profile.logout()" style="color:var(--red-600)">' +
    '<div class="profile-action-icon" style="background:var(--red-50);color:var(--red-600)">🚪</div>' +
    '<div class="profile-action-info"><div class="profile-action-title">تسجيل الخروج</div><div class="profile-action-sub">الخروج من الحساب</div></div>' +
    '<span style="color:var(--text-3);font-size:18px">‹</span>' +
    '</button>' +
    '</div>' +
    '</main>' +
    layout.BottomNav('profile') +
    '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════
// 2) PROFILE METHODS
// ═══════════════════════════════════════════════════════
var Profile = {
  edit: function() {
    var s = App.state.user;
    UI.modal({
      title: 'تعديل الملف',
      content: '<div class="field"><label>الاسم</label>' +
        '<input class="input" type="text" id="ep-name" value="' + U.esc(s.name) + '" maxlength="40"></div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">' +
        '<button class="btn btn-secondary" onclick="App.ui.closeAll()">إلغاء</button>' +
        '<button class="btn" onclick="Profile.save()">حفظ</button>' +
        '</div>'
    });
  },

  save: async function() {
    var name = U.$('ep-name').value.trim();
    if (!name || name.length < 2) { UI.toast('الاسم قصير', 'error'); return; }
    App.state.user.name = name;
    try { localStorage.setItem('itqan_session', JSON.stringify(App.state.user)); } catch(e) {}
    if (window.db && App.state.user.uid && App.state.user.uid.indexOf('guest') !== 0) {
      await window.db.ref('users/' + App.state.user.uid + '/name').set(name).catch(function() {});
    }
    UI.closeAll();
    UI.toast('تم الحفظ', 'success');
    Router.go('profile');
  },

  uploadAvatar: function() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { UI.toast('الصورة كبيرة (5MB max)', 'error'); return; }

      UI.toast('جاري المعالجة...', 'info', 1500);

      var img = new Image();
      var reader = new FileReader();
      reader.onload = function(ev) {
        img.onload = function() {
          var size = 200;
          var canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext('2d');
          var minDim = Math.min(img.width, img.height);
          var sx = (img.width - minDim) / 2;
          var sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          App.state.user.avatar = dataUrl;
          try { localStorage.setItem('itqan_session', JSON.stringify(App.state.user)); } catch(e) {}

          if (window.db && App.state.user.uid && App.state.user.uid.indexOf('guest') !== 0) {
            window.db.ref('users/' + App.state.user.uid + '/avatar').set(dataUrl).catch(function() {});
          }

          UI.toast('✅ تم تحديث الصورة', 'success');
          Router.go('profile');
        };
        img.onerror = function() { UI.toast('فشل تحميل الصورة', 'error'); };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },

  logout: function() {
    UI.confirm('تسجيل الخروج', 'هل تريد الخروج؟').then(function(ok) {
      if (!ok) return;
      Session.clear();
      UI.toast('تم الخروج', 'info');
      setTimeout(function() { Router.go('auth'); }, 200);
    });
  }
};
window.Profile = Profile;

// ═══════════════════════════════════════════════════════
// 3) SETTINGS SCREEN
// ═══════════════════════════════════════════════════════
function SettingsScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }
  var isDark = Theme.isDark();
  return '<div class="app-layout">' +
    layout.Sidebar('settings') +
    '<div class="app-main">' +
    layout.Header('الإعدادات') +
    '<main class="app-content">' +
    '<div class="settings-section">' +
    '<h3 class="settings-title">المظهر</h3>' +
    '<div class="settings-item" onclick="Settings.toggleTheme()">' +
    '<div class="settings-icon">🌙</div>' +
    '<div class="settings-info"><div class="settings-label">الوضع الليلي</div><div class="settings-desc">تبديل بين الفاتح والداكن</div></div>' +
    '<div class="toggle ' + (isDark ? 'active' : '') + '"><div class="toggle-thumb"></div></div>' +
    '</div>' +
    '</div>' +
    '<div class="settings-section">' +
    '<h3 class="settings-title">الحساب</h3>' +
    '<div class="settings-item" onclick="App.go(\'profile\')">' +
    '<div class="settings-icon">👤</div>' +
    '<div class="settings-info"><div class="settings-label">معلومات الحساب</div><div class="settings-desc">' + U.esc(App.state.user.email || 'ضيف') + '</div></div>' +
    '<span style="color:var(--text-3);font-size:18px">‹</span>' +
    '</div>' +
    '</div>' +
    '<div class="settings-section">' +
    '<h3 class="settings-title">عن التطبيق</h3>' +
    '<div class="settings-item">' +
    '<div class="settings-icon">🏠</div>' +
    '<div class="settings-info"><div class="settings-label">منصة إتقان</div><div class="settings-desc">الإصدار 1.0.0 • حيث يتقن العلم</div></div>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:center;padding:26px 0;color:var(--text-3);font-size:12px;font-weight:600">© 2025 منصة إتقان</div>' +
    '</main>' +
    layout.BottomNav('profile') +
    '</div>' +
    '</div>';
}

var Settings = {
  toggleTheme: function() {
    Theme.toggle();
    Router.go('settings');
  }
};
window.Settings = Settings;

// ═══════════════════════════════════════════════════════
// 4) ADMIN SCREEN
// ═══════════════════════════════════════════════════════
var AdminState = { tab: 'users' };

function AdminScreen() {
  if (!Session.isLoggedIn()) { setTimeout(function() { Router.go('auth'); }, 50); return ''; }
  if (!Session.isAdmin()) { setTimeout(function() { Router.go('home'); }, 100); return '<div style="padding:40px;text-align:center;color:var(--red-600);font-weight:800">ليس لديك صلاحية</div>'; }

  setTimeout(function() { Admin.loadTab('users'); }, 100);

  return '<div class="app-layout">' +
    layout.Sidebar('admin') +
    '<div class="app-main">' +
    layout.Header('لوحة التحكم') +
    '<main class="app-content">' +
    '<div class="admin-stats-grid" id="admin-stats">' +
    '<div class="admin-stat"><div class="admin-stat-value" id="as-users">—</div><div class="admin-stat-label">مستخدمين</div></div>' +
    '<div class="admin-stat"><div class="admin-stat-value" id="as-online">—</div><div class="admin-stat-label">متصل</div></div>' +
    '<div class="admin-stat"><div class="admin-stat-value" id="as-rooms">—</div><div class="admin-stat-label">غرف</div></div>' +
    '<div class="admin-stat"><div class="admin-stat-value" id="as-msgs">—</div><div class="admin-stat-label">رسائل</div></div>' +
    '</div>' +
    '<div class="admin-tabs">' +
    '<button class="admin-tab active" onclick="Admin.tab(\'users\',this)">👥 المستخدمون</button>' +
    '<button class="admin-tab" onclick="Admin.tab(\'rooms\',this)">🏘️ الغرف</button>' +
    '<button class="admin-tab" onclick="Admin.tab(\'messages\',this)">💬 الرسائل</button>' +
    '<button class="admin-tab" onclick="Admin.tab(\'broadcast\',this)">📢 بث</button>' +
    '<button class="admin-tab" onclick="Admin.tab(\'danger\',this)">⚠️ خطر</button>' +
    '</div>' +
    '<div id="admin-content"><div class="admin-loading">⏳ جاري التحميل...</div></div>' +
    '</main>' +
    layout.BottomNav('profile') +
    '</div>' +
    '</div>';
}

var Admin = {
  loadStats: async function() {
    if (!window.db) return;
    try {
      var users = (await window.db.ref('users').once('value')).val() || {};
      var roomsMeta = (await window.db.ref('roomsMeta').once('value')).val() || {};
      var rooms = (await window.db.ref('rooms').once('value')).val() || {};

      var msgCount = 0;
      var onlineCount = 0;
      Object.keys(rooms).forEach(function(code) {
        var r = rooms[code];
        if (r.messages) msgCount += Object.keys(r.messages).length;
        if (r.users) onlineCount += Object.keys(r.users).length;
      });

      var setEl = function(id, val) {
        var el = U.$(id);
        if (el) el.textContent = val;
      };
      setEl('as-users', Object.keys(users).length);
      setEl('as-online', onlineCount);
      setEl('as-rooms', Object.keys(roomsMeta).length);
      setEl('as-msgs', msgCount);
    } catch(e) { console.error(e); }
  },

  tab: function(name, btn) {
    document.querySelectorAll('.admin-tab').forEach(function(t) { t.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    AdminState.tab = name;
    this.loadTab(name);
  },

  loadTab: function(name) {
    var content = U.$('admin-content');
    if (!content) return;
    content.innerHTML = '<div class="admin-loading">⏳ جاري التحميل...</div>';
    this.loadStats();

    switch (name) {
      case 'users': this.loadUsers(); break;
      case 'rooms': this.loadRooms(); break;
      case 'messages': this.showMsgTab(); break;
      case 'broadcast': this.showBroadcast(); break;
      case 'danger': this.showDanger(); break;
    }
  },

  loadUsers: async function() {
    var content = U.$('admin-content');
    try {
      var snap = await window.db.ref('users').once('value');
      var users = snap.val() || {};
      var entries = Object.keys(users).filter(U.safeKey).map(function(uid) {
        return { uid: uid, data: users[uid] };
      }).sort(function(a, b) {
        return (b.data.createdAt || 0) - (a.data.createdAt || 0);
      });

      if (!entries.length) {
        content.innerHTML = '<div class="admin-empty">لا مستخدمين</div>';
        return;
      }

      content.innerHTML = '<div style="font-size:11px;color:var(--text-3);margin-bottom:8px;font-weight:700">إجمالي: ' + entries.length + '</div>' +
        entries.map(function(item) {
          var u = item.data;
          var uid = item.uid;
          var isDev = u.role === 'developer';
          var isGuest = uid.indexOf('guest') === 0;
          var isBanned = u.banned === true;
          var badges = '';
          if (isDev) badges += ' 👑';
          if (isGuest) badges += ' 👤';
          if (isBanned) badges += ' 🚫';

          return '<div class="admin-item">' +
            '<div class="admin-item-info">' +
            '<div class="admin-item-name">' + U.esc(u.name || '?') + badges + '</div>' +
            '<div class="admin-item-meta">' + U.esc(u.email || '—') + ' • Lv.' + (u.level || 1) + '</div>' +
            '</div>' +
            '<button class="admin-btn ' + (isBanned ? 'admin-btn-info' : 'admin-btn-warning') + '" onclick="Admin.' + (isBanned ? 'unban' : 'ban') + '(\'' + uid + '\')">' + (isBanned ? '✅' : '🚫') + '</button>' +
            '<button class="admin-btn admin-btn-danger" onclick="Admin.delUser(\'' + uid + '\')">🗑</button>' +
            '</div>';
        }).join('');
    } catch(e) {
      content.innerHTML = '<div class="admin-empty">فشل: ' + e.message + '</div>';
    }
  },

  ban: function(uid) {
    UI.confirm('حظر', 'حظر هذا المستخدم؟').then(function(ok) {
      if (!ok) return;
      window.db.ref('users/' + uid).update({ banned: true, bannedAt: Date.now() })
        .then(function() { UI.toast('تم الحظر', 'success'); Admin.loadUsers(); });
    });
  },

  unban: function(uid) {
    window.db.ref('users/' + uid).update({ banned: false })
      .then(function() { UI.toast('تم فك الحظر', 'success'); Admin.loadUsers(); });
  },

  delUser: function(uid) {
    UI.confirm('حذف', 'حذف هذا المستخدم نهائياً؟').then(function(ok) {
      if (!ok) return;
      window.db.ref('users/' + uid).remove()
        .then(function() { UI.toast('تم الحذف', 'success'); Admin.loadUsers(); Admin.loadStats(); });
    });
  },

  loadRooms: async function() {
    var content = U.$('admin-content');
    try {
      var meta = (await window.db.ref('roomsMeta').once('value')).val() || {};
      var rooms = (await window.db.ref('rooms').once('value')).val() || {};
      var codes = Object.keys(meta).filter(U.safeKey);

      if (!codes.length) { content.innerHTML = '<div class="admin-empty">لا غرف</div>'; return; }

      content.innerHTML = codes.map(function(code) {
        var r = meta[code];
        var data = rooms[code] || {};
        var msgs = data.messages ? Object.keys(data.messages).length : 0;
        var users = data.users ? Object.keys(data.users).length : 0;
        var isPrivate = !!r.password;

        return '<div class="admin-item">' +
          '<div class="admin-item-info">' +
          '<div class="admin-item-name">' + U.esc(r.name || code) + (isPrivate ? ' 🔒' : ' 🌍') + '</div>' +
          '<div class="admin-item-meta">' + U.esc(code) + ' • 💬 ' + msgs + ' • 👥 ' + users + '</div>' +
          '</div>' +
          '<button class="admin-btn admin-btn-info" onclick="Admin.enterRoom(\'' + U.esc(code) + '\')">دخول</button>' +
          '<button class="admin-btn admin-btn-warning" onclick="Admin.clearRoom(\'' + U.esc(code) + '\')">🧹</button>' +
          '<button class="admin-btn admin-btn-danger" onclick="Admin.delRoom(\'' + U.esc(code) + '\')">🗑</button>' +
          '</div>';
      }).join('');
    } catch(e) {
      content.innerHTML = '<div class="admin-empty">فشل</div>';
    }
  },

  enterRoom: function(code) {
    if (window.ChatState) {
      window.ChatState.room = code;
    }
    Router.go('chat');
  },

  clearRoom: function(code) {
    UI.confirm('مسح', 'مسح رسائل ' + code + '؟').then(function(ok) {
      if (!ok) return;
      window.db.ref('rooms/' + code + '/messages').remove()
        .then(function() { UI.toast('تم المسح', 'success'); Admin.loadRooms(); Admin.loadStats(); });
    });
  },

  delRoom: function(code) {
    UI.confirm('حذف', 'حذف الغرفة ' + code + '؟').then(function(ok) {
      if (!ok) return;
      Promise.all([
        window.db.ref('rooms/' + code).remove(),
        window.db.ref('roomsMeta/' + code).remove()
      ]).then(function() { UI.toast('تم الحذف', 'success'); Admin.loadRooms(); Admin.loadStats(); });
    });
  },

  showMsgTab: async function() {
    var content = U.$('admin-content');
    try {
      var meta = (await window.db.ref('roomsMeta').once('value')).val() || {};
      var codes = Object.keys(meta).filter(U.safeKey);
      if (!codes.length) { content.innerHTML = '<div class="admin-empty">لا غرف</div>'; return; }

      content.innerHTML = '<select class="input" style="margin-bottom:12px;font-weight:700" onchange="Admin.loadMsgs(this.value)">' +
        '<option value="">-- اختر غرفة --</option>' +
        codes.map(function(c) { return '<option value="' + U.esc(c) + '">' + U.esc(meta[c].name || c) + '</option>'; }).join('') +
        '</select>' +
        '<div id="admin-msg-list"><div class="admin-empty">اختر غرفة</div></div>';
    } catch(e) { content.innerHTML = '<div class="admin-empty">فشل</div>'; }
  },

  loadMsgs: async function(code) {
    var list = U.$('admin-msg-list');
    if (!list || !code) return;
    list.innerHTML = '<div class="admin-loading">⏳...</div>';
    try {
      var snap = await window.db.ref('rooms/' + code + '/messages').limitToLast(50).once('value');
      var msgs = snap.val() || {};
      var keys = Object.keys(msgs).filter(U.safeKey).sort(function(a, b) { return (msgs[a].timestamp || 0) - (msgs[b].timestamp || 0); });

      if (!keys.length) { list.innerHTML = '<div class="admin-empty">لا رسائل</div>'; return; }

      list.innerHTML = keys.map(function(k) {
        var m = msgs[k];
        var text = m.type === 'image' ? '📷 صورة' : m.type === 'audio' ? '🎤 صوت' : (m.text || '').slice(0, 60);
        return '<div class="admin-item">' +
          '<div class="admin-item-info">' +
          '<div class="admin-item-name">' + U.esc(m.name || '?') + '</div>' +
          '<div class="admin-item-meta">' + U.esc(text) + '</div>' +
          '</div>' +
          '<button class="admin-btn admin-btn-danger" onclick="Admin.delMsg(\'' + code + '\',\'' + k + '\')">🗑</button>' +
          '</div>';
      }).join('');
    } catch(e) { list.innerHTML = '<div class="admin-empty">فشل</div>'; }
  },

  delMsg: function(room, id) {
    window.db.ref('rooms/' + room + '/messages/' + id).remove()
      .then(function() { Admin.loadMsgs(room); Admin.loadStats(); });
  },

  showBroadcast: function() {
    var content = U.$('admin-content');
    content.innerHTML = '<div class="field"><label>العنوان</label>' +
      '<input class="input" id="bc-title" placeholder="عنوان الإشعار"></div>' +
      '<div class="field"><label>الرسالة</label>' +
      '<textarea class="textarea" id="bc-body" rows="4" placeholder="نص الإشعار"></textarea></div>' +
      '<button class="btn btn-block" onclick="Admin.sendBroadcast()">📤 إرسال</button>';
  },

  sendBroadcast: async function() {
    var title = U.$('bc-title').value.trim();
    var body = U.$('bc-body').value.trim();
    if (!title || !body) { UI.toast('املأ الحقول', 'error'); return; }
    try {
      await window.db.ref('broadcast').set({
        title: title,
        body: body,
        from: App.state.user.name,
        timestamp: Date.now()
      });
      UI.toast('تم الإرسال', 'success');
      U.$('bc-title').value = '';
      U.$('bc-body').value = '';
    } catch(e) { UI.toast('خطأ: ' + e.message, 'error'); }
  },

  showDanger: function() {
    var content = U.$('admin-content');
    content.innerHTML = '<div style="background:var(--red-50);border:2px solid var(--red-600);border-radius:12px;padding:18px">' +
      '<div style="color:var(--red-600);font-weight:800;font-size:14px;margin-bottom:14px">⚠️ عمليات خطيرة</div>' +
      '<button class="btn btn-danger btn-block" style="margin-bottom:8px" onclick="Admin.dClearMsgs()">🗑 مسح كل رسائل الغرف</button>' +
      '<button class="btn btn-danger btn-block" style="margin-bottom:8px" onclick="Admin.dClearRooms()">🏘️ مسح كل الغرف (ما عدا GENERAL)</button>' +
      '<button class="btn btn-danger btn-block" onclick="Admin.dClearGuests()">👤 مسح كل الضيوف</button>' +
      '</div>';
  },

  dClearMsgs: function() {
    if (!confirm('مسح كل رسائل الغرف؟')) return;
    if (!confirm('متأكد 100%؟')) return;
    window.db.ref('rooms').once('value').then(function(snap) {
      var rooms = snap.val() || {};
      var promises = [];
      Object.keys(rooms).forEach(function(code) {
        if (rooms[code].messages) promises.push(window.db.ref('rooms/' + code + '/messages').remove());
      });
      return Promise.all(promises);
    }).then(function() { UI.toast('تم المسح', 'success'); Admin.loadStats(); });
  },

  dClearRooms: function() {
    if (!confirm('مسح كل الغرف (ما عدا GENERAL)؟')) return;
    window.db.ref('roomsMeta').once('value').then(function(snap) {
      var meta = snap.val() || {};
      var promises = [];
      Object.keys(meta).forEach(function(code) {
        if (code !== 'GENERAL') {
          promises.push(window.db.ref('rooms/' + code).remove());
          promises.push(window.db.ref('roomsMeta/' + code).remove());
        }
      });
      return Promise.all(promises);
    }).then(function() { UI.toast('تم المسح', 'success'); Admin.loadStats(); });
  },

  dClearGuests: function() {
    if (!confirm('مسح كل الضيوف؟')) return;
    window.db.ref('users').once('value').then(function(snap) {
      var users = snap.val() || {};
      var promises = [];
      Object.keys(users).forEach(function(uid) {
        if (uid.indexOf('guest') === 0) promises.push(window.db.ref('users/' + uid).remove());
      });
      return Promise.all(promises);
    }).then(function() { UI.toast('تم المسح', 'success'); Admin.loadStats(); });
  }
};
window.Admin = Admin;

// ═══════════════════════════════════════════════════════
// 5) Register Routes
// ═══════════════════════════════════════════════════════
Router.register('profile', ProfileScreen);
Router.register('settings', SettingsScreen);
Router.register('admin', AdminScreen);

console.log('%c✅ منصة إتقان — جاهزة!', 'color:#10B981;font-size:16px;font-weight:bold;');
console.log('   📱 10 شاشات كاملة');
console.log('   🔐 Auth (Email + Google + Admin + Guest)');
console.log('   🏠 Home + 💬 Chat + 🏘️ Rooms');
console.log('   🤖 Bot + 📄 Quiz + 🃏 Cards');
console.log('   👤 Profile + ⚙️ Settings + 👑 Admin');
console.log('');
console.log('   👤 Admin: admin / Itqan@2025');

})();

/* ═══════════════════════════════════════════════════════
   منصة إتقان — Enhancements (counters, confetti, admin FAB, misc)
   ═══════════════════════════════════════════════════════ */
(function() {
'use strict';
if (!window.App) return;

var App = window.App, U = App.utils, UI = App.ui, Router = App.router, Session = App.session;
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animated number counters
function countUp() {
  document.querySelectorAll('[data-count]').forEach(function(el) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce || !end) { el.textContent = end; return; }
    el.textContent = '0';
    var start = performance.now(), dur = 750;
    (function step(t) {
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  });
}

// Confetti
UI.confetti = function() {
  if (reduce) return;
  var colors = ['#10B981', '#F59E0B', '#FBBF24', '#059669', '#2563EB', '#EC4899'];
  var wrap = document.createElement('div');
  wrap.className = 'confetti-wrap';
  for (var i = 0; i < 70; i++) {
    var p = document.createElement('i');
    p.style.left = (Math.random() * 100) + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(function() { wrap.remove(); }, 3600);
};

// Admin floating button -> opens the admin screen
var fab = null;
function updateFab() {
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'admin-fab';
    fab.type = 'button';
    fab.title = 'لوحة التحكم';
    fab.setAttribute('aria-label', 'لوحة التحكم');
    fab.textContent = '👑';
    fab.onclick = function() { App.go('admin'); };
    document.body.appendChild(fab);
  }
  var show = Session.isLoggedIn() && Session.isAdmin() && Router.current !== 'admin' && Router.current !== 'auth';
  fab.classList.toggle('show', !!show);
}

Router.onRender(countUp);
Router.onRender(updateFab);

// Esc closes modals
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') UI.closeAll();
});

// Connectivity toasts
window.addEventListener('offline', function() { UI.toast('📡 مفيش إنترنت', 'warning', 4000); });
window.addEventListener('online', function() { UI.toast('✅ الإنترنت رجع', 'success', 2500); });

})();

