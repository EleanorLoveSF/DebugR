/**
 * Client script for DebugR.
 *
 * Works like a $(document).ready and also has an asychronous interface like google analytics.
 */
(function () {
	"use strict";

	var DebugR = {}; // DebugR Namespace

	/**
	 * All listeners for DebugR messages.
	 */
	DebugR.handlers = [];

	/**
	 * All received debugR messages.
	 */
	DebugR.messages = [];

	/**
	 * The Dispatcher collects messages and calls all connected handlers.
	 */
	DebugR.Dispatcher = {


		/**
		 * Handle an incoming MessageEvent.
		 *
		 * @param e {MessageEvent}
		 */
		handleMessage: function (e) {
			if (e.data.debugR) { // A debugR message?
				// clone data
				var details = {};
				for (var property in e.data) {
					details[property] = e.data[property];
				}
				// Split the message from the details.
				var message = details.message;
				delete details.debugR;
				delete details.message;
				DebugR.messages.push({
					message: message,
					details: details
				});
				for (var i in this.handlers) {
					DebugR.handlers[i](message, details);
				}
			}
		},

		/**
		 * Add a handler for the debugR messages.
		 *
		 * @param callback  A handler.
		 */
		addHandler: function (callback) {
			DebugR.handlers.push(callback);
			// Relay all messages.
			for (var i in DebugR.messages) {
				var message = DebugR.messages[i];
				callback(message.message, message.details);
			}
		}
	 };
	DebugR.Dispatcher.handlers =(typeof debugR == "undefined") ? [] : debugR;

	window.addEventListener('message', DebugR.Dispatcher.handleMessage);
	document.documentElement.setAttribute('data-debugR', 'active'); // Signal the forwarder that debugr.js is active.

	window.debugR = DebugR.Dispatcher.addHandler; // Add the debugR ready function.
	window.debugR.push = window.debugR; // Add the asynchronous debugR  ready function.

	/**
	 * Client-side implementation of the DebugR extension.
	 * For Safari, IE9 and Chrome without DebugR
	 */
	DebugR.Listener = {

		/**
		 * Extract "DebugR" headers.
		 *
		 * @param xhr {XMLHttpRequest}
		 */
		parseHeaders: function (xhr) {
			var lines = xhr.getAllResponseHeaders().split("\n");
			var headers = [];
			for (var i in lines) {
				var line = lines[i];
				if (line == '') {
					break;
				}
				var pos = line.indexOf(':');
				headers.push({
					name: line.substr(0, pos),
					value: line.substr(pos + 1).trim()
				});
			}
			this.headersReceived({
				responseHeaders: headers,
				xhr: xhr
			});
		},

		/**
		 * Parse DebugR headers.
		 * (Copied from Daemon.prototype.listenForDebugRHeader)
		 */
		headersReceived: function (details) {
			var debugrHeaders = {}, normalHeaders = [], i, header, match, label, chunk, data;
			for (i = 0; i < details.responseHeaders.length; i++) {
				header = details.responseHeaders[i];
				match = header.name.match('^DebugR(-(.+))?$', 'i');
				if (match) {
					label = match[2] || '';
					chunk = label.match('^(.+)\\.chunk([0-9]+)$');
					if (chunk) { // Is the header chunked?
						if (typeof debugrHeaders[chunk[1]] == 'undefined') {
							debugrHeaders[chunk[1]] = {};
						}
						debugrHeaders[chunk[1]][chunk[2]] = header.value;
					} else {
						debugrHeaders[label] = header.value;
					}
				} else {
					normalHeaders.push(header);
				}
			}
			for (label in debugrHeaders) {
				data = debugrHeaders[label];
				if (typeof data == "string") {
					this.dataReceived(atob(data), label, details);
				} else {
					// merge chunked header
					i = 0;
					var value = '';
					while (typeof data[i] !== 'undefined') {
						value += data[i];
						i++;
					}
					this.dataReceived(atob(value), label, details);
				}
			}
		},

		/**
		 * Trigger the message event.
		 */
		dataReceived: function (message, label, details) {
			var data = {
				debugR: true,
				message: message,
				label: label,
				url: details.xhr.debugR.url
			};
			var event = document.createEvent('MessageEvent');
			event.initMessageEvent('message', true, true, data, 'http://debugr.net/', 'unknown', window,  null);
			window.dispatchEvent(event);
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
		}
	};


	// Overwrite the XMLHttpRequest.open() method
	var XMLHttpRequest_open = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function (method, url) {
		this.debugR = {
			enabled: true,
			method: method,
			url: url
		};
		return XMLHttpRequest_open.apply(this, arguments);
	};
	// Overwrite the XMLHttpRequest.send() method
	var XMLHttpRequest_send = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function () {
		this.setRequestHeader('DebugR', 'Enabled');
		this.addEventListener('readystatechange', function (e) {
			if (this.readyState === XMLHttpRequest.DONE) {
				DebugR.Listener.parseHeaders(this);
			}
		});
		return XMLHttpRequest_send.apply(this, arguments);
	}
})();