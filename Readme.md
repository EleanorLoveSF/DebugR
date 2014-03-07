# DebugR

A method to send debugging information alongside your XMLHTTPRequest.

Inspired by [FirePHP](http://www.firephp.org).

## Server

PHP:

```php
<?php
if (isset($_SERVER['HTTP_DEBUGR'])) { // Only send headers when DebugR is enabled
	// Send a message alongside the request.
	header('DebugR: '.base64_encode('Hello DebugR'));
	// Append a unique label to send multiple messages.
	header('DebugR-my-first-label: '.base64_encode('Moarr information'));
	// Send another message with the same label
	header('DebugR-my-first-label.2: '.base64_encode(''));

	// For very large messages, you should send the message in chunks (Detected by the "..chunk0", ".chunk1", etc suffix).
	// Restriction on the maximum size for a single HTTP header (Max 4Kib for nginx 8KiB for Apache)
	$chunks = str_split(base64_encode($largeString), 4000); //
	foreach ($chunks as $index => $chunk) {
		header('DebugR-largeString.chunk'.$index.': '.$chunk);
	}
}
?>
```

## Client

Install the [DebugR - Google Chrome extension](https://chrome.google.com/webstore/detail/debugr/odgodmleeenojpjigkkbicijhpplolmm) or include debugr.js which monkey-patches the XMLHttpRequest object.

Both the Chrome extension and the debugr.js use [window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window.postMessage) to push debugr information to the page.

```js
window.addEventListener('message', function (e) {
	if (e.data.debugR && e.data.label === 'my-first-label') {) {
		console.log(e.data);
	}
}, false);
document.documentElement.setAttribute('data-debugR'); // Signal the extension that the eventlistener is active.
```