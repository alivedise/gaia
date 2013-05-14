(function(window) {
  var _ = navigator.mozL10n.get;
  function AppError(app) {
    this.CONTAINER = app.element;
    this.app = app;
    System.UI.apply(this, arguments);
  };

  AppError.prototype = {
    __proto__: System.UI.prototype,

    _initiallyShown: false,

    CLASSNAME: 'appError',

    ELEMENTS: ['close', 'reload', 'title', 'message'],

    _onrenderend: function() {
      var self = this;
      console.log(this.elements, '....');
      this.elements.close.onclick = function() {
        self.app.kill();
      };
      this.elements.reload.onclick = function() {
        self.hide();
        self.app.reload();
      };
    },

    handleEvent: function(evt) {
      if (evt.detail.type != 'other')
        return;
      
      this.update();
      this.show();
    },

    update: function() {
      this.elements.title.textContent = this.getTitle();
      this.elements.title.textContent = this.getMessage();
    },

    getTitle: function() {
      if (AirplaneMode.enabled) {
        return _('airplane-is-on');
      } else if (!navigator.onLine) {
        return _('network-connection-unavailable');
      } else {
        return _('error-title', { name: this.app.config.name });
      }
    },

    getMessage: function() {
      if (AirplaneMode.enabled) {
        return _('airplane-is-turned-on', { name: this.app.config.name });
      } else if (!navigator.onLine) {
        return _('network-error', { name: this.app.config.name });
      } else {
        return _('error-message', { name: this.app.config.name });
      }
    },

    view: function() {
      return '<div id="' + this.ID + '" class="' +
          this.__proto__.CLASSNAME + '" role="dialog">' +
        '<div class="modal-dialog-message-container inner">' +
          '<h3 data-l10n-id="error-title" class="title">' +
            this.getTitle() + '</h3>' +
          '<p>' +
           '<span data-l10n-id="error-message" class="message">' +
              this.getMessage() + '</span>' +
          '</p>' +
        '</div>' +
        '<menu data-items="2">' +
          '<button class="close" data-l10n-id="try-again">' +
            _('close') + '</button>' +
          '<button class="reload" data-l10n-id="try-again">' +
            _('try-again') + '</button>' +
        '</menu>' +
      '</div>';
    }
  };

  System.AppError = AppError;
})(this);