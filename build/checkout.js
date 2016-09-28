(function (window, $, undefined) {

"use strict";


	var
		parentDomain = '',

		_QP_CLOSEMESSAGE = 'close',

		btnPay = $('.btn-pay'),

		pbKey = ''

	;

	function init() {
		listenToParent();
		btnPay.on("click", pay);
	}

	function pay() {
		// TODO - validate form
		doTokenization(getFormData(true), _tokenizationDone);
	}

	function getFormData(includeCard) {
		var data = includeCard ? {
			card_number: '4111111111111111',
			card_expiry_date: '04-2020',
			card_cvn: '324'
		} : {};
		data.key = pbKey;
		return data;
	}

	function returnSuccess(token) {
		var details = getFormData();
		details.token = token;
		messageParent(JSON.stringify(details));
	}

	function _tokenizationDone(status, response) {
		if (response.token) {
			returnSuccess(response.token);
		} else {
			alert('There was a problem with the PAYSBUY tokenizer. Please try again');
		}
	}

	function doTokenization(data, callback) {
		Paysbuy.setPublicKey(data.key);
		Paysbuy.createToken(data, callback);
	}

	function closeCheckout() {
		messageParent(_QP_CLOSEMESSAGE);
	}

	function messageParent(msg) {
		parent.window.postMessage(msg, parentDomain);
	}

	function listenToParent() {
		window.removeEventListener("message", parentListener);
		window.addEventListener("message", parentListener, false);
	}

	function setupForm(d) {
		pbKey = d.key;
	}

	function parentListener(ev) {
		if (ev.data) {
			if (!parentDomain) parentDomain = ev.origin;
			if (parentDomain == ev.origin) setupForm(JSON.parse(ev.data));
		}
	}


	init();

})(window, jQuery);