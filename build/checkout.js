(function (window, $, undefined) {

"use strict";


	var
		parentDomain = '',

		QP_CLOSEMESSAGE = 'close',
		KEYCODE_ESC = 27,

		REGEXP_EXPIRY = /^(0[1-9]|1[0-2])[\/-]?([0-9]{4}|[0-9]{2})$/g,
		REGEXP_CVV = /^[0-9]{3,4}$/g,
		REGEXP_EMAIL = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

		btnPay = $('.qp-btnpay'),
		btnClose = $('.qp-btnclose'),
		heading = $('.qp-title'),
		image = $('.qp-img'),
		cover = $('.qp-cover'),
		desc = $('.qp-desc'),
		indicator = $('.qp-loading'),

		fld_email = $('#email'),
		fld_cardNum = $('#card_number'),
		fld_expiry = $('#card_expiry_date'),
		fld_cvv = $('#card_cvn'),

		pbKey = '',

		validations = [
			[ fld_email, [notEmpty, matches(REGEXP_EMAIL)] ],
			[ fld_cardNum, notEmpty ],
			[ function() { return fld_cardNum.validateCreditCard(); }, cardValid, fld_cardNum ],
			[ fld_expiry, [notEmpty, matches(REGEXP_EXPIRY)] ],
			[ fld_cvv, [notEmpty, matches(REGEXP_CVV)] ]
		]

	;

	function init() {
		listenToParent();
		btnPay.on('click', pay);
		cover.add(btnClose).on('click', closeCheckout);
		$(document).on('keyup', closeOnEsc);
		// TODO - add class changing on card number field based on card type (visa etc.)
		fld_cardNum.validateCreditCard(setCardTypeOnField);
	}

	function setCardTypeOnField(card) {
		$(this).attr('data-cardtype', card.card_type && card.card_type.name);
	}

	function pay() {
		var valid = validate(validations);
		if (valid === true) {
			showIndicator();
			doTokenization(getFormData(true), _tokenizationDone);
		} else {
			showInvalidFields(valid)
		}
	}

	function showInvalidFields(fields) {
		console.log(fields);
		alert('invalid');
		// todo - highlight fields here
	}

	function validate(checks) {
		// run validation check(s) - return true if all passing, or an array of errored fields if not
		var res, errs = [];
		$.each(checks, function(i, check) {
			res = checkField.apply(0, check);
			if (res !== true) errs.push(res);
		});
		return errs.length ? errs : true;
	}

	function checkField(valueOrGetter, validators, relatedField) {
		// check a single value with given validators
		var
			valueIsJQ = valueOrGetter instanceof $,
			toCheck = valueIsJQ ? valueOrGetter.val() : (typeof valueOrGetter == 'function') ? valueOrGetter() : valueOrGetter,
			validatorList = (validators instanceof Array) ? validators : [ validators ],
			field = relatedField || (valueIsJQ ? valueOrGetter : false),
			res = false
		;
		$.each(validatorList, function(i, validateFunc) { return res = validateFunc(toCheck); });
		return res || field;
	}

	function matches(regexp) {
		return function(str) {
			return str.search(regexp) !== -1;
		};
	}

	function notEmpty(str) {
		return $.trim(str) != '';
	}

	function cardValid(detail) {
		// check passed card detail object (from the creditCardValidator jquery ext) is valid
		return detail.valid && detail.length_valid && detail.luhn_valid;
	}

	function showIndicator(state) {
		state = !(state === false);
		indicator.toggle(state);
		btnPay.prop('disabled', state);
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
		showIndicator(false);
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