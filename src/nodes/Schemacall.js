var Node = require('./Node');
var Typevar = require('./Typevar');

var ExpressionResolver = require('../ExpressionResolver');

function Schemacall({schema, args}) {
	Node.call(this);

	if (!schema) {
		throw Error('Assertion failed');
	}

	if (!(args instanceof Array))
		throw Error('Assertion failed');
	
	this.schema = schema;
	this.args = args;

	var paramTypes = schema.type.from,
		argTypes = args.map(e => e.type);

	if (paramTypes.length != argTypes.length)
		throw Error('Assertion failed');

	for (var i = 0; i < paramTypes.length; i++) {
		if (!paramTypes[i].equals(argTypes[i]))
			throw Error('Assertion failed');
	}

	this.type = schema.type.to;

	this.expanded = ExpressionResolver.expandMetaAndFuncalls(this);
}

Schemacall.prototype = Object.create(Node.prototype);
Schemacall.prototype.constructor = Schemacall;
Schemacall.prototype._type = 'schemacall';

Schemacall.prototype.toString = function () {
	return this.toIndentedString(0);
};

Schemacall.prototype.toIndentedString = function (indent) {
	var args = this.args.map(arg => {
		if (arg instanceof Typevar) return arg.name;
		return arg.toIndentedString(indent + 1);
	});

	if (args.join('').length <= 50) {
		args = this.args.map(arg => {
			if (arg instanceof Typevar) return arg.name;
			return arg.toIndentedString(indent);
		});

		args = args.join(', ');

		return [
			`${this.schema.name}(`,
			args,
			')'
		].join('');
	}
	else {
		args = args.join(',\n' + '\t'.repeat(indent + 1));

		return [
			`${this.schema.name}(`,
			'\t' + args,
			')'
		].join('\n' + '\t'.repeat(indent));
	}
};

Schemacall.prototype.toTeXString = function (root) {
	return (
		this.schema.name
			? `\\href{#schema-${this.schema.name}}{\\textsf{${this.escapeTeX(this.schema.name)}}}`
			: this.schema.toTeXString()
	) + `(${this.args.map(e => e.toTeXString()).join(', ')})`;
};

module.exports = Schemacall;