"use strict";

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
