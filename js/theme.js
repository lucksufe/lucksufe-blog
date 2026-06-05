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
    updateButton();
  }

  function updateButton() {
    var btn = document.getElementById('theme-btn');
    if (!btn) return;
    var icons = { dark: '🌙', light: '☀️', green: '🌿', twilight: '🦄', rainbow: '🌈', fluttershy: '🦋', rarity: '💎' };
    btn.textContent = icons[current] || current;
    btn.title = '主题: ' + current;
  }

  function createSwitcher() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var btn = document.createElement('button');
    btn.id = 'theme-btn';
    btn.className = 'theme-btn';
    btn.title = '切换主题';
    header.appendChild(btn);

    var menu = document.createElement('div');
    menu.className = 'theme-menu';
    menu.id = 'theme-menu';
    header.appendChild(menu);

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
      dark: '🌙 暗色', light: '☀️ 亮色', green: '🌿 护眼绿',
      twilight: '🦄 紫悦', rainbow: '🌈 云宝', fluttershy: '🦋 柔柔', rarity: '💎 珍奇'
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
