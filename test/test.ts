import { expect } from "chai";
import Metaexpr from "../src/nodes/Metaexpr";
import ObjectFun from "../src/nodes/ObjectFun";
import Program from "../src/Program";
var pegjs = require('pegjs');
var fs = require('fs');
var path = require('path');

var grammar = fs.readFileSync(path.join(__dirname, '../src/grammar.pegjs'), 'utf-8');
var parser = pegjs.generate(grammar, {cache: true});
var evalParser = pegjs.generate(grammar, {cache: true, allowedStartRules: ['evaluable']});

describe('Program', function () {
	var program = new Program(parser);

	[
		'propositional', 'predicate', 'set',
		'relation', 'function', 'natural',
		'abstract_algebra'
	].forEach(name => {
		it(`can load ${name}.math`, async function () {
			await program.loadModule(name, (filename: string) => {
				return fs.readFileSync(path.join(__dirname, '../math/' + filename + '.math'), 'utf-8');
			});
		});
	});
});

describe('ObjectFun', function () {
	it('should throw if !type && !expr', function () {
		expect(() => new ObjectFun({annotations: [], sealed: false, params: [], type: null, expr: null})).to.throw();
	});
});

describe('Issue #52', function () {
	it('(f(x))(y) == (f(x))(y)', async function () {
		var program = new Program(parser);

		await program.loadModule('duh', (_filename: string) => `
type cls;

[cls -> [cls -> cls]] f;
cls x;
cls y;
`);
		var foo = program.evaluate(evalParser.parse(`(f(x))(y)`)) as Metaexpr,
			baz = program.evaluate(evalParser.parse(`(f(x))(y)`)) as Metaexpr;
		
		expect(foo.equals(baz)).to.be.true;
	});
});

describe('Sealed macro', function () {
	it('N(p) != (sealed p => N(p))', async function () {
		var program = new Program(parser);
		
		await program.loadModule('duh', (_filename: string) => `
type st;

st p;

st N(st p);

sealed st N2(st p) {
	N(p)
}
`);
		var foo = program.evaluate(evalParser.parse(`N(p)`)) as Metaexpr,
			baz = program.evaluate(evalParser.parse(`N2(p)`)) as Metaexpr;
		
		expect(foo.equals(baz)).to.be.false;
	});
});