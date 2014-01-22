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

    requireApp('system/js/system.js');
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
    var AttWM = new AttentionWindowManager();
    AttWM._instances = {};
    Array.slice(arguments).forEach(function iterator(att) {
      AttWM._instances[att.instanceID] = att;
    });
    return AttWM;
  };

  suite('Handle events', function() {
    test('Keyboard show', function() {
      var AttWM = new AttentionWindowManager();
      AttWM._activeAttentionWindow = att1;
      var stubResize = this.sinon.stub(att1, 'resize');
      AttWM.handleEvent({
        type: 'keyboardchange'
      });
      assert.isTrue(stubResize.called);
    });

    test('Keyboard hide', function() {
      var AttWM = new AttentionWindowManager();
      AttWM._activeAttentionWindow = att2;
      var stubResize = this.sinon.stub(att2, 'resize');
      AttWM.handleEvent({
        type: 'keyboardhide'
      });
      assert.isTrue(stubResize.called);
    });

    test('Home button', function() {
      var AttWM = new AttentionWindowManager();
      AttWM._activeAttentionWindow = att3;
      var stubClose = this.sinon.stub(att3, 'close');
      AttWM.handleEvent({
        type: 'home'
      });
      assert.isTrue(stubClose.called);
    });

    test('Emergency alert is shown', function() {
      var AttWM = new AttentionWindowManager();
      AttWM._activeAttentionWindow = att1;
      var stubClose = this.sinon.stub(att1, 'close');
      AttWM.handleEvent({
        type: 'emergencyalert'
      });
      assert.isTrue(stubClose.called);
    });

    test('Show callscreen', function() {
      var AttWM = injectRunningAttentions(att1, att2, att3);
      var stubHasTelephonyPermission =
        this.sinon.stub(att3, 'hasTelephonyPermission');
      stubHasTelephonyPermission.returns(true);
      var stubRequestOpen = this.sinon.stub(att3, 'requestOpen');
      AttWM.handleEvent({
        type: 'show-callscreen'
      });
      assert.isTrue(stubRequestOpen.called);
    });
  });
});
