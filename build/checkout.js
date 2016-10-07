(function (window, $, undefined) {

"use strict";


	var
		// predicate functions and predicate function creators
		_ = {
			matches: function(regex) { return function(str) { return str.search(regex) !== -1; }; },
			notEmpty: function(str) { return $.trim(str) !== ''; },
			cardValid: function(detail) { return detail.valid && detail.length_valid && detail.luhn_valid; }
		}
	;

	Emitter(Ui.prototype);


	var ui = new Ui($);
	var validator = new Validator($);
	var tokenizer = new Tokenizer(Paysbuy, $);

	(new CheckoutApp(ui, validator, tokenizer)).init();



	function Ui($) {

		var
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
			],

			_this = this

		;

		this.form = form;
		this.formValidations = formValidations;

		this.init = function() {
			btnPay.on('click', _pay);
			cover.add(btnClose).on('click', _closeCheckout); 
			$(document).on('keyup', _closeOnEsc); 
			fld_cardNum.validateCreditCard(_setCardTypeOnField);
		};

		function _setCardTypeOnField(card) {
			$(this).attr('data-cardtype', card.card_type && card.card_type.name);
		}

		this.showInvalidFields = function(fields) {
			alert('invalid');
			// todo - highlight fields here
		};

		this.showProcessIndicator = function(state) {
			state = !(state === false);
			indicator.toggle(state);
			btnPay.prop('disabled', state);
		};

		this.setupForm = function(d) {
			_clearFields();
			// heading
			heading.html(d.title).toggle(!!d.title);
			// image
			image.attr({src:d.image, alt:d.title}).toggle(!!d.image);
			// description
			desc.html(d.description).toggle(!!d.description);
			// button text
			btnPay.val(_getButtonLabel(d.submitLabel, d.amount, d.currency));
			// focus first field
			$('form input').eq(0).focus();
		};

		function _clearFields() {
			$('form input[type=text]').val('');
		}

		function _pay() {
			_this.emit('requestPay');
		}

		function _closeCheckout() {
			_this.emit('requestClose');
		}

		function _closeOnEsc(e) {
			if (e.keyCode == KEYCODE_ESC) _closeCheckout(); 
		}

		this.getFormData = function() {
			var
				formdata = form.serializeArray(),
				data = {}
			;
			$(formdata).each(function(i, obj){
				data[obj.name] = obj.value;
			});
			return data;
		};

		function _getButtonLabel(txt, amount, curr) {
			return txt.replace('{amount}', _formatAmount(amount, curr));
		}

		function _formatAmount(amount, curr) {
			// TODO - fix this (locale?)
			return '฿' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

	}



	function Validator($) {

		this.run = function(checks) {
			// run validation check(s) - return true if all passing, or an array of errored fields if not
			var res, errs = [];
			$.each(checks, function(i, check) {
				res = _checkField.apply(0, check);
				if (res !== true) errs.push(res);
			});
			return errs.length ? errs : true;
		};

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

	}



	function Tokenizer(Paysbuy, $) {

		this.process = function(data, callback) {
			// make sure Expiry date is in correct format if it's there
			if (data.card_expiry_date) data.card_expiry_date = _sanitiseExpiry(data.card_expiry_date);
			Paysbuy.setPublicKey(tokenizer.key);
			Paysbuy.createToken(data, callback);
		};

		function _sanitiseExpiry(dt) {
			var
				regex = /^(0[1-9]|1[0-2])[\/-]?([0-9]{4}|[0-9]{2})$/g,
				matches = regex.exec(dt),
				mm = matches[1],
				yyyy = matches[2]
			;
			if (yyyy.length==2) yyyy = '20'+yyyy;
			return mm+'-'+yyyy;
		}

	}


	function CheckoutApp(ui, validator, tokenizer) {

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














})(window, jQuery);