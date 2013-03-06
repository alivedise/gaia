document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      console.log('[', new Date().toLocaleString() ,']', '[non clock:system] I am shown.');
    } else {
      console.log('[', new Date().toLocaleString() ,']', '[non clock:system] I am hidden.');
    }
});
