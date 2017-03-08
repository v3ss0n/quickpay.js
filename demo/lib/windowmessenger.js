'use strict';

function WindowMessenger(window) {

	var _this = this;

	this.window = window;
	this.parent = window.parent;
	this.parentDomain = '';

	this.parentMessageHandler = false;

	this.window.removeEventListener('message', _parentListener);
	this.window.addEventListener('message', _parentListener);

	this.messageParent = function (message, domain) {
		_this.parent.window.postMessage(message, domain || _this.parentDomain);
	};

	function _parentListener(event) {
		var d = void 0;
		if (event.data) {
			if (!_this.parentDomain) _this.parentDomain = event.origin;
			if (_this.parentMessageHandler && _this.parentDomain == event.origin) {
				d = JSON.parse(event.data);
				_this.parentMessageHandler(d);
			}
		}
	}
}
