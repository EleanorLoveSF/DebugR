/**
 * Client script for DebugR.
 *
 * Works like a $(document).ready and also has an asychronous interface like google analytics.
 */
(function () {
	"use strict";

	/**
	 * @class DebugR
	 */
	var DebugR = function (handlers) {
		this.handlers = handlers;
		this.messages = [];

		var self = this;
		window.addEventListener('message', function (e) { return self.handleMessage }, false);
		document.documentElement.setAttribute('data-debugR'); // Signal the forwarder that debugr.js is active.
	};

	/**
	 * Handle a incoming MessageEvent.
	 *
	 * @param e {MessageEvent}
	 */
	DebugR.prototype.handleMessage = function (e) {
		var details = e.data
		if (details.debugR) { // A debugR message?
			// Split the message from the details.
			var message = details.message;
			delete details.debugR;
			delete details.message;
			this.messages.push({
				message: message,
				details: details
			});
			for (var i in this.handlers) {
				this.handlers[i](message, details);
			}
		}
	};

	/**
	 * Add a handler for the debugR messages.
	 * @param callback  A handler
	 */
	DebugR.prototype.addHandler = function (callback) {
		this.handlers.push(callback);
		for (var i in this.messages) {
			var message = this.messages[i];
			callback(message.message, message.details);
		}
	};

	var queue = (typeof debugR == "undefined") ? [] : debugR;
	var dispatcher = new DebugR();
	window.debugR = function (callback) {
		return dispatcher.addHandler(callback);
	};
	window.debugR.push = window.debugR;
})();