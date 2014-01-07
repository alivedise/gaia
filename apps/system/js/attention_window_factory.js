(function(window) {
  var AttentionWindowFactory = {
    init: function attwm_init() {
      window.addEventListener('mozbrowseropenwindow', this);
    },

    handleEvent: function attwm_handleEvent(evt) {
      console.log(evt.detail);
      //if (evt.detail.features != 'attention')
      //  return;

      // stopPropagation means we are not allowing
      // Popup Manager to handle this event
      evt.stopPropagation();


      // Check if the app has the permission to open attention screens
      var manifestURL = evt.target.getAttribute('mozapp');
      var app = Applications.getByManifestURL(manifestURL);

      //if (!app || !this._hasAttentionPermission(app))
      //  return;

      // Canceling any full screen web content
      if (document.mozFullScreen) {
        document.mozCancelFullScreen();
      }

      var attentionFrame = evt.detail.frameElement;

      var attention = new AttentionWindow({
        iframe: attentionFrame,
        url: evt.detail.url,
        name: evt.detail.name
      });
    },

    _hasAttentionPermission: function as_hasAttentionPermission(app) {
      var mozPerms = navigator.mozPermissionSettings;
      if (!mozPerms)
        return false;

      var value = mozPerms.get('attention', app.manifestURL, app.origin, false);

      return (value === 'allow');
    },

    _hasTelephonyPermission: function as_hasAttentionPermission(app) {
      var mozPerms = navigator.mozPermissionSettings;
      if (!mozPerms)
        return false;

      var value = mozPerms.get('telephony', app.manifestURL, app.origin, false);

      return (value === 'allow');
    }
  };

  AttentionWindowFactory.init();

  window.AttentionWindowFactory = AttentionWindowFactory;
}(this));
