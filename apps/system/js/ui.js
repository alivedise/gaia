(function(window) {
  var nextID = 0;
  /**
   * A base view controller.
   *
   * It will do:
   * 1. Render the view,
   *     based on this.view().
   * 2. Get all the elements you need.
   * 3. Update the view,
   *     base on this.config.
   */
  function UI(config) {
    this._id = nextID++;
    if (!this.config)
      this.config = config;
    this.elements = {};
    this.render();
    this.update();
  };

  UI.prototype = {
    CONTAINER: document.body,

    /**
     * Where to append our view.
     * @return {DOMElement} DOM element
     */
    get container() {
      var container = this.CONTAINER || document.body;
      return container;
    },

    CLASSNAME: 'base-ui',

    /**
     * Override the Object.toString
     * to have readable print.
     * @return {String} class name + instanceID
     */
    toString: function() {
      return '[' + this.CLASSNAME + ']' + this.ID;
    },

    get ID() {
      return this.CLASSNAME + '-' + this._id;
    },

    /**
     * Call show() or not after render done.
     * @type {Boolean}
     */
    _initiallyShown: true,

    handleEvent: function() {},

    hide: function() {
      if (this.element)
        this.element.classList.remove('visible');
    },

    show: function() {
      if (this.element)
        this.element.classList.remove('visible');
    },

    _findElement: function(selector, element) {
      if (selector === '0')
        debugger;
      element = element || this.CONTAINER || document;

      if (!this.elements[selector]) {
        this.elements[selector] = element.querySelector(selector);
      }

      return this.elements[selector];
    },

    get element() {
      return this._findElement('.' + this.CLASSNAME);
    },

    view: function() {
      // replace me
    },

    render: function() {
      if (this._rendered)
        return;
      var container = this.CONTAINER || this.constructor.CONTAINER;
      container.insertAdjacentHTML('beforeend', this.view());
      this.getAllElements();
      if (this._initiallyShown)
        this.show();
      this._rendered = true;
      this._onrenderend();
    },

    update: function() {
      // implement me
    },
  
    getAllElements: function() {
      this.ELEMENTS.forEach(function(selector) {
        console.log(selector);
        if (!this.elements[selector])
          this.elements[selector] = this._findElement('.' + selector, this.element);
      }, this);
    },

    _onrenderend: function() {},

    resize: function() {
      // Usually we're called by Parent or an resize event
    },

    publish: function(eventName, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(eventName, true, false, detail);
      var target = this.container || window;
      target.dispatchEvent(evt);
    }
  };
  System.UI = UI;
})(this);
