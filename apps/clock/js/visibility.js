document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      console.log('[', new Date().toLocaleString() ,']', '[clock] I am shown.');
    } else {
      console.log('[', new Date().toLocaleString() ,']', '[clock] I am hidden.');
    }
});
