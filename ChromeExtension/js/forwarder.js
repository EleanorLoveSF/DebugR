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

	var send = function (data) {
		window.postMessage(data, '*');
		if (data.label === 'log') {
			try {
				console.log(JSON.parse(data.message));
			} catch(e) {
				console.log(data.message);
			}
		} else if (data.label === 'warning') {
			console.warn('Warning: ' + data.message);
		} else if (data.label === 'error') {
			console.error('Error: ' + data.message);
		} else if (data.label === 'html') {
			var div = document.createElement('div');
			div.className = 'debugR';
			div.innerHTML = data.message;
			document.getElementsByTagName('body')[0].appendChild(div)
		}
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