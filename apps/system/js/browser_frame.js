'use strict';

/**
 * @fileOverview Define a basic mozbrowser iframe class.
 * It creates a mozbrowser iframe,
 * and finally returns the DOM element it just created.
 */

var BrowserFrame = (function invocation() {
  /**
   * @constructor
   * @this {BrowserFrame}
   */
  function BrowserFrame() { // This constructor function is a local variable.
    this.element = null;
    /**
     * @private
     */
    this.id = nextId++;
    this.callbacks = {};
    // All arguments are values to createFrame
    createFrame.apply(this, arguments);
  }

  BrowserFrame.className = 'browser';

  /**
   * We offer a public method to make an existed iframe to
   * become mozbrowser iframe.
   * @function BrowserFrame.browserize
   * @param {DOM IFRAME element} iframe An existed iframe element
   * @returns {DOM IFRAME} mozbrowserized iframe element
   */
  BrowserFrame.prototype.browserize = function browserize(iframe) {
    this.element = iframe;
    return createFrame.apply(this, arguments.shift(0));
  }

  /**
   * Test if an iframe element is mozbrowseriframe or not
   * @param {DOM IFRAME element} iframe An existed iframe element
   */

  // These are helper functions and variables used by the methods above
  // They're not part of the public API of the module, but they're hidden
  // within this function scope so we don't have to define them as a
  // property of Browser or prefix them with underscores.

  /**
   * createFrame is the core function of BrowserFrame.
   * It does:
   * 1. Create an iframe element or utilize existing one (via this.element)
   * 2. By config, assign relevant attributes to the iframe
   * @param  {string} url The URL of the iframe element
   * @param  {string} origin The format of origin is "protocol://host(:port)"
   * @param  {string} name The app/page name of this mozbrowser iframe
   * @param  {string} manifestURL Indicate this is a webapp or not.
   * @param  {boolean} oop Indicate this iframe is Out-Of-Process or not.
   */
  function createFrame(url, origin, name, manifestURL, oop) {
    var browser = this.element || document.createElement('iframe');
    browser.setAttribute('mozallowfullscreen', 'true');

    // Most apps currently need to be hosted in a special 'mozbrowser' iframe.
    // They also need to be marked as 'mozapp' to be recognized as apps by the
    // platform.
    browser.setAttribute('mozbrowser', 'true');

    if (oop)
      browser.setAttribute('remote', 'true');

    if (manifestURL) {
      browser.setAttribute('mozapp', manifestURL);
    } else {
      // Create a mozbrowser iframe "without manifestURL"
      // means that we are only a web page instead of a web app.
      browser.setAttribute('data-wrapper', 'true');
      this.isWrapper = true;
    }

    browser.src = url;

    browser.id = this.className + this.id;

    browser.classList.add(BrowserFrame.className);

    // Store the element
    this.element = browser;
  };

  /**
   * Maintain an ID of iframe created via BrowserFrame
   * @private
   */
  var nextId = 0;
  // The public API for this module is the Browser() constructor function.
  // We need to export that function from this private namespace so that
  // it can be used on the outside. In this case, we export the constructor
  // by returning it. It becomes the value of the assignment expression
  // on the first line above.
  return BrowserFrame;
}()); // Invoke the function immediately after defining it.

