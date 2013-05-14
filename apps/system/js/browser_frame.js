'use strict';

/* Define a basic mozbrowser iframe class.
 * It creates a mozbrowser iframe,
 * and finally returns the DOM element it just created.
 */

var BrowserFrame = (function invocation() {
  var nextId = 0;
  function BrowserFrame() { // This constructor function is a local variable.
    this.element = null;
    this.id = nextId++;
    this.callbacks = {};
    // All arguments are values to createFrame
    createFrame.apply(this, arguments);
  }

  BrowserFrame.className = 'browser';

  var events = [
    'loadstart',
    'loadend',
    'locationchange',
    'titlechange',
    'iconchange',
    'showmodalprompt',
    'open',
    'close',
    'securitychange',
    'contextmenu',
    'error',
    'scroll',
    'securitychange',
    'requireusernameandpassword'
  ];

  BrowserFrame.events = events;

  BrowserFrame.prefix = 'mozbrowser';

  var methods = [
    'go',
    'stop',
    'reload',
    'goBack',
    'goForward',
    'canGoBack',
    'canGoForward',
    'getScreenshot',
    'setVisible'
  ];

  // These are helper functions and variables used by the methods above
  // They're not part of the public API of the module, but they're hidden
  // within this function scope so we don't have to define them as a
  // property of Browser or prefix them with underscores.
  function createFrame(config) {
    var browser = document.createElement('iframe');
    browser.setAttribute('mozallowfullscreen', 'true');

    // Most apps currently need to be hosted in a special 'mozbrowser' iframe.
    // They also need to be marked as 'mozapp' to be recognized as apps by the
    // platform.
    browser.setAttribute('mozbrowser', 'true');

    if (config.oop)
      browser.setAttribute('remote', 'true');

    if (config.manifestURL)
      browser.setAttribute('mozapp', config.manifestURL);

    /* If this frame corresponds to the homescreen, set mozapptype=homescreen
     * so we're less likely to kill this frame's process when we're running low
     * on memory.
     *
     * We must do this before we the appendChild() call below. Once
     * we add this frame to the document, we can't change its app type.
     */

    if (config.expectingSystemMessage) {
      iframe.setAttribute('expecting-system-message',
                          'expecting-system-message');
    }

    setMozAppType(browser, config);

    browser.src = config.url;

    browser.id = BrowserFrame.className + this.id;

    browser.classList.add(BrowserFrame.className);

    browser.dataset.origin = config.origin;

    // Store the element
    this.element = browser;

    this.onstatus = null;

    this.currentStatus = null;

    this.methods = methods;

    events.forEach(function(eventName) {
      this.element.addEventListener('mozbrowser' + eventName,
        function(evt) {
          evt.name = evt.type.replace('mozbrowser', '');
          this.currentStatus = evt.name;

          if (System.DEBUG)
            console.log('[browser event]', evt.type);
          if (this.onstatus)
            this.onstatus(evt);
        }.bind(this));
    }, this);
  };

  function setMozAppType(iframe, config) {
    // XXX: Those urls needs to be built dynamically.
    if (config.url.startsWith('app://communications.gaiamobile.org/dialer') ||
        config.url.startsWith('app://clock.gaiamobile.org')) {
      iframe.setAttribute('mozapptype', 'critical');
    } else if (config.isHomescreen) {
      iframe.setAttribute('mozapptype', 'homescreen');
    }
  };

  // The public API for this module is the Browser() constructor function.
  // We need to export that function from this private namespace so that
  // it can be used on the outside. In this case, we export the constructor
  // by returning it. It becomes the value of the assignment expression
  // on the first line above.
  return BrowserFrame;
}()); // Invoke the function immediately after defining it.

