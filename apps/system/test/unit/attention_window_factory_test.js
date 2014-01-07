'use strict';

mocha.globals(['AttentionWindowFactory', 'AppWindow', 'System']);

requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_attention_window.js');

var mocksForAttentionWindowFactory = new MocksHelper([
  'AppWindow', 'AttentionWindow'
]).init();

suite('system/AttentionWindowFactory', function() {
  var stubById;
  mocksForAttentionWindowFactory.attachTestHelpers();
  setup(function(done) {
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/attention_window_factory.js', done);
  });
  var fakeAttentionConfig = {
    features: 'attention',
    frameElement: document.createElement('iframe'),
    url: 'fakeurl',
    name: 'fakecallscreen'
  };

  teardown(function() {
    stubById.restore();
  });

  var fakeAppConfig1 = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake'
  };

  test('open attention window: permission check', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var attwf1 = new AttentionWindowFactory(app1);
    var stubHasAttentionPermission =
      this.sinon.stub(app1, 'hasAttentionPermission');
    var stubAttentionWindow = this.sinon.stub(window, 'AttentionWindow');
    stubAttentionWindow.returns(new MockAttentionWindow());
    stubHasAttentionPermission.returns(false);
    attwf1.handleEvent({
      stopPropagation: function() {},
      detail: fakeAttentionConfig
    });
    assert.isUndefined(app1.attentionWindow);
    stubHasAttentionPermission.returns(true);
    attwf1.handleEvent({
      stopPropagation: function() {},
      detail: fakeAttentionConfig
    });
    assert.isDefined(app1.attentionWindow);
    assert.equal(stubAttentionWindow.getCall(0).args[0].url, 'fakeurl');
    assert.equal(stubAttentionWindow.getCall(0).args[0].name, 'fakecallscreen');
  });

  test('app is opened: open attention window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var attwf1 = new AttentionWindowFactory(app1);
    var stubHasAttentionPermission =
      this.sinon.stub(app1, 'hasAttentionPermission');
    var stubAttentionWindow = this.sinon.stub(window, 'AttentionWindow');
    var attention = new MockAttentionWindow();
    var stubRequestOpen = this.sinon.stub(attention, 'requestOpen');
    stubAttentionWindow.returns(attention);
    stubHasAttentionPermission.returns(true);
    attwf1.handleEvent({
      stopPropagation: function() {},
      detail: fakeAttentionConfig
    });

    app1.element.dispatchEvent(new Event('_opened'));
    assert.isTrue(stubRequestOpen.called);
  });

  test('app is foreground: open attention window', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var attwf1 = new AttentionWindowFactory(app1);
    var stubHasAttentionPermission =
      this.sinon.stub(app1, 'hasAttentionPermission');
    var stubAttentionWindow = this.sinon.stub(window, 'AttentionWindow');
    var attention = new MockAttentionWindow();
    var stubRequestOpen = this.sinon.stub(attention, 'requestOpen');
    stubAttentionWindow.returns(attention);
    stubHasAttentionPermission.returns(true);
    attwf1.handleEvent({
      stopPropagation: function() {},
      detail: fakeAttentionConfig
    });

    app1.element.dispatchEvent(new Event('_foreground'));
    assert.isTrue(stubRequestOpen.called);
  });


  test('attention is terminated: release the reference', function() {
    var app1 = new MockAppWindow(fakeAppConfig1);
    var attwf1 = new AttentionWindowFactory(app1);
    var stubHasAttentionPermission =
      this.sinon.stub(app1, 'hasAttentionPermission');
    var stubAttentionWindow = this.sinon.stub(window, 'AttentionWindow');
    var attention = new MockAttentionWindow();
    stubAttentionWindow.returns(attention);
    stubHasAttentionPermission.returns(true);
    attwf1.handleEvent({
      stopPropagation: function() {},
      detail: fakeAttentionConfig
    });

    attention.element.dispatchEvent(new Event('_terminated'));
    assert.isNull(app1.attentionWindow);
  });
});
