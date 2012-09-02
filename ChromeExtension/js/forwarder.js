/**
 * Forward a message from the Deamon to the DOM via window.postMessage()
 *
 * Runs in the context of a webpage. (Only has access to the dom, doesn't have access to javascript running inside the page or many of the chrome.* methods)
 */
(function (window) {
	"use strict";
	var ready = false;
	var queue = [];
	var timer = null;

	var send = function (message) {
		window.postMessage(message, '*');
	};
	chrome.extension.onMessage.addListener(function(message) {

		if (ready) { // Is debugr.js loaded?
			send(message);
			return;
		}
		if (timer == null && document.documentElement.hasAttribute('data-debugr')) { // is debugr ready on before the first message?
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
					clearTimeout(timer);
					ready = true;
					document.documentElement.removeAttribute('data-debugr'); // cleanup DOM
					// send all queued messages.
					for (var i in queue) {
						send(queue[i]);
					}
					queue = [];
				}

			}, 500);
		}
	});
})(this);