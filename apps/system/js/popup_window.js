(function(window) {
  function PopupWindow(app) {
    this.CONTAINER = app.element;
    System.AppWindow.apply(this, arguments);
  };

  PopupWindow.prototype = {
    __proto__: System.AppWindow.prototype,

    windowType: 'popup',

    CLASSNAME: 'popupWindow',

    openTransition: 'entry-in',

    closeTransition: 'entry-out'
  }

  System.PopupWindow = PopupWindow;
})(this);