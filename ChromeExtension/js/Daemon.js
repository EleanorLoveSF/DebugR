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
			for (var i = 0; i < details.responseHeaders.length; i++) {
				var header = details.responseHeaders[i];
				var match = header.name.match('^DebugR(-(.+))?$', 'i');
				if (match) {
					self.headerReceived(atob(header.value), match[2] || '', details);
				}
			}
		}, {
			urls: ["http://*/*", "https://*/*"],
			types: ["xmlhttprequest"]
		}, ['responseHeaders']);
	};

	/**
	 * Handle a single 'DebugR:' header.
	 */
	Daemon.prototype.headerReceived = function (message, label, details) {
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