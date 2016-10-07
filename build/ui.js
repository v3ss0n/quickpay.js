function Ui($) {

	"use strict";

	var
		KEYCODE_ESC = 27,

		REGEXP_EXPIRY = /^(0[1-9]|1[0-2])[\/-]?([0-9]{4}|[0-9]{2})$/g,
		REGEXP_CVV = /^[0-9]{3,4}$/g,
		REGEXP_EMAIL = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

		// predicate functions and predicate function creators
		_ = {
			matches: function(regex) { return function(str) { return str.search(regex) !== -1; }; },
			notEmpty: function(str) { return $.trim(str) !== ''; },
			cardValid: function(detail) { return detail.valid && detail.length_valid && detail.luhn_valid; }
		},

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
Emitter(Ui.prototype);
