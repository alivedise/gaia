var Wallpaper = {
  settings: null,

  settingsName: 'homescreen.wallpaper',

  elements: {},

  getAllElements: function wallpaper_getAllElements() {
    var elementsID = ['wallpaper'];//, 'wallpaper-crop', 'wallpaper-thumbnail'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    elementsID.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        document.getElementById(name);
    }, this);

  },

  init: function wallpaper_init() {
    this.settings = window.navigator.mozSettings;
    if (!this.settings) // e.g. when debugging on a browser...
      return;

    this.getAllElements();
    window.addEventListener('click', this, true);
  },

  handleEvent: function wallpaper_handleEvent(evt) {
    var target = evt.target;
    if (!target.dataset || !target.dataset.index)
      return;

    target.parentNode.classList.add('selected');
    this.settings.getLock().set({ 'homescreen.wallpaper': target.dataset.index });
  }
};

Wallpaper.init();
