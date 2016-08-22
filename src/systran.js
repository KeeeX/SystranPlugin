var request = require("request");

var myKey = "HERE GOES YOUR API KEY";
var apiServer = "AND THERE THE SERVER TO USE IT";
var uri = {
	supportedLanguages : apiServer + "/translation/supportedLanguages?key=" + myKey,
	translate : apiServer + "/translation/text/translate?key=" + myKey,
	nlp : apiServer + "/nlp/ner/extract/annotations?key=" + myKey,
	detectLanguage : apiServer + "/nlp/lid/detectLanguage/document?key=" + myKey
};

function getLanguagePairs(callback) {
	request({
	  method: 'GET',
	  uri: uri.supportedLanguages,
	  json: true
	},
	function (error, response, body) {
		if (error)
			return callback(error);

	  callback(null, body);
	});
}

function translate(source, target, text, callback) {
	request({
	  method: 'GET',
	  uri: uri.translate,
	  json: {
	  	source: source,
	    target: target,
	    input: text
	  }
	},
	function (error, response, body) {
		if (error)
			return callback(error);

	  callback(null, body.outputs);
	});
}

function nlp(source, content, callback) {
	request({
	  method: 'GET',
	  uri: uri.nlp + "&lang=" + source,
	  json: {
	    input: content
	  }
	},
	function (error, response, body) {
	  callback(error, body);
	});
}

function getLanguage(content, callback) {
	request({
	  method: 'GET',
	  uri: uri.detectLanguage,
	  json: {
	    input: content
	  }
	},
	function (error, response, body) {
		if (error)
			return callback(error);
		if (!body || !body.detectedLanguages || !body.detectedLanguages.length)
			return callback(new Error("CantDectectLanguage"));

		var lang = body.detectedLanguages[0];
		for (var i = 1; i < body.detectedLanguages.length; i++)
			if (body.detectedLanguages[i].confidence > lang.confidence)
				lang = body.detectedLanguages[i];

		callback(null, lang.lang);
	});
}

module.exports = {
	getLanguagePairs: getLanguagePairs,
	translate: translate,
	nlp: nlp,
	getLanguage: getLanguage
};


