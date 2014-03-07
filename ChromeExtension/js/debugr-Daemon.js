(function () {
	"use strict";

	/**
	 * @class Daemon
	 */
	var Daemon = function () {
		this.addDebugRHeader();
		this.listenForDebugRHeader();
	};

	/**
	 * Add "DebugR: Enabled" to all XMLHttpRequests
	 */
	Daemon.prototype.addDebugRHeader = function () {
		chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
			var headers = details.requestHeaders || [];
			headers.push({
				name: 'DebugR',
				value: 'Enabled'
			});
			return {
				requestHeaders: headers
			};
		}, {
			urls: ["http://*/*", "https://*/*"],
			types: ["xmlhttprequest"]
		}, ['blocking', 'requestHeaders']);
	};

	/**
	 * Process all response headers and send the message to the debugr listener.
	 */
	Daemon.prototype.listenForDebugRHeader = function () {
		var self = this;
		chrome.webRequest.onHeadersReceived.addListener(function (details) {
			var debugrHeaders = {}, normalHeaders = [], i, header, match, label, chunk, data;
			for (i = 0; i < details.responseHeaders.length; i++) {
				header = details.responseHeaders[i];
				match = header.name.match('^DebugR(-(.+))?$', 'i');
				if (match) {
					label = match[2] || '';
					chunk = label.match('^(.+)\\.chunk([0-9]+)$');
					if (chunk) { // Is the header chunked?
						if (typeof debugrHeaders[chunk[1]] === 'undefined') {
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
				if (typeof data === "string") {
					self.dataReceived(atob(data), label, details);
				} else {
					// merge chunked header
					i = 0;
					var value = '';
					while (typeof data[i] !== 'undefined') {
						value += data[i];
						i++;
					}
					self.dataReceived(atob(value), label, details);
				}
			}
			return {
				responseHeaders: normalHeaders // Only pass the non-DebugR headers to the javascript XMLHttpRequest
			};
		}, {
			urls: ["http://*/*", "https://*/*"],
			types: ["xmlhttprequest"]
		}, ['blocking', 'responseHeaders']);
	};

	/**
	 * Handle data from a 'DebugR:' header.
	 */
	Daemon.prototype.dataReceived = function (message, label, details) {
		var headers = {};
		for (var i = 0; i < details.responseHeaders.length; i++) {
			var header = details.responseHeaders[i];
			if (header.name.match('^DebugR(-(.+))?$', 'i') == null) {
				headers[header.name] = header.value;
			}
		}
		var number = null;
		var match = label.match('(.+)\\.([0-9]+)$');
		if (match) {
			number = match[2];
			label = match[1];
		}
		chrome.tabs.sendMessage(details.tabId, {
			debugR: true,
			message: message,
			label: label,
			number: number,
			url: details.url,
			headers: headers
		});
	};

	var daemon = new Daemon();
})();