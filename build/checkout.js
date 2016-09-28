(function (window, $, undefined) {

"use strict";


	var
		parentDomain = '',

		QP_CLOSEMESSAGE = 'close',
		KEYCODE_ESC = 27,

		btnPay = $('.btn-pay'),
		heading = $('.qp-title'),
		image = $('.qp-img'),
		cover = $('.qp-cover'),
		desc = $('.qp-desc'),

		pbKey = ''
	;

	function init() {
		listenToParent();
		btnPay.on('click', pay);
		cover.on('click', closeCheckout);
		$(document).on('keyup', closeOnEsc);
	}

	function pay() {
		// TODO - validate form
		doTokenization(getFormData(true), _tokenizationDone);
	}

	function getFormData(includeCard) {
		var
			formdata = $("form").serializeArray(),
			data = {}
		;
		$(formdata).each(function(i, obj){
			data[obj.name] = obj.value;
		});

		if (!includeCard) {
			delete data.card_number;
			delete data.card_expiry_date;
			delete data.card_cvn;
		}

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
		messageParent(QP_CLOSEMESSAGE);
	}

	function closeOnEsc(e) {
		if (e.keyCode == KEYCODE_ESC) closeCheckout(); 
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
		clearFields();
		// heading
		heading.html(d.title).toggle(!!d.title);
		// image
		image.attr({src:d.image, alt:d.title}).toggle(!!d.image);
		// description
		desc.html(d.description).toggle(!!d.description);
		// button text
		btnPay.val(getButtonLabel(d.submitLabel, d.amount, d.currency));
		// focus first field
		$('form input').eq(0).focus();
	}

	function clearFields() {
		$('form input[type=text]').val('');
	}

	function getButtonLabel(txt, amount, curr) {
		return txt.replace('{amount}', formatAmount(amount, curr));
	}

	function formatAmount(amount, curr) {
		// TODO - fix this (locale?)
		return '฿' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	function parentListener(ev) {
		if (ev.data) {
			if (!parentDomain) parentDomain = ev.origin;
			if (parentDomain == ev.origin) setupForm(JSON.parse(ev.data));
		}
	}


	init();

})(window, jQuery);