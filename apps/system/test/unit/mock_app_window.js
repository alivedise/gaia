var MockAppWindowHelper = {
  mInstances: [],
  mLatest: null
};

var MockAppWindow = function AppWindow(config) {
  this.open = function() {};
  this.close = function() {};
  this.kill = function() {};
  this.toggle = function() {};
  this.ready = function() {};
  this.isActive = function() {};
  this.changeURL = function() {};
  this.resize = function() {};
  this.setVisible = function() {};
  this.blur = function() {};
  this.publish = function() {};
  this.broadcast = function() {};
  this.fadeIn = function() {};
  this.fadeOut = function() {};
  this.setOrientation = function() {};
  this.focus = function() {};
  this.blur = function() {};
  this.debug = function() {};
  this.ensureFullRepaint = function() {};
  this.forward = function() {};
  this.canGoForward = function() {};
  this.canGoBack = function() {};
  this.back = function() {};
  this.reload = function() {};
  this.isFullScreen = function() {};
  this._changeState = function() {};
  this._setVisible = function() {};
  this.modifyURLatBackground = function() {};
  if (config) {
    for (var key in config) {
      this[key] = config[key];
    }
  }
  this.inProcess = false;
  this.isHomescreen = false;
  this.config = config;
  this.element = document.createElement('div');
  this.browser = {
    element: document.createElement('iframe')
  };
  MockAppWindowHelper.mInstances.push(this);
  MockAppWindowHelper.mLatest = this;
};

MockAppWindow.mTeardown = function() {
  MockAppWindowHelper.mInstances = [];
  MockAppWindowHelper.mLatest = null;
};
