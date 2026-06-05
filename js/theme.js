(function() {
  var themes = null;
  var current = localStorage.getItem('theme') || 'dark';

  function applyTheme(name) {
    if (!themes || !themes[name]) return;
    var vars = themes[name];
    var root = document.documentElement;
    for (var key in vars) {
      root.style.setProperty(key, vars[key]);
    }
    current = name;
    localStorage.setItem('theme', name);
    localStorage.setItem('theme_vars', JSON.stringify(vars));
    updateButton();
  }

  function updateButton() {
    var btn = document.getElementById('theme-btn');
    if (!btn) return;
    var icons = { dark: '🌙', light: '☀️', green: '🌿', twilight: '🦄', rainbow: '🌈', fluttershy: '🦋', rarity: '💎' };
    btn.textContent = icons[current] || current;
    btn.title = t('theme.label') + ': ' + current;
  }

  function createSwitcher() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var icons = { dark: '🌙', light: '☀️', green: '🌿', twilight: '🦄', rainbow: '🌈', fluttershy: '🦋', rarity: '💎' };
    var wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    header.appendChild(wrapper);

    var btn = document.createElement('button');
    btn.id = 'theme-btn';
    btn.className = 'theme-btn';
    btn.textContent = icons[current] || current;
    btn.title = t('theme.label') + ': ' + current;
    wrapper.appendChild(btn);

    var menu = document.createElement('div');
    menu.className = 'theme-menu';
    menu.id = 'theme-menu';
    wrapper.appendChild(menu);

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', function() {
      menu.classList.remove('open');
    });

    buildMenu(menu);
  }

  function buildMenu(menu) {
    menu.innerHTML = '';
    var names = themes ? Object.keys(themes) : ['dark', 'light', 'green'];
    var labels = {
      dark: t('theme.dark'), light: t('theme.light'), green: t('theme.green'),
      twilight: t('theme.twilight'), rainbow: t('theme.rainbow'), fluttershy: t('theme.fluttershy'), rarity: t('theme.rarity')
    };
    names.forEach(function(name) {
      var item = document.createElement('div');
      item.className = 'theme-item' + (name === current ? ' active' : '');
      item.textContent = labels[name] || name;
      item.addEventListener('click', function() {
        applyTheme(name);
        menu.classList.remove('open');
      });
      menu.appendChild(item);
    });
  }

  async function init() {
    try {
      var res = await fetch('/themes.json');
      if (res.ok) themes = await res.json();
    } catch(e) {}
    if (!themes) {
      themes = { dark: {}, light: {}, green: {} };
    }
    applyTheme(current);
    createSwitcher();
  }

  init();
})();
