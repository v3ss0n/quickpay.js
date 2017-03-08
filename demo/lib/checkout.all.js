'use strict';

function Ui($) {
	var _this2 = this;

	var KEYCODE_ESC = 27,
	    REGEXP_EXPIRY = /^(0[1-9]|1[0-2])[\/-]?([0-9]{4}|[0-9]{2})$/g,
	    REGEXP_CVV = /^[0-9]{3,4}$/g,
	    REGEXP_EMAIL = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
	    CC_FORMAT_AMEX = [4, 7, 4],
	    CC_FORMAT_NORMAL = [4, 4, 4, 4],
	    CC_TYPE_AMEX = 'amex',
	    CC_NUM_SEPARATOR = '  ',
	    CURRENCY_SYMBOLS = {
		THB: '฿',
		USD: '$',
		GBP: '£',
		JPY: '¥',
		AUD: '$',
		EUR: '€',
		HKD: '$',
		NZD: '$',
		SGD: '$',
		CHF: 'Fr'
	},
	    CLASS_VALIDATION_FAILED = 'validation-fail',
	    CLASS_INVALID_FIELD = 'invalid',


	// predicate functions and predicate function creators
	_ = {
		matches: function matches(regex) {
			return function (str) {
				return str.search(regex) !== -1;
			};
		},
		notEmpty: function notEmpty(str) {
			return $.trim(str) !== '';
		},
		cardValid: function cardValid(detail) {
			return detail.valid && detail.length_valid && detail.luhn_valid;
		}
	},
	    btnPay = $('.qp-btnpay'),
	    btnClose = $('.qp-btnclose'),
	    heading = $('.qp-title'),
	    image = $('.qp-img'),
	    cover = $('.qp-cover'),
	    desc = $('.qp-desc'),
	    indicator = $('.qp-loading'),
	    form = $('form'),
	    checkout = $('.qp-checkout'),
	    all = $('body'),
	    customCSS = $('#customCSS'),
	    fld_cardNum = $('#card_number'),
	    fld_expiry = $('#card_expiry_date'),
	    fld_cvv = $('#card_cvn'),
	    fld_name = $('#name'),
	    fld_email = $('#email'),
	    fld_phone = $('#phone'),
	    fld_wave_id = $('#wave_id'),
	    // temporary

	all_inputs = $('form input[type!=hidden]'),
	    ctr_name = $('#name_container'),
	    ctr_email = $('#email_container'),
	    ctr_phone = $('#phone_container'),
	    formValidations = {

		card: [[fld_cardNum, _.notEmpty], [function () {
			return fld_cardNum.validateCreditCard();
		}, _.cardValid, fld_cardNum], [fld_expiry, [_.notEmpty, _.matches(REGEXP_EXPIRY)]], [fld_cvv, [_.notEmpty, _.matches(REGEXP_CVV)]], [fld_name, _.notEmpty], [fld_email, [_.notEmpty, _.matches(REGEXP_EMAIL)]], [fld_phone, _.notEmpty]],

		wavemoney: [[fld_wave_id, _.notEmpty]]

	},
	    _this = this;

	var _cfg = {},
	    blurValidateActive = true;

	this.form = form;
	this.getFormValidations = function () {
		var method = $('.qp-methodpage:visible').attr('id').replace('qp-form-', '');
		return formValidations[method];
	};

	this.init = function () {
		form.on('submit', _pay);
		cover.add(btnClose).on('click', _closeCheckout);
		$(document).on('keyup', _closeOnEsc);
		all_inputs.on('blur', _validateOnBlur);
		fld_cardNum.validateCreditCard(_handleValidatedCardNum);
		$('ul.tabs').tabs({ onShow: function onShow(e) {
				_focusFirstField(e);
			} });
	};

	function _handleValidatedCardNum(card) {
		_setCardTypeOnField(card);
		var pos = fld_cardNum[0].selectionStart,
		    len = fld_cardNum.val().length;
		card.card_type && fld_cardNum.val(_formatCardNumber(fld_cardNum.val(), card.card_type.name));
		var diff = fld_cardNum.val().length - len;
		card.card_type && fld_cardNum[0].setSelectionRange(pos + diff, pos + diff);
	}

	function _setCustomCSS(css) {
		customCSS.html(css);
	}

	function _validateOnBlur(e) {
		if (blurValidateActive && $(e.target).hasClass(CLASS_INVALID_FIELD)) _this.emit('requestValidate');
	}

	function _setCardTypeOnField(card) {
		fld_cardNum.add('.card-preview').attr('data-cardtype', card.card_type && card.card_type.name);
	}

	function _formatCardNumber(num, card_type_name) {
		var format = card_type_name == CC_TYPE_AMEX ? CC_FORMAT_AMEX : CC_FORMAT_NORMAL,
		    nums = num.replace(/[ -]/g, '').split('') // remove separators and get array of digits
		;
		// split into sized groups
		var start = 0,
		    groups = [];
		format.forEach(function (length) {
			var bit = nums.slice(start, start + length).join('');bit && groups.push(bit);start += length;
		});
		return groups.join(CC_NUM_SEPARATOR); // add standard separator between groups
	}

	this.showValidationFailed = function () {
		checkout.addClass(CLASS_VALIDATION_FAILED);
		setTimeout(_resetValidationFailed, 1000);
	};

	function _resetValidationFailed() {
		checkout.removeClass(CLASS_VALIDATION_FAILED);
	}

	this.showInvalidFields = function (fields, focus) {
		fields.length && fields.forEach(function (field) {
			return field.addClass(CLASS_INVALID_FIELD);
		});
		if (focus !== false) fields[0].focus();
	};

	this.clearInvalidFields = function () {
		$('form input').removeClass(CLASS_INVALID_FIELD);
	};

	this.showProcessIndicator = function (state) {
		var isVisible = state !== false;
		indicator.toggle(isVisible);
		btnPay.prop('disabled', isVisible);
	};

	this.setupForm = function (d) {
		_cfg = d;
		// any CSS?
		all.hide();
		_setCustomCSS(d.css || '');
		blurValidateActive = false;
		_clearFields();
		_this2.clearInvalidFields();
		// heading
		heading.html(d.title).toggle(!!d.title);
		// image
		image.attr({ src: d.image, alt: d.title }).toggle(!!d.image);
		checkout.toggleClass('no-image', !d.image);
		// description
		desc.html(d.description).toggle(!!d.description);
		// button text
		btnPay.val(_getButtonLabel(d.submitLabel, d.amount, d.currency));

		all.show();

		// show/hide tabs (will be set up already)
		_setupTabs(d.payMethods.split(','));

		// -- start payment method specific setup --------

		// name field
		ctr_name.toggle(!!d.showName);
		fld_name.val(typeof d.showName == 'string' ? d.showName : '');
		// email field
		ctr_email.toggle(!!d.showEmail);
		fld_email.val(typeof d.showEmail == 'string' ? d.showEmail : '');
		// phone field
		ctr_phone.toggle(!!d.showPhone);
		fld_phone.val(typeof d.showPhone == 'string' ? d.showPhone : '');

		// -- end payment method specific setup ----------

		// Make sure Materialize behaves itself
		Materialize.updateTextFields();
		// focus first field
		_focusFirstField();
		blurValidateActive = true;
	};

	function _setupTabs(methods) {
		// hide all tabs and method forms first
		$('.qp-methodpage, .qp-tabs li').hide();
		// show tabs we've been asked to show
		methods.forEach(function (method) {
			var formIDSel = '#qp-form-' + method;
			$('a[href=' + formIDSel + ']').closest('li').show();
		});
		// set first tab as active
		var firstTabID = 'qp-form-' + methods[0];
		$('.qp-tabs ul.tabs').tabs('select_tab', firstTabID);
		// show/hide tabs based on number of tabs
		$('.qp-tabs').toggle(methods.length > 1);
	}

	function _clearFields() {
		var _this3 = this;

		all_inputs.val('').each(function () {
			$(_this3).focus().blur();
		});
		$('form *').removeAttr('data-cardtype');
	}

	function _focusFirstField(container) {
		container = container || $('form .qp-methodpage:visible');
		container.find('input:visible').eq(0).focus();
	}

	function _pay(e) {
		_this.emit('requestPay');
		e.preventDefault();
		return false;
	}

	function _closeCheckout() {
		_this.emit('requestClose');
	}

	function _closeOnEsc(e) {
		if (e.keyCode == KEYCODE_ESC) _closeCheckout();
	}

	this.getFormData = function () {
		var formData = form.serializeArray(),
		    data = $.extend({}, _cfg),
		    existsOnCurrentMethod = false;
		formData.forEach(function (obj) {
			existsOnCurrentMethod = form.find('.qp-methodpage:visible [name=' + obj.name + ']').length;
			if (existsOnCurrentMethod) data[obj.name] = obj.name == 'card_number' ? obj.value.replace(/ /g, '') : obj.value;
		});
		return data;
	};

	function _getButtonLabel(txt, amount, curr) {
		return txt.replace('{amount}', _formatAmount(amount, curr));
	}

	function _formatAmount(amount, curr) {
		return CURRENCY_SYMBOLS[curr.toUpperCase()] + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
}

Emitter(Ui.prototype);
;'use strict';

function Validator($) {

	this.run = function (checks) {
		// run validation check(s) - return true if all passing, or an array of errored fields if not
		var res = void 0,
		    errs = [];
		checks.forEach(function (check) {
			res = _checkField.apply(0, check);
			if (res !== true) errs.push(res);
		});
		return errs.length ? errs : true;
	};

	function _checkField(valueOrGetter, checksToRun, relatedField) {
		// check a single value with given checks - return true if field is valid, or the field itself if invalid
		var valueIsJQ = valueOrGetter instanceof $,
		    toCheck = valueIsJQ ? valueOrGetter.val() : typeof valueOrGetter == 'function' ? valueOrGetter() : valueOrGetter,
		    validatorList = checksToRun instanceof Array ? checksToRun : [checksToRun],
		    field = relatedField || (valueIsJQ ? valueOrGetter : false),
		    res = false,
		    isHidden = valueIsJQ && valueOrGetter.is(':hidden');
		$.each(validatorList, function (i, validateFunc) {
			return res = validateFunc(toCheck);
		});
		return isHidden || res || field; // hidden fields considered valid
	}
}
;'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function Tokenizer(Paysbuy, $) {
	var _this = this;

	this.process = function (data, callback) {
		// make sure Expiry date is in correct format if it's there
		if (data.card_expiry_date) {
			data.card_expiry_date = _sanitiseExpiry(data.card_expiry_date);

			var _data$card_expiry_dat = data.card_expiry_date.split('-');

			var _data$card_expiry_dat2 = _slicedToArray(_data$card_expiry_dat, 2);

			data.card_expiry_month = _data$card_expiry_dat2[0];
			data.card_expiry_year = _data$card_expiry_dat2[1];
		}
		Paysbuy.setPublicKey(_this.key);
		Paysbuy.customise({
			mockMode: _this.mockMode
		});
		Paysbuy.createToken(data, callback);
	};

	function _sanitiseExpiry(dateString) {
		var expiryRegex = /^(0[1-9]|1[0-2])[\/-]?([0-9]{4}|[0-9]{2})$/g;

		var _expiryRegex$exec = expiryRegex.exec(dateString),
		    _expiryRegex$exec2 = _slicedToArray(_expiryRegex$exec, 3),
		    mm = _expiryRegex$exec2[1],
		    yyyy = _expiryRegex$exec2[2];

		if (yyyy.length == 2) yyyy = '20' + yyyy;
		return mm + '-' + yyyy;
	}
}
;'use strict';

