(function(window, undefined) {

	"use strict";

	// polyfill for CustomEvent (IE)
	!function(){function a(a,b){b=b||{bubbles:!1,cancelable:!1,detail:void 0};var c=document.createEvent("CustomEvent");return c.initCustomEvent(a,b.bubbles,b.cancelable,b.detail),c}return"function"!=typeof window.CustomEvent&&(a.prototype=window.Event.prototype,void(window.CustomEvent=a))}();


	var QuickPay = (function() {

		var

			_defaults = {
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

			_QPSERVER = 'http://localhost:3000',
			_QPPATH = '',
			_QPPAGE = 'checkout.html',

			_QP_CLOSEMESSAGE = 'close'

		;

		function configure(params) {
			return new Launcher(params);
		}


		function Launcher(params) {
			_merge(this, {
				_params: _merge({}, _defaults, params),
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
					this._checkoutWindow.postMessage(JSON.stringify(params), _QPSERVER + _QPPATH);
				} catch(e) {

				}
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
						if (!ev.origin || (ev.origin != _QPSERVER)) {
							return false;
						}

						// receiving token or being asked to hide?
						if (ev.data == _QP_CLOSEMESSAGE) {
							return _this._hideCheckout();
						} else {
							if (_this._resultHandler) _this._resultHandler(JSON.parse(ev.data));
							return _this._hideCheckout();
						}

					};
				})(this);
			},

			_showCheckout: function() {
				this._wrapper.style.opacity = '1';
				this._wrapper.style.visibility = 'visible';
				document.body.style.overflow = 'hidden';
				var transf = ['t', 'webkitT', 'MozT', 'msT', 'OT'];
				for (var st in transf) this._iframe.style[transf[st]+'ransform'] = 'scale(1)'; 
				this._iframe.style.opacity = '1';
				this._listenToCheckout();
				(this._container || document).dispatchEvent(_event('qp_show', {bubbles:!0,cancelable:!1,detail:void 0}));
			},

			_hideCheckout: function() {
				setTimeout((function(_this) { return function() {
					_this._wrapper.style.visibility = 'hidden';
				};})(this), 300);
				document.body.style.overflow = '';
				var transf = ['t', 'webkitT', 'MozT', 'msT', 'OT'];
				for (var st in transf) this._iframe.style[transf[st]+'ransform'] = 'scale(0.9)'; 
				this._iframe.style.opacity = '0';
				this._wrapper.style.opacity = '0';
				this._active = false;
				(this._container || document).dispatchEvent(_event('qp_hide', {bubbles:!0,cancelable:!1,detail:void 0}));
			},

			_prepareWrapper: function() {
				var wrapper = this._createStyledElement('div', {
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
					height: '100%'
				});
				var transi = ['', '-webkit-', '-moz-', '-ms-', '-o-'];
				for (var st in transi) wrapper.style.setProperty(transi[st]+'transition', '300ms opacity ease, '+transi[st]+'transform 300ms');
				document.body.appendChild(wrapper);
				return wrapper;
			},

			_prepareIframe: function() {
				var styles = {}, st, iframe;
				var transf = ['t', 'webkitT', 'MozT', 'msT', 'OT'];
				for (st in transf) styles[transf[st]+'ransform'] = 'scale(0.9)'; 
				_merge(styles, {
					width: '100%',
					height: '100%',
					border: 'none',
					margin: '0',
					opacity: '0'
				});
				iframe = this._createStyledElement('iframe', styles);
				var transi = ['', '-webkit-', '-moz-', '-ms-', '-o-'];
				for (st in transi) iframe.style.setProperty(transi[st]+'transition', '300ms opacity ease, '+transi[st]+'transform 300ms');
				iframe.src = _QPSERVER + _QPPATH + '/' + _QPPAGE;
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
				for (var attr in styles) elem.style[attr] = styles[attr];
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


	// -------------------------------------------------------------

	window.Paysbuy = window.Paysbuy || {};
	window.Paysbuy.QuickPay = QuickPay;

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
		launcher = QuickPay.configure(cfg);
		
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