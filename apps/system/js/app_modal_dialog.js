(function(window) {
  var _ = navigator.mozL10n.get;
  var esc = System.escapeHTML;

  function ModalDialog(app) {
    System.UI.apply(this, arguments);
  };

  ModalDialog.prototype = {
    _instance: null,

    __proto__: System.UI.prototype,

    CLASSNAME: 'modalDialog',

    ELEMENTS: ['alert', 'prompt', 'confirm'],

    view: function() {
      return '<div id="' + this.ID + '" class="' +
          this.__proto__.CLASSNAME + ' visible">' +
            '<form class="alert" role="dialog" data-type="confirm">' +
              '<section>' +
                '<p class="alert-message">' +
                '</p>' +
              '</section>' +
              '<menu data-items="1">' +
                '<button class="alert-ok">' + _('ok') + '</button>' +
              '</menu>' +
            '</div>' +
            '<form class="confirm">' +
              '<section>' +
                '<p class="alert-message">' +
                '</p>' +
              '</section>' +
              '<menu data-items="2">' +
                '<button class="confirm-ok">' + _('ok') + '</button>' +
                '<button class="confirm-cancel">' + _('cancel') + '</button>' +
              '</menu>' +
            '</form>' +
            '<form class="prompt">' +
              '<section>' +
                '<p class="alert-message">' +
                '</p>' +
                '<input value="" type="text" />'
              '</section>' +
              '<menu data-items="2">' +
                '<button class="prompt-ok">' + _('ok') + '</button>' +
                '<button class="prompt-cancel">' + _('cancel') + '</button>' +
              '</menu>' +
            '</form>' +
            '<form class="custom-prompt">' +
              '<section>' +
                '<p class="custom-prompt-message">' +
                '</p>' +
              '</section>' +
              '<menu>' +
              '</menu>' +
            '</form>' +
          '</div>';
    },

    _onrenderend: function() {
      this.elements['alert-ok'].addEventListener('click', this);
      this.elements['confirm-ok'].addEventListener('click', this);
      this.elements['confirm-cancel'].addEventListener('click', this);
      this.elements['prompt-ok'].addEventListener('click', this);
      this.elements['prompt-cancel'].addEventListener('click', this);
    },

    update: function() {
      if (this._evt.length == 0)
        return;

      switch (this._evt[0].detail.type) {
        case 'alert':
          this.elements['alert-message'].textContent = esc(evt.detail.message);
          break;
        case 'prompt':
          this.elements['prompt-message'].textContent = esc(evt.detail.message);
          this.elements['prompt-input'].value = esc(evt.detail.initialValue);
          break;
        case 'custom-prompt':
          this.elements['custom-prompt-message'].textContent = esc(evt.detail.message);
          break;
        case 'confirm':
          this.elements['confirm-message'].textContent = esc(evt.detail.message);
          break;
      }
    },

    handleEvent: function(evt) {
      /**
       * The structure of modal dialog event:
       * var evt = {
       *   detail: {
       *     type: <type>,
       *     title: <title>,
       *     message: <message>,
       *     returnValue: <ret>
       *   },
       *   unblock: <function>
       * };
       */
      switch (evt.detail.type) {
        case 'alert':
        case 'confirm':
        case 'prompt':
        case 'custom-prompt':
          evt.preventDefault();
          this._evt.push(evt);
          this.elements[evt.detail.type].classList.add('visible');
          this.update();
          return;
      }

      if (!this._evt.length)
        return;

      var modalEvent = this._evt[0];
      switch (evt.target) {
        case this.elements['alert-ok']:
          this.elements['alert'].classList.remove('visible');
          /**
           * First in, first serve.
           * The browser may fire continous prompt events,
           * since they're queueing in |this._evt|,
           * we remove the first element when an event is done.
           */
          this._evt.splice(0, 1);
          break;
        case this.elements['confirm-ok']:
          this.elements['confirm'].classList.remove('visible');
          modalEvent.detail.returnValue = true;
          break;
        case this.elements['confirm-cancel']:
          this.elements['confirm'].classList.remove('visible');
          modalEvent.detail.returnValue = false;
          break;
        case this.elements['prompt-cancel']:
          this.elements['prompt'].classList.remove('visible');
          break;
        case this.elements['prompt-ok']:
          this.elements['prompt'].classList.remove('visible');
          modalEvent.detail.returnValue = this.elements['prompt-input'].value;
          break;
      }
      modalEvent.unblock();
      this._evt.splice(0, 1);
    }
  };

  System.ModalDialog = ModalDialog;
}(this));
