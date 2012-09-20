# DebugR

A method to send debugging information alongside your XMLHTTPRequest.

inspired by FirePHP.

## Server

PHP:

```php
<?php
if (isset($_SERVER['HTTP_DEBUGR'])) { // Only send headers when DebugR is enabled
	// Send a message alongside the request.
	header('DebugR: '.base64_encode('Hello DebugR'));
	// Append a unique label to send multiple messages.
	header('DebugR-my-first-label: '.base64_encode('Moarr information'));

	// For very large messages, you should send the message in chunks (Detected by the "--0", "--1", etc suffix).
	// Restriction on the maximum size for a single HTTP header (Max 4Kib for nginx 8KiB for Apache)
	$chunks = str_split(base64_encode($largeString), (4 * 1024)); //
	foreach ($chunks as $index => $chunk) {
		header('DebugR-largeString--'.$index.': '.$chunk);
	}
}
?>
```

## Client

Vanilla js
```js
window.addEventListener('message', function (e) {
	if (e.data.debugR) {
		console.log(e.data);
	}
}, false);
document.documentElement.setAttribute('data-debugR'); // Signal the extension that the eventlistener is active.

```

Using debugr.js
```html
<script>
var debugR = debugR || [];
debugR.push(function (message, details) {
	console.log(message);
});
</script>
 .. other scripts and html ...
<script>
	(function () {
		var el = document.createElement('script'); el.type = 'text/javascript'; el.async = true;
		el.src = '/js/debugr.js';
		var s = document.getElementsByTagName('script')[0];s.parentNode.insertBefore(el, s);
	})();
</script>
```