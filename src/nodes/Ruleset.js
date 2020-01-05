var Node = require('./Node');
var Type = require('./Type');
var Typevar = require('./Typevar');
var Fun = require('./Fun');
var Funcall = require('./Funcall');
var Rule = require('./Rule');
var Yield = require('./Yield');
var Rulecall = require('./Rulecall');

var Translator = require('../Translator');

function Ruleset({name, native, doc}) {
	Node.call(this);

	this.doc = doc;

	if (typeof name != 'string')
		throw Error(`Assertion failed`);

	if (!native)
		throw Error(`Assertion failed`);
	
	this.name = name;
	this.native = native || false;
}

Ruleset.prototype = Object.create(Node.prototype);
Ruleset.prototype.constructor = Ruleset;
Ruleset.prototype._type = 'ruleset';

Ruleset.prototype.toString = function () {
	return this.toIndentedString(0);
}

Ruleset.prototype.toIndentedString = function (indent) {
	return `RS ${this.name}`
		+ (this.native ? ' <native>' : ' <error>');
}

Ruleset.prototype.toTeXString = function (root) {
	return `\\href{#ruleset-${this.name}}{\\mathsf{${this.escapeTeX(this.name)}}}`
		+ (this.native ? '\\ (\\textrm{native})' : '\\ (\\textit{error})');
}

module.exports = Ruleset;