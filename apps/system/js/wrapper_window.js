(function(window) {
  var WrapperWindow = function WrapperWindow(config) {
    this.config = config;
    this.windowName = config.name;
    this.manifest.name = config.title;
    this.config.chrome = {  
      navigation: true
    };
    this.render();
  };

  PopupWindow.prototype.__proto__ = WrapperWindow.prototype;

  PopupWindow.prototype._onRenderEnd = function pw__onRenderEnd() {
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
}(this));