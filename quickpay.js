"use strict";

(function (window, undefined) {

	// polyfill for CustomEvent (IE)
	!function () {
		function a(a, b) {
			b = b || { bubbles: !1, cancelable: !1, detail: void 0 };var c = document.createEvent("CustomEvent");return c.initCustomEvent(a, b.bubbles, b.cancelable, b.detail), c;
		}return "function" != typeof window.CustomEvent && (a.prototype = window.Event.prototype, void (window.CustomEvent = a));
	}();

	window.Paysbuy = window.Paysbuy || {};

	if (!window.Paysbuy.QuickPay) {

		var QuickPay = function () {

			var DEFAULT_PARAMS = {
				key: '',
				onTokenReceived: undefined,
				image: '',
				locale: 'en-GB',
				submitLabel: 'Pay {amount}',
				title: '',
				description: '',
				amount: 0,
				currency: 'THB',
				invoice: '',
				showEmail: false,
				showPhone: false,
				showName: true,
				noSubmit: false,
				payMethods: 'card',
				payUrl: undefined,
				containerId: undefined
			},
			    QPSERVER = 'https://paysbuy.github.io',
			    QPPATH = '/quickpay.js/demo/lib',
			    QPPAGE = 'checkout.html',
			    QP_CLOSE = 'qp_close',
			    QP_TOKENIZESTART = 'qp_tokenize_start',
			    QP_TOKENIZEEND = 'qp_tokenize_end',
			    QP_SHOW = 'qp_show',
			    QP_HIDE = 'qp_hide',
			    QP_TOKENRECEIVED = 'qp_token_received',
			    ANIM_TIME = 300,
			    STYLE_IFRAME = {
				width: '100%',
				height: '100%',
				border: 'none',
				margin: '0'
			},
			    STYLE_IFRAME_POPUP = _merge({
				opacity: '0',
				transform: 'scale(0.9)',
				transition: ANIM_TIME + 'ms opacity ease, transform ' + ANIM_TIME + 'ms'
			}, STYLE_IFRAME),
			    STYLE_WRAPPER = {
				border: 'none',
				opacity: '0',
				visibility: 'hidden',
				zIndex: '99999',
				left: '0',
				top: '0',
				position: 'fixed',
				overflowX: 'hidden',
				width: '100%',
				height: '100%',
				transition: ANIM_TIME + 'ms opacity ease, transform ' + ANIM_TIME + 'ms'
			},
			    STYLE_WRAPPER_GREY = _merge({
				backgroundColor: 'rgba(0,0,0,0.75)'
			}, STYLE_WRAPPER),
			    CLASS_WRAPPER = 'qp-wrapper';

			function configure() {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

				return new Launcher(params);
			}

			function Launcher() {
				var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

				_merge(this, {
					_params: _merge({}, DEFAULT_PARAMS, params),
					_checkoutPageHolder: false,
					_checkoutWindow: false,
					_container: params.container
				});
				this._prepareCheckout();
			}

			_merge(Launcher.prototype, {

				open: function open(params) {
					var _p = _merge({}, this._params, params || {});
					if (_p.cssImport) _p.css = this._getImportCSS();
					this._sendConfigToCheckout(_p);
					this._tokenReceivedHandler = _p.onTokenReceived;
					this._paymentURL = _p.payUrl;
					this._active = true;
					this._cfg = _p;
					this._showCheckout();
				},

				_getImportCSS: function _getImportCSS() {
					var _a = [].slice,
					    css = '';
					_a.call(document.styleSheets).forEach(function (sheet) {
						if (sheet.title == 'quickpay') _a.call(sheet.cssRules).forEach(function (rule) {
							return css += rule.cssText;
						});
					});
					return css;
				},

				_prepareCheckout: function _prepareCheckout() {
					if (!this._checkoutWindow) {
						this._checkoutPageHolder = this._makePageHolder(this._params.containerId || true);
						this._checkoutListener = this._makeCheckoutListener();
						this._initCheckoutIframe(this._checkoutPageHolder.iframe, !this._checkoutPageHolder.isPopup);
					}
				},

				_sendConfigToCheckout: function _sendConfigToCheckout(params) {
					try {
						if (!params.hasOwnProperty('mockMode')) params.mockMode = window.Paysbuy.QuickPay.mockMode;
						this._checkoutWindow.postMessage(JSON.stringify(params), QPSERVER + QPPATH);
					} catch (e) {}
				},

				_listenToCheckout: function _listenToCheckout() {
					window.removeEventListener("message", this._checkoutListener);
					window.addEventListener("message", this._checkoutListener, false);
				},

				_makeCheckoutListener: function _makeCheckoutListener() {
					return function (_this) {
						return function (ev) {

							if (!_this._active) return false;

							// check message is coming from checkout
							if (!ev.origin || ev.origin != QPSERVER) {
								return false;
							}

							// receiving token or being asked to close?
							var res = void 0;
							switch (ev.data) {
								case QP_CLOSE:
									_this._notify(QP_CLOSE);
									res = _this._hideCheckout();
									break;
								case QP_TOKENIZESTART:
								case QP_TOKENIZEEND:
									res = _this._notify(ev.data);
									break;
								default:
									var obj = JSON.parse(ev.data);
									// run given handler for token if we have one
									_this._tokenReceivedHandler && _this._tokenReceivedHandler(obj);
									// start the payment process if QuickPay is handling it
									if (_this._paymentURL) {
										_this._doPayment(_this._paymentURL, obj, _this._cfg);
									} else {
										res = _this._hideCheckout();
									}
							}
							return res;
						};
					}(this);
				},

				_showCheckout: function _showCheckout() {
					if (this._checkoutPageHolder.isPopup) {
						this._styleElement(this._checkoutPageHolder.wrapper, { visibility: 'visible', opacity: 1 });
						document.body.style.overflow = 'hidden';
						this._styleElement(this._checkoutPageHolder.iframe, { transform: 'scale(1)', opacity: 1 });
					}
					this._listenToCheckout();
					this._notify(QP_SHOW);
				},

				_hideCheckout: function _hideCheckout() {
					if (this._checkoutPageHolder.isPopup) {
						setTimeout(function (_this) {
							return function () {
								_this._checkoutPageHolder.wrapper.style.visibility = 'hidden';
							};
						}(this), ANIM_TIME * 1.2);
						document.body.style.overflow = '';
						this._styleElement(this._checkoutPageHolder.iframe, { transform: 'scale(0.9)', opacity: 0 });
						this._checkoutPageHolder.wrapper.style.opacity = '0';
					}
					this._active = false;
					this._notify(QP_HIDE);
				},

				_notify: function _notify(what) {
					(this._container || document).dispatchEvent(_event(what, { bubbles: !0, cancelable: !1, detail: void 0 }));
				},

				_prepareWrapper: function _prepareWrapper() {
					var useGreyBackground = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

					var style = void 0,
					    wrapper = void 0;
					style = useGreyBackground ? STYLE_WRAPPER_GREY : STYLE_WRAPPER;
					wrapper = this._createStyledElement('div', style);
					wrapper.classList.add(CLASS_WRAPPER);
					document.body.appendChild(wrapper);
					return wrapper;
				},

				_prepareIframe: function _prepareIframe() {
					var forPopup = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

					return this._createStyledElement('iframe', forPopup ? STYLE_IFRAME_POPUP : STYLE_IFRAME);
				},

				_initCheckoutIframe: function _initCheckoutIframe(iframe, autoStart) {
					iframe.src = QPSERVER + QPPATH + '/' + QPPAGE;
					// capture the contentWindow object of the frame when it has loaded
					iframe.addEventListener("load", function (_this, _autoStart) {
						return function (e) {
							_this._checkoutWindow = e.target.contentWindow;
							_autoStart && _this.open();
						};
					}(this, autoStart));
				},

				_createStyledElement: function _createStyledElement(type, styles) {
					var elem = document.createElement(type);
					return this._styleElement(elem, styles);
				},

				_styleElement: function _styleElement(elem, styles) {
					var transf = ['webkitT', 'MozT', 'msT', 'OT'],
					    transi = ['-webkit-', '-moz-', '-ms-', '-o-'];
					var st = void 0,
					    attr = void 0;
					for (attr in styles) {
						elem.style[attr] = styles[attr];
						if (attr == 'transform') for (st in transf) {
							elem.style[transf[st] + 'ransform'] = styles[attr];
						}if (attr == 'transition') for (st in transi) {
							elem.style[transi[st] + 'transition'] = styles[attr].replace('transform', transi[st] + 'transform');
						}
					}
					return elem;
				},

				_doPayment: function _doPayment(url, tokenObj, cfg) {
					var _this2 = this;

					var xhr = _xhrJSON('post', url);
					xhr.onreadystatechange = function () {
						if (xhr.readyState == 4 && xhr.responseText) {
							if (xhr.status == 200) {
								_this2._processPaymentResponse(JSON.parse(xhr.responseText));
							} else {
								_this2._showPaymentRequestError();
							}
						}
					};
					xhr.onerror = this._showPaymentRequestError;
					xhr.send(JSON.stringify(this._buildPayRequestParams(tokenObj, cfg)));
				},

				_buildPayRequestParams: function _buildPayRequestParams(tokenObj, cfg) {
					return {
						token: tokenObj.object.token.id,
						amount: cfg.amount,
						currency: cfg.currency,
						invoice: cfg.invoice,
						description: cfg.description
					};
				},

				_processPaymentResponse: function _processPaymentResponse(obj) {
					console.log(obj);
					alert('payment detail received');
				},

				_showPaymentRequestError: function _showPaymentRequestError(msg) {
					alert(msg || 'There was an error making the payment request');
					this._hideCheckout();
				},

				_makePageHolder: function _makePageHolder(wrapperIdOrBackground) {
					var pageHolder = void 0;
					if (typeof wrapperIdOrBackground == 'boolean') {
						// we're making a popup
						pageHolder = {
							wrapper: this._prepareWrapper(wrapperIdOrBackground),
							iframe: this._prepareIframe(),
							isPopup: true
						};
					} else {
						// page is to be contained inside element with given id
						pageHolder = {
							wrapper: document.getElementById(wrapperIdOrBackground),
							iframe: this._prepareIframe(false),
							isPopup: false
						};
					}
					pageHolder.wrapper.appendChild(pageHolder.iframe);
					return pageHolder;
				}

			});

			function _merge() {
				var objArray = Array.prototype.slice.call(arguments),
				    newObj = objArray[0],
				    objKey = void 0,
				    attr = void 0;
				for (objKey in objArray) {
					if (objKey) for (attr in objArray[objKey]) {
						newObj[attr] = objArray[objKey][attr];
					}
				}
				return newObj;
			}

			return {
				configure: configure,
				QP_CLOSE: QP_CLOSE,
				QP_HIDE: QP_HIDE,
				QP_SHOW: QP_SHOW,
				QP_TOKENIZESTART: QP_TOKENIZESTART,
				QP_TOKENIZEEND: QP_TOKENIZEEND,
				QP_TOKENRECEIVED: QP_TOKENRECEIVED
			};
		}();

		window.Paysbuy.QuickPay = QuickPay;

		// disable any 'quickpay' style blocks from being active in this page
		document.querySelectorAll('style[title=quickpay]').forEach(function (el) {
			return el.disabled = true;
		});
	}

	// -- Code below here checks if the script block we are running from defines a quick pay button ---------

	function _event(name) {
		var detail = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		return new CustomEvent(name, detail);
	}

	// check if this script is being used as a quickpay button generator
	var qpScript = function () {
		var scripts = document.getElementsByTagName('script');
		return scripts[scripts.length - 1];
	}();
	if (qpScript.getAttribute('data-qp-key')) {
		(function () {

			// create a launcher
			var cfg = getQPConfigFromAttribs([].slice.call(qpScript.attributes)),
			    container = qpScript.parentNode,
			    launcher = void 0;
			cfg.container = container;
			launcher = window.Paysbuy.QuickPay.configure(cfg);

			// create quickpay button
			container.appendChild(makeQuickPayButton(launcher, cfg.buttonLabel, qpScript.className));

			// create form fields for received fields(token, name, email, etc.)
			var prefix = cfg.qpFieldPrefix || 'qp-',
			    exts = ['name', 'email', 'phone'],
			    fields = { token: makeTokenField(prefix + 'token') };
			exts.forEach(function (ext) {
				if (cfg['show' + ext[0].toUpperCase() + ext.substr(1)]) fields[ext] = makeTokenField(prefix + ext);;
			});

			// attach return handler to launcher
			launcher._params.onTokenReceived = function (_container, _fields, doSubmit) {
				return function (result) {
					for (var f in _fields) {
						_fields[f].value = result[f];
						_container.appendChild(_fields[f]);
					}
					_fields.token.dispatchEvent(_event(window.Paysbuy.QuickPay.QP_TOKENRECEIVED, { bubbles: !0, cancelable: !0, detail: result }));
					// only do form submission if QuickPay is not handling the full payment process and user has not explicitly said not to
					doSubmit && _fields.token.form.submit();
				};
			}(container, fields, !(cfg.noSubmit || cfg.payUrl));
		})();
	}

	function makeQuickPayButton(launcher, text, className) {
		var btn = document.createElement('button');
		btn.innerHTML = text || 'Pay';
		btn.className = className || '';
		btn.addEventListener('click', function (e) {
			launcher.open();
			e.preventDefault();
			return false;
		});
		return btn;
	}

	function makeTokenField(name) {
		var field = document.createElement('input');
		field.type = 'hidden';
		field.name = name;
		return field;
	}

	// extract quickpay config object from attribute collection (camelcase the key names too)
	function getQPConfigFromAttribs(attrs) {
		var BOOLEAN_PARAMS = ['showEmail', 'showPhone', 'showName', 'noSubmit'],
		    rx = /^data-qp-(.+)/i;
		var cfg = { showName: true },
		    matches = void 0;
		attrs.forEach(function (attr) {
			if (matches = attr.name.match(rx)) cfg[matches[1].replace(/-([a-z0-9])/g, function (m) {
				return m[1].toUpperCase();
			})] = attr.value;
		});
		BOOLEAN_PARAMS.forEach(function (prop) {
			if (cfg.hasOwnProperty(prop)) cfg[prop] = cfg[prop] == 'true' || cfg[prop] == 1 || (typeof cfg[prop] == 'string' && cfg[prop] != 'false' && cfg[prop] != '0' ? cfg[prop] : false);
		});
		return cfg;
	}

	function _xhrJSON(method, url, async) {
		if (async === undefined) async = true;
		var xhr = void 0;
		try {
			xhr = new XMLHttpRequest();
		} catch (e) {
			var XMLHTTP_IDS = ['MSXML2.XMLHTTP.5.0', 'MSXML2.XMLHTTP.4.0', 'MSXML2.XMLHTTP.3.0', 'MSXML2.XMLHTTP', 'Microsoft.XMLHTTP'];
			var success = false;
			for (var i = 0; i < XMLHTTP_IDS.length && !success; i++) {
				try {
					xhr = new ActiveXObject(XMLHTTP_IDS[i]);
					success = true;
				} catch (e) {}
			}
		}
		xhr.open(method, url, async);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('Accept', 'application/json');
		return xhr;
	}
})(window);
