'use strict';

/**
 * @constructor BrowserFrame
 * Define a basic mozbrowser iframe class.
 * It creates a mozbrowser iframe,
 * and finally returns the DOM element it just created
 * or the existed iframe which is converted to mozbrowser iframe.
 */

var BrowserFrame = (function invocation() {
  /**
   * We use a configuration object here
   * because the browserAPI is still growing up,
   * and the too long arguments would become unusable.
   * @type {Object}
   */
  var browserConfig = {
    /**
     * @param {string} url          The URL of the iframe
     * @param {string} origin       The origin of the iframe
     * @param {string} name         The name of the iframe
     * @param {string} manifestURL  This implies the browser iframe is an app or a web page.
     */
    'url': '',
    'origin': '',
    'name': '',
    'manifestURL': '',
    'oop': false,
    'iframe': null
  };

  function BrowserFrame() { // This constructor function is a local variable.
    this.id = nextId++;
    this.callbacks = {};
    this.options = this.extendOptions(arguments);
    // All arguments are values to createFrame
    createFrame.apply(this);
  };

  BrowserFrame.className = 'browser';

  BrowserFrame.prototype.default_options = browserConfig;

  // These are helper functions and variables used by the methods above
  // They're not part of the public API of the module, but they're hidden
  // within this function scope so we don't have to define them as a
  // property of Browser or prefix them with underscores.
  function createFrame(configuration) {
    var browser = configuration.iframe || document.createElement('iframe');
    browser.setAttribute('mozallowfullscreen', 'true');

    // Most apps currently need to be hosted in a special 'mozbrowser' iframe.
    // They also need to be marked as 'mozapp' to be recognized as apps by the
    // platform.
    browser.setAttribute('mozbrowser', 'true');

    if (oop)
      browser.setAttribute('remote', 'true');

    if (manifestURL)
      browser.setAttribute('mozapp', manifestURL);

    browser.src = url;

    browser.id = this.className + this.id;

    browser.classList.add(BrowserFrame.className);

    // Store the element
    this.element = browser;
  };

  var nextId = 0;
  // The public API for this module is the Browser() constructor function.
  // We need to export that function from this private namespace so that
  // it can be used on the outside. In this case, we export the constructor
  // by returning it. It becomes the value of the assignment expression
  // on the first line above.
  return BrowserFrame;
}()); // Invoke the function immediately after defining it.

