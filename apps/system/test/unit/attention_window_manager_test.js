'use strict';

mocha.globals(['AttentionWindowManager', 'System']);

requireApp('system/test/unit/mock_attention_window.js');

var mocksForAttentionWindowManager = new MocksHelper([
  'AttentionWindow'
]).init();

suite('system/AttentionWindowManager', function() {
  mocksForAttentionWindowManager.attachTestHelpers();
  var stubById;
  var att1, att2, att3;
  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));

    att1 = new AttentionWindow(fakeAttentionConfig);
    att2 = new AttentionWindow(fakeAttentionConfig);
    att3 = new AttentionWindow(fakeAttentionConfig);

    requireApp('system/js/attention_window_manager.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  var fakeAttentionConfig = {
    url: 'app://www.fakef/index.html',
    manifest: {},
    manifestURL: 'app://www.fakef/ManifestURL',
    origin: 'app://www.fakef'
  };

  function injectRunningAttentions() {
    AttentionWindowManager._instances = {};
    Array.slice(arguments).forEach(function iterator(att) {
      AttentionWindowManager._instances[att.instanceID] = att;
    });
  };

  suite('Handle events', function() {
    test('Keyboard show', function() {
      AttentionWindowManager._activeAttentionWindow = att1;
      var stubResize = this.sinon.stub(att1, 'resize');
      AttentionWindowManager.handleEvent({
        type: 'keyboardchange'
      });
      assert.isTrue(stubResize.called);
    });

    test('Keyboard hide', function() {
      AttentionWindowManager._activeAttentionWindow = att2;
      var stubResize = this.sinon.stub(att2, 'resize');
      AttentionWindowManager.handleEvent({
        type: 'keyboardhide'
      });
      assert.isTrue(stubResize.called);
    });

    test('Home button', function() {
      AttentionWindowManager._activeAttentionWindow = att3;
      var stubClose = this.sinon.stub(att3, 'close');
      AttentionWindowManager.handleEvent({
        type: 'home'
      });
      assert.isTrue(stubClose.called);
    });

    test('Emergency alert is shown', function() {
      AttentionWindowManager._activeAttentionWindow = att1;
      var stubClose = this.sinon.stub(att1, 'close');
      AttentionWindowManager.handleEvent({
        type: 'emergencyalert'
      });
      assert.isTrue(stubClose.called);
    });

    test('Show callscreen', function() {
      injectRunningAttentions(att1, att2, att3);
      var stubHasTelephonyPermission =
        this.sinon.stub(att3, 'hasTelephonyPermission');
      stubHasTelephonyPermission.returns(true);
      var stubRequestOpen = this.sinon.stub(att3, 'requestOpen');
      AttentionWindowManager.handleEvent({
        type: 'show-callscreen'
      });
      assert.isTrue(stubRequestOpen.called);
    });
  });
});
