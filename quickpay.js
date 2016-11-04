(function(window, undefined) {

	"use strict";

	// polyfill for CustomEvent (IE)
	!function(){function a(a,b){b=b||{bubbles:!1,cancelable:!1,detail:void 0};var c=document.createEvent("CustomEvent");return c.initCustomEvent(a,b.bubbles,b.cancelable,b.detail),c}return"function"!=typeof window.CustomEvent&&(a.prototype=window.Event.prototype,void(window.CustomEvent=a))}();


	window.Paysbuy = window.Paysbuy || {};

	if (!window.Paysbuy.QuickPay) {

		var QuickPay = (function() {

			var

				DEFAULT_PARAMS = {
					key						: '',
					tokenHandler	: undefined,
					image					: '',
					locale				: 'en-GB',
					submitLabel		: 'Pay {amount}',
					title					: '',
					description		: '',
					amount				: 0,
					currency			: 'THB'
				},

				QPSERVER = 'http://localhost:3000',
				QPPATH = '/dist/quickpay_domain',
				QPPAGE = 'checkout.html',

				QP_CLOSEMESSAGE = 'close',

				ANIM_TIME = 300,

				STYLE_IFRAME = {
					width: '100%',
					height: '100%',
					border: 'none',
					margin: '0',
					opacity: '0',
					transform: 'scale(0.9)',
					transition: ANIM_TIME+'ms opacity ease, transform '+ANIM_TIME+'ms'
				},
				STYLE_WRAPPER = {
					backgroundColor: 'rgba(0,0,0,0.75)',
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
					transition: ANIM_TIME+'ms opacity ease, transform '+ANIM_TIME+'ms'
				}

			;

			function configure(params) {
				return new Launcher(params);
			}


			function Launcher(params) {
				_merge(this, {
					_params: _merge({}, DEFAULT_PARAMS, params),
					_iframe: false,
					_wrapper: false,
					_checkoutWindow: false,
					_container: params.container
				});
				this._prepareCheckout();
			}

			_merge(Launcher.prototype, {

				open: function(params) {
					var _p = _merge({}, this._params, params || {});
					this._sendConfigToCheckout(_p);
					this._resultHandler = _p.onComplete;
					this._active = true;
					this._showCheckout();
				},

				_prepareCheckout: function() {
					if (!this._checkoutWindow) {
						this._wrapper = this._prepareWrapper();
						this._iframe = this._prepareIframe();
						this._checkoutListener = this._makeCheckoutListener(); 
					}
				},

				_sendConfigToCheckout: function(params) {
					try {
						this._checkoutWindow.postMessage(JSON.stringify(params), QPSERVER + QPPATH);
					} catch(e) {}
				},

				_listenToCheckout: function() {
					window.removeEventListener("message", this._checkoutListener);
					window.addEventListener("message", this._checkoutListener, false);
				},

				_makeCheckoutListener: function() {
					return (function(_this){
						return function(ev) {

							if (!_this._active) return false;

							// check message is coming from checkout
							if (!ev.origin || (ev.origin != QPSERVER)) {
								return false;
							}

							// receiving token or being asked to hide?
							if (ev.data == QP_CLOSEMESSAGE) {
								return _this._hideCheckout();
							} else {
								if (_this._resultHandler) _this._resultHandler(JSON.parse(ev.data));
								return _this._hideCheckout();
							}

						};
					})(this);
				},

				_showCheckout: function() {
					this._styleElement(this._wrapper, { visibility: 'visible', opacity: 1 });
					document.body.style.overflow = 'hidden';
					this._styleElement(this._iframe, { transform: 'scale(1)', opacity: 1 });
					this._listenToCheckout();
					(this._container || document).dispatchEvent(_event('qp_show', {bubbles:!0,cancelable:!1,detail:void 0}));
				},

				_hideCheckout: function() {
					setTimeout((function(_this) { return function() {
						_this._wrapper.style.visibility = 'hidden';
					};})(this), ANIM_TIME*1.2);
					document.body.style.overflow = '';
					this._styleElement(this._iframe, { transform: 'scale(0.9)', opacity: 0 });
					this._wrapper.style.opacity = '0';
					this._active = false;
					(this._container || document).dispatchEvent(_event('qp_hide', {bubbles:!0,cancelable:!1,detail:void 0}));
				},

				_prepareWrapper: function() {
					var wrapper = this._createStyledElement('div', STYLE_WRAPPER);
					document.body.appendChild(wrapper);
					return wrapper;
				},

				_prepareIframe: function() {
					var iframe = this._createStyledElement('iframe', STYLE_IFRAME);
					iframe.src = QPSERVER + QPPATH + '/' + QPPAGE;
					// capture the contentWindow object of the frame when it has loaded
					iframe.addEventListener("load", (function(_this) {
						return function(e) { 
							_this._checkoutWindow = e.target.contentWindow;
							_this._sendConfigToCheckout(_this._params);
						};
					})(this));
					this._wrapper.appendChild(iframe);
					return iframe;
				},

				_createStyledElement: function(type, styles) {
					var elem = document.createElement(type);
					return this._styleElement(elem, styles);
				},

				_styleElement: function(elem, styles) {
					var
						transf = ['webkitT', 'MozT', 'msT', 'OT'],
						transi = ['-webkit-', '-moz-', '-ms-', '-o-'],
						st
					;
					for (var attr in styles) {
						elem.style[attr] = styles[attr];
						if (attr=='transform') for (st in transf) elem.style[transf[st]+'ransform'] = styles[attr];
						if (attr=='transition') for (st in transi) elem.style[transi[st]+'transition'] = styles[attr].replace('transform', transi[st]+'transform');
					}
					return elem;
				}


			});

			function _merge() {
				var
					objArray = Array.prototype.slice.call(arguments),
					newObj = objArray[0]
				;
				for (var objKey in objArray) {
					if (objKey) for (var attr in objArray[objKey]) newObj[attr]=objArray[objKey][attr];
				}
				return newObj;
			}

			return {
				configure: configure
			};


		})();

		window.Paysbuy.QuickPay = QuickPay;

	}

	// -- Code below here checks if the script block we are running from defines a quick pay button ---------

	function _event(name, detail) {
		return new CustomEvent(name, detail || {});
	}


	// check if this script is being used as a quickpay button generator
	var qpScript = (function() {
		var scripts = document.getElementsByTagName('script');
		return scripts[scripts.length-1];
	})();
	if (qpScript.getAttribute('data-qp-key')) {

		// create a launcher
		var
			cfg = getQPConfigFromAttribs(qpScript.attributes), 
			container = qpScript.parentNode,
			launcher
		;
		cfg.container = container;
		launcher = window.Paysbuy.QuickPay.configure(cfg);
		
		// create quickpay button
		container.appendChild(makeQuickPayButton(launcher, cfg.buttonLabel, qpScript.className));
		// and the input element to receive the token
		var tokenField = makeTokenField(cfg.tokenFieldName || 'qp-token');
		container.appendChild(tokenField);
		// attach return handler to launcher
		launcher._params.onComplete = (function(_tokenField, _container, doSubmit) {
			return function(result) {
				_tokenField.value = result.token;
				_tokenField.dispatchEvent(_event('qp_token_received', {bubbles:!0,cancelable:!0,detail:{token: result.token}}));
				doSubmit && _tokenField.form.submit();
			};
		})(tokenField, container, !cfg.noSubmit);
	}

	function makeQuickPayButton(launcher, text, className) {
		var btn = document.createElement('button');
		btn.innerHTML = text || 'Pay';
		btn.className = className || '';
		btn.addEventListener('click', (function(_l) {
			return function(e) {
				_l.open();
				e.preventDefault();
				return false;
			};
		})(launcher));
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
		var cfg = {}, rx = /^data-qp-(.+)/i, matches;
		for (var i=0; i<attrs.length; i++) {
			if (matches = attrs[i].name.match(rx)) cfg[matches[1].replace(/-([a-z])/g, function (g){return g[1].toUpperCase();})] = attrs[i].value;
		}
		return cfg;
	}

})(window);