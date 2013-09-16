(function(window) {
  var LayoutManager = {
    get windowHeight() {
      return window.innerHeight -
                    StatusBar.height -
                    SoftwareButtonManager.height -
                    KeyboardManager.getHeight();
    },

    get windowWidth() {
      return window.innerWidth;
    },

    get fullscreenHeight() {
      if (!AttentionScreen.isFullyVisible() && !AttentionScreen.isVisible()) {
        return window.innerHeight - KeyboardManager.getHeight() -
              SoftwareButtonManager.height;
      } else {
        return this.windowHeight;
      }
    }
  };

  window.LayoutManager = LayoutManager;
}(this));
