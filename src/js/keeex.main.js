/*
Copyright (c) 2016 KeeeX SAS 

This is an open source project available under the MIT license.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

*/

var kxapi = require("keeex-api");
var async = require("async");
var Encoder = require("node-html-encoder").Encoder;
var encoder = new Encoder('entity');


var systran = require("./systran.js");
var targetLang = "fr";

var gTopic = null, gComments = null;
var updatingView = false;

var targetLists = [];

var defined = {
	"en": "anglais",
	"fr": "français",
	"es": "espagnol",
	"it": "italien",
	"pt": "portugais",
	"ar": "arabe",
	"bn": "bengali",
	"da": "danois",
	"de": "allemand",
	"el": "grec",
	"hi": "hindi",
	"ja": "japonais",
	"ko": "coréen",
	"nl": "néerlandais",
	"no": "norvégien",
	"pl": "polonais",
	"ru": "russe",
	"sk": "slovaque",
	"sv": "suédois",
	"th": "thaï",
	"tr": "turc",
	"vi": "vietnamien",
	"zh": "chinois",
	"zt": "zt" 
};

$(document).ready(function() {

	kxapi.getToken('Systran', function(err, resp){
		if(err) {
			if(err.message == "400 PermissionDenied"){
				// Access denied by the user
				alert("Error. Access to local API was denied...");
			}
			else {
				// Something else went wrong
				alert("Can't connect to the local API.");
			}
		}

		systran.getLanguagePairs(function(error, data) {
			if (!error && data) {
				for (var i in data.languagePairs) {
					if (targetLists.indexOf(data.languagePairs[i].target) < 0) {
						targetLists.push(data.languagePairs[i].target);
						$("#selLang").append($("<option>", {
								value: data.languagePairs[i].target, 
								text: data.languagePairs[i].target + " - " + defined[data.languagePairs[i].target]
							})
						);
					}
				}
				console.log(targetLists);

				$("#selLang option").filter(function() {
				  return $(this).val() === targetLang; 
				}).prop('selected', true);
			}
		});

		$("#selLang").change(function() {
			targetLang = $(this).val();
			if (gTopic) {
				updateView(gTopic, gComments, true, function(error) {
					console.log(error);
				});
			}
		});

		async.forever(refreshView, function(error) {
			console.log(error);
		});
	});
});

function refreshView(next) {
	async.waterfall([
		function(callback) {
			kxapi.currentView(callback);
		},
		function(topic, callback) {
			async.parallel({
				topic: function(callback) {
					kxapi.getTopics([topic.idx], function(error, topics) {
						if (error || !topics || !topics.length)
							return callback(error || new Error("MissingTopic"));
						callback(null, topics[0]);
					});
				},
				comments: function(callback) {
					kxapi.getComments(topic.idx, callback);
				}
			}, function(error, res) {
				if (!error && res) {
					updateView(res.topic, res.comments, false, callback);
				} else
					callback(error);
			});
		}
	], function(error) {
		setTimeout(next, 2000, null);
	});
}

function updateView(topic, comments, force, callback) {
	if (!force) {
		if (updatingView)
			return callback(new Error("Updating view"));

		if (!topic)
			return callback(new Error("NoTopic"));

		if (gTopic && gTopic.idx === topic.idx)
			if (gComments && comments && gComments.length === comments.length)
				return callback(null);

		if (comments) comments.reverse();
	}
	
	updatingView = true;

	async.series([
		function(callback) {
			if (!force && gTopic && gTopic.idx === topic.idx) {
				callback(null);
			} else {
				var name = encoder.htmlDecode(topic.name);
				var desc = encoder.htmlDecode(topic.description);
				var text = [];
				if (name && name.length) text.push(name);
				if (desc && desc.length) {
					desc = desc.replace(/<br>/g, "\n");
					text.push(desc);
				}

				if (!text.length)
					callback(null);
				else {
					systran.translate("auto", targetLang, text, function(error, ttext) {

						if (error) {
							$("#name").text(name);
							$("#description").text(desc);
						} else {
							$("#name, #description").text("").removeClass("error").removeAttr("lang");
							if (name && name.length) 
								updateText($("#name"), name, ttext[0]);
							if (desc && desc.length)
								updateText($("#description"), desc, ttext[1]);
						}
						callback(null);
					});
				}
			}
		},
		function(callback) {
			var tmp = null;
			if (!force && gTopic && gTopic.idx === topic.idx) {
				var begin = (gComments ? gComments.length : 0);
				tmp = (comments ? comments.slice(begin) : []);
			} else {
				$("#comments").empty();
				tmp	= comments;
			}
			if (!tmp || !tmp.length)
				callback(null);
			else {
				var text = tmp.map(function(obj) { return encoder.htmlDecode(obj.name); });
				systran.translate("auto", targetLang, text, function(error, ttext) {
					for (var i = 0; i < text.length; i++) {
						var $cmt = $("<div>").addClass("comment").appendTo($("#comments"));
						if (error)
							$cmt.text(text[i]);
						else
							updateText($cmt, text[i], ttext[i]);
					}
					callback(null);
				});
			}
		}
	], function(error) {
		gTopic = topic;
		gComments = comments;

		updatingView = false;
		callback(error);
	});
}

function updateText($container, text, ttext) {
	if (!$container || !text || !ttext)
		return false;

	if (ttext.output) {
		$container.attr("lang", ttext.detectedLanguage)
			.text(ttext.output);
	} else {
		$container.text(text);
		if (ttext.error) {
			var tmp = ttext.error.details.match(/translate_(\w+)_\w+/i);
			if (tmp) {
				$container.attr("lang", tmp[1]);
				if (tmp[1] !== targetLang)
					$container.addClass("error");
			}
		}
	}
}