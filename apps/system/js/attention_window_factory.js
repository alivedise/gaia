(function(window) {
  /**
   * AttentionWindowFactory is a submodule
   * @param {AppWindow} app The ordering window of this factory.
   */
  var AttentionWindowFactory = function AttentionWindowFactory(app) {
    this.app = app;
    this.app.element.addEventListener('mozbrowseropenwindow', this);
  };

  AttentionWindowFactory.prototype.handleEvent =
    function atttw_handleEvent(evt) {
      if (evt.detail.features != 'attention')
        return;

      // stopPropagation means we are not allowing
      // Popup Manager to handle this event
      evt.stopPropagation();

      // Check if the app has the permission to open attention screens
      var manifestURL = this.app.manifestURL;

      if (!this.app || !this.app.hasAttentionPermission())
        return;

      // Canceling any full screen web content
      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }

      var attentionFrame = evt.detail.frameElement;

      var attention = new AttentionWindow({
        iframe: attentionFrame,
        url: evt.detail.url,
        name: evt.detail.name,
        manifestURL: this.app.manifestURL,
        origin: this.app.origin
      });

      this.app.attentionWindow = attention;

      this.app.element.addEventListener('_opened',
        this._handle__appopened.bind(this));
      attention.element.addEventListener('_terminated',
        this._handle__attentionterminated.bind(this));
      this.app.element.addEventListener('_foreground',
        this._handle__appopened.bind(this));
    };

  AttentionWindowFactory.prototype._handle__appopened = function() {
    if (this.app.attentionWindow) {
      this.app.attentionWindow.requestOpen();
    }
  };

  AttentionWindowFactory.prototype._handle__attentionterminated = function() {
    this.app.attentionWindow = null;
  };

  window.AttentionWindowFactory = AttentionWindowFactory;
}(this));
