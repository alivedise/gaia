(function(window) {
  function WrapperWindow() {
    System.AppWindow.apply(this, arguments);
    if (window.AppWrapper)
      this.wrapper = new AppWrapper(this);

    this.isWrapper = true;
  };

  WrapperWindow.prototype = {
    __proto__: System.AppWindow.prototype,

    windowType: 'wrapper',

    _preclose: function() {
      if (this.wrapper)
        this.wrapper.hide();
    },

    _onopened: function() {
      if (this.wrapper)
        this.wrapper.show();
    }
  };

  System.WrapperWindow = WrapperWindow;
})(this);
