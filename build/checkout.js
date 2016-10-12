function CheckoutApp(ui, validator, tokenizer, windowMessenger) {

	"use strict";

	var 
		QP_CLOSEMESSAGE = 'close',
		parentDomain
	;

	this.init = function() {
		windowMessenger.parentMessageHandler = _respondToParentMessage;
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
		windowMessenger.messageParent(JSON.stringify(details));
		//////$('form').submit();
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
		windowMessenger.messageParent(QP_CLOSEMESSAGE);
	}

	function _respondToParentMessage(data) {
		tokenizer.key = data.key;
		ui.setupForm(data);
	}

}

