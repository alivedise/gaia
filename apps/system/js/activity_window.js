(function(window) {
  function ActivityWindow(app) {
    /**
     * Overwrite the default container which is #windows.
     * We(InlineActivityWindow) are living 
     * in a specific AppWindow instance.
     * @type {DOMElement}
     */
    this.CONTAINER = app.element;
    System.AppWindow.apply(this, arguments);
  };

  ActivityWindow.prototype = {
    __proto__: System.AppWindow.prototype,

    windowType: 'activity',

    CLASSNAME: 'activityWindow',

    default_config: {
      expectingSystemMessage: true
    },

    open: function() {
      this.element.dataset.transition = 'slide-up';
    },

    close: function() {
      this.element.dataset.transition = 'slide-down';
    }
  };

  System.ActivityWindow = ActivityWindow;
})(this);