/**
 * Forward a message from the Deamon to the DOM via window.postMessage()
 *
 * Runs in the context of a webpage. (Only has access to the dom, doesn't have access to javascript running inside the page or many of the chrome.* methods)
 */
(function (window) {
	"use strict";
	var ready = false;
	var timedOut = false;
	var timer = null;
	var queue = [];

	/**
	 * Handle predefined labels and send the data to the page via window.postMessage()
	 * @param {*} data
	 */
	var send = function (data) {
		var consoleMethods = {
			'log': 'log',
			'info': 'info',
			'warning': 'warn',
			'error': 'error'
		};
		var method = consoleMethods[data.label];
		if (method) {
			// Handle labels: 'log', 'info', 'warning' and 'error'
			var message = data.message;
			try {
				message = JSON.parse(data.message);
			} catch(e) {}
			console[method]('[DebugR]', message);
		}
		if (data.label === 'html') {
			var div = document.createElement('div');
			div.className = 'debugR';
			div.innerHTML = data.message;
			document.getElementsByTagName('body')[0].appendChild(div);
		}
		return window.postMessage(data, '*');
	};
	chrome.extension.onMessage.addListener(function(message) {
		if (ready) { // Is debugr.js loaded?
			send(message);
			return;
		}
		if (timedOut) {
			return;
		}
		if (timer === null && document.documentElement.hasAttribute('data-debugr')) { // is debugr ready on before the first message?
			ready = true;
			document.documentElement.removeAttribute('data-debugr'); // cleanup DOM
			send(message);
			return;
		}
		// debugr.js is not yet loaded. queing messages.
		queue.push(message);
		if (timer === null) {
			timer = setInterval(function () {
				if (document.documentElement.hasAttribute('data-debugr')) {
					clearInterval(timer);
					ready = true;
					document.documentElement.removeAttribute('data-debugr'); // cleanup DOM
					// send all queued messages.
					for (var i in queue) {
						send(queue[i]);
					}
					queue.length = 0;
				}
			}, 500);

			// After a 10 sec timeout, stop buffering DebugR messages.
			setTimeout(function () {
				timedOut = true;
				clearInterval(timer);
				queue.length = 0;
			}, 10000);
		}
	});
})(this);