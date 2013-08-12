(function(window) {
  var WrapperWindow = function WrapperWindow() {
    this.generateConfig.apply(this, arguments);
    console.log(this.config);
    this.windowName = this.config.name;
    this.config.chrome = {  
      navigation: true
    };
    this.render();
  };

  WrapperWindow.prototype.__proto__ = AppWindow.prototype;
  WrapperWindow.superClass = AppWindow;
  WrapperWindow.defaultTransition = {
    'open': AppWindow.transition.ENLARGING,
    'close': AppWindow.transition.REDUCING
  };

  WrapperWindow.prototype._onRenderEnd = function pw__onRenderEnd() {
    var iframe = this.browser.element;

    // XXX: What to do here?
    if (originName)
      iframe.dataset.originName = originName;
    if (originURL)
      iframe.dataset.originURL = originURL;

    if (searchName)
      iframe.dataset.searchName = searchName;
    if (searchURL)
      iframe.dataset.searchURL = searchURL;
  };

  window.WrapperWindow = WrapperWindow;

  var o = {
    _enterOpened: function wrapper__enterOpened() {

    }
  };

  WrapperWindow.addMixin = AppWindow.addMixin;

  WrapperWindow.addMixin(o);
}(this));