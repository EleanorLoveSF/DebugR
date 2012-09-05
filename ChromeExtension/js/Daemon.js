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
			var headers = details.requestHeaders || []
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
			var debugrHeaders = {}, i, header, match, label, chunk, data;
			for (i = 0; i < details.responseHeaders.length; i++) {
				header = details.responseHeaders[i];
				match = header.name.match('^DebugR(-(.+))?$', 'i');
				if (match) {
					label = match[2] || '';
					chunk = label.match('^(.+)--([0-9]+)$');
					if (chunk) { // Is the header chunked?
						if (typeof debugrHeaders[chunk[1]] == 'undefined') {
							debugrHeaders[chunk[1]] = {};
						}
						debugrHeaders[chunk[1]][chunk[2]] = header.value;
					} else {
						debugrHeaders[label] = header.value;
					}
				}
			}
			for (label in debugrHeaders) {
				data = debugrHeaders[label];
				if (typeof data == "string") {
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
		}, {
			urls: ["http://*/*", "https://*/*"],
			types: ["xmlhttprequest"]
		}, ['responseHeaders']);
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
		chrome.tabs.sendMessage(details.tabId, {
			debugR: true,
			message: message,
			label: label,
			url: details.url,
			headers: headers
		});
	};

	/**
	 * Inject a listener in every tab.
	 */
	Daemon.prototype.injectCommunication = function () {
		chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
			if (changeInfo.status === 'loading') { // New tab?
				chrome.tabs.executeScript(tabId, {
					file: 'js/forwarder.js',
					runAt: "document_start"
				});
			}
		});
	};

	var daemon = new Daemon();
})();