(function (window, $, undefined) {

"use strict";


	var

		parentDomain = '',

		QP_CLOSEMESSAGE = 'close',
		KEYCODE_ESC = 27,

		REGEXP_EXPIRY = /^(0[1-9]|1[0-2])[\/-]?([0-9]{4}|[0-9]{2})$/g,
		REGEXP_CVV = /^[0-9]{3,4}$/g,
		REGEXP_EMAIL = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

		// predicate functions and predicate function creators
		_ = {
			matches: function(regex) { return function(str) { return str.search(regex) !== -1; }; },
			notEmpty: function(str) { return $.trim(str) !== ''; },
			cardValid: function(detail) { return detail.valid && detail.length_valid && detail.luhn_valid; }
		}

	;




	var ui = (function($) {

		var
			btnPay = $('.qp-btnpay'),
			btnClose = $('.qp-btnclose'),
			heading = $('.qp-title'),
			image = $('.qp-img'),
			cover = $('.qp-cover'),
			desc = $('.qp-desc'),
			indicator = $('.qp-loading'),
			form = $('form'),

			fld_email = $('#email'),
			fld_cardNum = $('#card_number'),
			fld_expiry = $('#card_expiry_date'),
			fld_cvv = $('#card_cvn'),

			formValidations = [
				[ fld_email, [_.notEmpty, _.matches(REGEXP_EMAIL)] ],
				[ fld_cardNum, _.notEmpty ],
				[ function() { return fld_cardNum.validateCreditCard(); }, _.cardValid, fld_cardNum ],
				[ fld_expiry, [_.notEmpty, _.matches(REGEXP_EXPIRY)] ],
				[ fld_cvv, [_.notEmpty, _.matches(REGEXP_CVV)] ]
			]

		;

		function init() {
			btnPay.on('click', pay);
			cover.add(btnClose).on('click', closeCheckout);
			$(document).on('keyup', _closeOnEsc);
			fld_cardNum.validateCreditCard(_setCardTypeOnField);
		}

		function _setCardTypeOnField(card) {
			$(this).attr('data-cardtype', card.card_type && card.card_type.name);
		}

		function showInvalidFields(fields) {
			alert('invalid');
			// todo - highlight fields here
		}

		function showProcessIndicator(state) {
			state = !(state === false);
			indicator.toggle(state);
			btnPay.prop('disabled', state);
		}

		function setupForm(d) {
			_clearFields();
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

		function _clearFields() {
			$('form input[type=text]').val('');
		}

		function _closeOnEsc(e) {
			if (e.keyCode == KEYCODE_ESC) closeCheckout(); 
		}

		function getFormData() {
			var
				formdata = form.serializeArray(),
				data = {}
			;
			$(formdata).each(function(i, obj){
				data[obj.name] = obj.value;
			});
			return data;
		}

		return {
			init: init,
			showInvalidFields: showInvalidFields,
			showProcessIndicator: showProcessIndicator,
			form: form,
			setupForm: setupForm,
			getFormData: getFormData,
			formValidations: formValidations
		}

	})($);




	var validator = (function($) {

		function run(checks) {
			// run validation check(s) - return true if all passing, or an array of errored fields if not
			var res, errs = [];
			$.each(checks, function(i, check) {
				res = _checkField.apply(0, check);
				if (res !== true) errs.push(res);
			});
			return errs.length ? errs : true;
		}

		function _checkField(valueOrGetter, checksToRun, relatedField) {
			// check a single value with given checks
			var
				valueIsJQ = valueOrGetter instanceof $,
				toCheck = valueIsJQ ? valueOrGetter.val() : (typeof valueOrGetter == 'function') ? valueOrGetter() : valueOrGetter,
				validatorList = (checksToRun instanceof Array) ? checksToRun : [ checksToRun ],
				field = relatedField || (valueIsJQ ? valueOrGetter : false),
				res = false
			;
			$.each(validatorList, function(i, validateFunc) { return res = validateFunc(toCheck); });
			return res || field;
		}

		return {
			run: run 
		};

	})($);


	var tokenizer = (function() {

		function process(data, callback) {
			// make sure Expiry date is in correct format if it's there
			if (data.card_expiry_date) data.card_expiry_date = _sanitiseExpiry(data.card_expiry_date);
			Paysbuy.setPublicKey(tokenizer.key);
			Paysbuy.createToken(data, callback);
		}

		function _sanitiseExpiry(dt) {
			var
				matches = REGEXP_EXPIRY.exec(dt),
				mm = matches[1],
				yyyy = matches[2]
			;
			if (yyyy.length==2) yyyy = '20'+yyyy;
			REGEXP_EXPIRY.lastIndex = 0; // reset regex - IMPORTANT
			return mm+'-'+yyyy;
		}

		return {
			process: process
		};

	})();


	function init() {
		listenToParent();
		ui.init();
	}


	function pay() {
		var valid = validator.run(ui.formValidations);
		if (valid === true) {
			ui.showProcessIndicator();
			tokenizer.process(ui.getFormData(true), receiveTokenizationResult);
		} else {
			ui.showInvalidFields(valid);
		}
	}


	function returnSuccess(token) {
		var details = ui.getFormData();
		details.token = token;
		messageParent(JSON.stringify(details));
	}

	function receiveTokenizationResult(status, response) {
		ui.showProcessIndicator(false);
		if (response.token) {
			returnSuccess(response.token);
		} else {
			alert('There was a problem with the PAYSBUY tokenizer. Please try again');
		}
	}

	function closeCheckout() {
		messageParent(QP_CLOSEMESSAGE);
	}


	function messageParent(msg) {
		parent.window.postMessage(msg, parentDomain);
	}

	function listenToParent() {
		window.removeEventListener("message", parentListener);
		window.addEventListener("message", parentListener, false);
	}



	function getButtonLabel(txt, amount, curr) {
		return txt.replace('{amount}', formatAmount(amount, curr));
	}

	function formatAmount(amount, curr) {
		// TODO - fix this (locale?)
		return '฿' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	function parentListener(ev) {
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


	init();


})(window, jQuery);