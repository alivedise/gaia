'use strict';

mocha.globals(['VisibilityManager', 'System', 'LockScreen']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_attention_window_manager.js');
requireApp('system/test/unit/mock_lock_screen.js');

var mocksForVisibilityManager = new MocksHelper([
  'LockScreen', 'AttentionWindowManager'
]).init();

suite('system/VisibilityManager', function() {
  var stubById;
  mocksForVisibilityManager.attachTestHelpers();
  setup(function(done) {
    this.sinon.useFakeTimers();

    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/visibility_manager.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  suite('handle events', function() {
    test('lock', function() {
      VisibilityManager._normalAudioChannelActive = false;
      var stubPublish = this.sinon.stub(VisibilityManager, 'publish');
      VisibilityManager.handleEvent({
        type: 'lock'
      });

      assert.isTrue(stubPublish.calledTwice);
      assert.equal(stubPublish.getCall(0).args[0], 'hidewindows');
      assert.equal(stubPublish.getCall(1).args[0], 'hidewindow');

      VisibilityManager._normalAudioChannelActive = true;
      VisibilityManager.handleEvent({
        type: 'lock'
      });

      assert.isTrue(stubPublish.calledThrice);
      assert.equal(stubPublish.getCall(2).args[0], 'hidewindows');

      VisibilityManager._normalAudioChannelActive = false;
    });

    test('will-unlock', function() {
      MockLockScreen.locked = false;
      var stubPublish = this.sinon.stub(VisibilityManager, 'publish');

      VisibilityManager.handleEvent({
        type: 'will-unlock'
      });

      assert.isTrue(stubPublish.calledTwice);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'showwindows');
      assert.isTrue(stubPublish.getCall(1).args[0] === 'showwindow');
    });

    test('attentionopened', function() {
      var stubPublish = this.sinon.stub(VisibilityManager, 'publish');
      VisibilityManager.handleEvent({
        type: 'attentionopened',
        detail: {
          origin: 'fake-dialer'
        }
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'hidewindow');
      assert.isTrue(stubPublish.getCall(0).args[1].origin === 'fake-dialer');
    });

    test('attentionclosing', function() {
      var stubPublish = this.sinon.stub(VisibilityManager, 'publish');
      VisibilityManager.handleEvent({
        type: 'attentionclosing'
      });

      assert.isTrue(stubPublish.called);
      assert.isTrue(stubPublish.getCall(0).args[0] === 'showwindows');
      assert.isTrue(stubPublish.getCall(1).args[0] === 'showwindow');
    });

    test('Normal audio channel is on.', function() {
      VisibilityManager.handleEvent({
        type: 'mozChromeEvent',
        detail: {
          type: 'visible-audio-channel-changed',
          channel: 'normal'
        }
      });

      assert.isTrue(VisibilityManager._normalAudioChannelActive);
    });

    test('Normal audio channel is off.', function() {
      VisibilityManager.handleEvent({
        type: 'mozChromeEvent',
        detail: {
          type: 'visible-audio-channel-changed',
          channel: 'none'
        }
      });

      assert.isFalse(VisibilityManager._normalAudioChannelActive);
    });

    test('Foreground request', function() {
      MockAttentionWindowManager.mFullyVisible = false;
      var setVisible1 = this.sinon.spy();
      VisibilityManager.handleEvent({
        type: 'apprequestforeground',
        detail: {
          setVisible: setVisible1
        }
      });

      assert.isTrue(setVisible1.calledWith(true));

      MockAttentionWindowManager.mFullyVisible = true;
      var setVisible2 = this.sinon.spy();
      VisibilityManager.handleEvent({
        type: 'activityrequestforeground',
        detail: {
          setVisible: setVisible2
        }
      });

      assert.isFalse(setVisible2.called);
    });
  });
});
