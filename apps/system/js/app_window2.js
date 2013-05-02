(function(window) {
  var id = 0;
  var screenElement = document.getElementById('screen');
  window.App = function(browserFrameConfig) {
    this.id = id++;
    this.browser = new BrowserFrame(browserFrameConfig);
    for (var configName in browserFrameConfig) {
      this.config[configName] = browserFrameConfig[configName];
    }
    this.render();

    if (window.AppError)
      this.errorDialog = new AppError(this);

    if (browserFrameConfig.isWrapper && window.AppWrapper) {
      this.isWrapper = true;
      this.wrapper = new AppWrapper(this); 
    }
  }

  App.prototype = new SystemUI();

  App.prototype.constructor = App;

  App.CONTAINER = document.getElementById('windows');

  App.CLASSNAME = 'app';

  App.prototype.render = function() {
    // We should only be called once.
    if (this.element)
      return;

    this.element = document.createElement('div');
    this.element.id = App.CLASSNAME + '-' + this.id;
    this.element.className = App.CLASSNAME;
    this.element.appendChild(browserFrame.element);
    App.CONTAINER.appendChild(this.element);
  }

  App.prototype.resize = function() {
    // We're asked by WindowManager to do resize
    // according to StatusBar height and ourself's fullscreen config.
    var cssWidth = window.innerWidth + 'px';
    var cssHeight = window.innerHeight - StatusBar.height;
    if (this.isWrapper) {
      cssHeight -= 10;
    }
    cssHeight += 'px';

    if (!AttentionScreen.isFullyVisible() && !AttentionScreen.isVisble() &&
        this.requireFullscreen()) {
      cssHeight = window.innerHeight + 'px';
    }

    this.element.style.width = cssWidth;
    this.element.style.height = cssHeight;

    this.publish('resize');
  }

  App.prototype.requireFullScreen = function requireFullscreen() {
    if (this.isFullscreen !== null)
      return this.isFullscreen;

    var manifest = this.manifest;
    if ('entry_points' in manifest && manifest.entry_points &&
        manifest.type == 'certified') {
       manifest = manifest.entry_points[origin.split('/')[3]];
    }

    this.isFullscreen = 'fullscreen' in manifest ? manifest.fullscreen : false;
  }

  App.prototype.isFullScreen = null;
})(this);