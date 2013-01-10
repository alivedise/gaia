/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(window){

  var _ = null;

  if (navigator.mozL10n)
    _ = navigator.mozL10n.get;

  window.Error = function Error(Window) {
    var self = this;
    this.Window = Window;
    this.Window.frame.addEventListener('mozbrowsererror', function (evt){
      if (evt.detail.type != 'other')
        return;

      console.warn('Window of [' + self.Window.origin + '] got a mozbrowsererror event.');
      
      if (!self.injected) {
        self.render();
      } else {
        self.update();
      }
      self.show();
      self.injected = true;
    });
    return this;
  };

  Error.className = 'app-error';

  Error.prototype.hide = function() {
    this.element.classList.remove('visible');
  }

  Error.prototype.show = function() {
    this.element.classList.add('visible');
  }

  Error.prototype.render = function() {
    this.Window.frame.insertAdjacentHTML('beforeend', this.view());
    this.closeButton = this.Window.frame.querySelector('.' + Error.className + ' .close');
    this.reloadButton = this.Window.frame.querySelector('.' + Error.className + ' .reload');
    this.titleElement = this.Window.frame.querySelector('.' + Error.className + ' .title');
    this.messageElement = this.Window.frame.querySelector('.' + Error.className + ' .message');
    this.element = this.Window.frame.querySelector('.' + Error.className);
    var self = this;
    this.closeButton.onclick = function() {
      self.Window.kill();
    }

    this.reloadButton.onclick = function() {
      self.hide();
      self.Window.reload();
    }
  }

  Error.prototype.update = function() {
    this.titleElement.textContent = this.getTitle();
    this.messageElement.textContent = this.getMessage();
  }

  Error.prototype.id = function() {
    return Error.className + '-' + this.Window.frame.id;
  }

  Error.prototype.getTitle = function() {
    if (AirplaneMode.enabled) {
      return _('airplane-is-on');
    } else if (!navigator.onLine) {
      return _('network-connection-unavailable');
    } else {
      return _('error-title', { name: this.Window.name });
    }
  }

  Error.prototype.getMessage = function() {
    if (AirplaneMode.enabled) {
      return _('airplane-is-turned-on', { name: this.Window.name });
    } else if (!navigator.onLine) {
      return _('network-error', { name: this.Window.name });
    } else {
      return _('error-message', { name: this.Window.name });
    }         
  }

  Error.prototype.view = function() {
    return '<div id="' + this.id() + '" class="' + Error.className + ' visible" role="dialog">' +
      '<div class="modal-dialog-message-container inner">' +
        '<h3 data-l10n-id="error-title" class="title">' + this.getTitle() + '</h3>' +
        '<p>' +
         '<span data-l10n-id="error-message" class="message">' + this.getMessage() + '</span>' +
        '</p>' +
      '</div>' +
      '<menu data-items="2">' + 
        '<button class="close" data-l10n-id="try-again">' + _('close') + '</button>' +
        '<button class="reload" data-l10n-id="try-again">' + _('try-again') + '</button>' +
      '</menu>' +
    '</div>';
  }

  window.Window = function Window(configuration) {
    for (var key in configuration) {
      this[key] = configuration[key];
    }
    var self = this;
    this.BrowserAPI = {};
    this.BrowserAPI.Error = new Error(this);

    return this;
  };

  Window.prototype.reload = function() {
    this.iframe.reload(true);
  }

  Window.prototype.kill = function() {
    // XXX: A workaround
    // Window shouldn't reference Window Manager here.
    WindowManager.kill(this.origin);
  }

}(this));
