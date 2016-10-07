function CheckoutApp(ui, validator, tokenizer) {

	"use strict";

	var 
		QP_CLOSEMESSAGE = 'close',
		parentDomain
	;

	this.init = function() {
		_listenToParent();
		ui.init();
		ui.on('requestPay', _pay);
		ui.on('requestClose', _parentCloseCheckout);
	};

	function _pay() {
		var valid = validator.run(ui.formValidations);
		if (valid === true) {
			ui.showProcessIndicator();
			tokenizer.process(ui.getFormData(true), _receiveTokenizationResult);
		} else {
			ui.showInvalidFields(valid);
		}
	}

	function _returnSuccess(token) {
		var details = ui.getFormData();
		details.token = token;
		_messageParent(JSON.stringify(details));
	}

	function _receiveTokenizationResult(status, response) {
		ui.showProcessIndicator(false);
		if (response.token) {
			_returnSuccess(response.token);
		} else {
			alert('There was a problem with the PAYSBUY tokenizer. Please try again');
		}
	}

	function _parentCloseCheckout() {
		_messageParent(QP_CLOSEMESSAGE);
	}


	function _messageParent(msg) {
		parent.window.postMessage(msg, parentDomain);
	}

	function _listenToParent() {
		window.removeEventListener("message", _parentListener);
		window.addEventListener("message", _parentListener, false);
	}


	function _parentListener(ev) {
		var d;
		if (ev.data) {
			if (!parentDomain) parentDomain = ev.origin;
			if (parentDomain == ev.origin) {
				d = JSON.parse(ev.data);
				tokenizer.key = d.key;
				ui.setupForm(d);
			}
		}
	}

}

