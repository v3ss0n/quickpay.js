(function(window, undefined) {

	"use strict";

	var QuickPay = (function() {

		var
			_defaults = {
				key						: '',
				tokenHandler	: undefined,
				image					: '',
				locale				: 'en-GB',
				submitLabel		: '',
				title					: '',
				description		: '',
				amount				: 0,
				currency			: 'THB'
			},
			_qpServer = 'http://localhost:3000',
			_qpPath = '',
			_qpPage = 'checkout.html'
		;

		function configure(params) {
			return new Launcher(params);
		}


		function Launcher(params) {
			this._params = _merge([{}, _defaults, params]);
			this._iframe = false;
			this._wrapper = false;
			this._checkoutWindow = false;
			this._prepareCheckout();
		}

		_merge([Launcher.prototype, {

			open: function(params) {
				var _p = _merge([{}, this._params, params || {}]);
				//this._prepareCheckout();
				// TODO ** - send setup data to checkout here first
				this._showCheckout();
			},

			_prepareCheckout: function() {
				if (!this._checkoutWindow) {
					this._wrapper = this._prepareWrapper();
					this._iframe = this._prepareIframe();
				}
			},

			_showCheckout: function() {
				this._wrapper.style.opacity = '1';
				this._wrapper.style.visibility = 'visible';
				document.body.style.overflow = 'hidden';
				var transf = ['t', 'webkitT', 'MozT', 'msT', 'OT'];
				for (var st in transf) this._iframe.style[transf[st]+'ransform'] = 'scale(1)'; 
				this._iframe.style.opacity = '1';
			},

			_hideCheckout: function() {
				setTimeout((function(_this) { return function() {
					_this._wrapper.style.visibility = 'hidden';
				};})(this), 300);
				document.body.style.overflow = '';
				var transf = ['t', 'webkitT', 'MozT', 'msT', 'OT'];
				for (var st in transf) this._iframe.style[transf[st]+'ransform'] = 'scale(0.85)'; 
				this._iframe.style.opacity = '0';
				this._wrapper.style.opacity = '0';
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
				for (var st in transi) wrapper.style.setProperty(transi[st]+'transition', '200ms opacity ease, '+transi[st]+'transform 200ms');
				document.body.appendChild(wrapper);
				return wrapper;
			},

			_prepareIframe: function() {
				var styles = {}, st, iframe;
				var transf = ['t', 'webkitT', 'MozT', 'msT', 'OT'];
				for (st in transf) styles[transf[st]+'ransform'] = 'scale(0.85)'; 
				_merge([styles, {
					width: '100%',
					height: '100%',
					border: 'none',
					margin: '0',
					opacity: '0'
				}]);
				iframe = this._createStyledElement('iframe', styles);
				var transi = ['', '-webkit-', '-moz-', '-ms-', '-o-'];
				for (st in transi) iframe.style.setProperty(transi[st]+'transition', '200ms opacity ease, '+transi[st]+'transform 200ms');
				iframe.src = _qpServer + _qpPath + '/' + _qpPage;
				// capture the contentWindow object of the frame when it has loaded
				iframe.addEventListener("load", (function(_this) {
					return function(e) { return _this._checkoutWindow = e.target.contentWindow; }
				})(this));
				this._wrapper.appendChild(iframe);
				return iframe;
			},

			_createStyledElement: function(type, styles) {
				var elem = document.createElement(type);
				for (var attr in styles) elem.style[attr] = styles[attr];
				return elem;
			}

		}]);

		function _merge(objArray) {
			var newObj = objArray[0];
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

})(window);