function CheckoutApp(ui, validator, tokenizer, windowMessenger) {

	var QP_CLOSEMESSAGE = 'qp_close',
	    QP_TOKENIZESTARTMESSAGE = 'qp_tokenize_start',
	    QP_TOKENIZEENDMESSAGE = 'qp_tokenize_end';

	this.init = function () {
		windowMessenger.parentMessageHandler = _respondToParentMessage;
		ui.init();
		ui.on('requestPay', _pay);
		ui.on('requestValidate', _validateOnly);
		ui.on('requestClose', _parentCloseCheckout);
	};

	function _pay() {
		var valid = validator.run(ui.getFormValidations());
		ui.clearInvalidFields();
		if (valid === true) {
			ui.showProcessIndicator();
			var data = ui.getFormData(true);
			windowMessenger.messageParent(QP_TOKENIZESTARTMESSAGE);
			tokenizer.process(data, _receiveTokenizationResult);
		} else {
			ui.showValidationFailed();
			ui.showInvalidFields(valid);
		}
	}

	function _validateOnly() {
		ui.clearInvalidFields();
		ui.showInvalidFields(validator.run(ui.getFormValidations()), false);
	}

	function _returnSuccess(token) {
		var details = ui.getFormData();
		details.token = token;
		windowMessenger.messageParent(JSON.stringify(details));
	}

	function _receiveTokenizationResult(status, response) {
		ui.showProcessIndicator(false);
		windowMessenger.messageParent(QP_TOKENIZEENDMESSAGE);
		if (response.success) {
			_returnSuccess(response.object.token.id);
		} else {
			alert('There was a problem with the PAYSBUY tokenizer. Please try again');
		}
	}

	function _parentCloseCheckout() {
		windowMessenger.messageParent(QP_CLOSEMESSAGE);
	}

	function _respondToParentMessage(data) {
		tokenizer.key = data.key;
		tokenizer.mockMode = data.mockMode;
		ui.setupForm(data);
	}
}
;'use strict';

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
