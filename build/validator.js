"use strict:;"

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
