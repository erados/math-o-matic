import $Variable from './nodes/$Variable';
import Fun from './nodes/Fun';
import Metaexpr from './nodes/Metaexpr';
import ObjectType from './nodes/ObjectType';
import Variable from './nodes/Variable';
import StackTrace from './StackTrace';

export type NestedTypeInput = string | NestedTypeInput[];

export default class Scope {
	public readonly importMap: Map<string, Scope> = new Map();

	public readonly typedefMap: Map<string, ObjectType> = new Map();
	public readonly defMap: Map<string, Variable | Fun> = new Map();
	public readonly schemaMap: Map<string, Fun> = new Map();
	public readonly $Map: Map<string, $Variable> = new Map();
	public readonly hypotheses: Metaexpr[] = [];

	public readonly parent: Scope;
	public readonly root: Scope;

	public readonly trace: StackTrace;
	public baseType: ObjectType;

	constructor (parent: Scope, trace?: StackTrace) {
		this.parent = parent;
		this.root = parent ? parent.root : this;

		if (trace && !(trace instanceof StackTrace)) {
			throw Error('Assertion failed');
		}

		this.trace = trace || new StackTrace();

		this.baseType = parent ? parent.baseType : null;
	}

	public extend(type, name, location): Scope {
		var child = new Scope(this, this.trace.extend(type, name, location));
		this.hypotheses.forEach(h => child.hypotheses.push(h));
		return child;
	}

	public error(message: string): Error {
		return this.trace.error(message);
	}

	/*
	 * Possible input values:
	 * 'st'						-> st
	 * ['cls', 'st']			-> [cls -> st]
	 * ['cls', 'cls', 'st']		-> [(cls, cls) -> st]
	 * [['cls', 'st'], 'st']	-> [[cls -> st] -> st]
	 */
	public hasOwnType(name: NestedTypeInput): boolean {
		if (typeof name == 'string') {
			return this.typedefMap.has(name)
				|| [...this.importMap.values()].some(s => s.hasOwnType(name));
		}

		if (!(name instanceof Array))
			throw this.error('Argument is malformed');

		if (name.length < 2)
			throw this.error('Illegal array length');

		return name.map(e => {
			return this.hasOwnType(e);
		}).every(e => e);
	}

	/*
	 * Possible input values:
	 * 'st'						-> st
	 * ['cls', 'st']			-> [cls -> st]
	 * ['cls', 'cls', 'st']		-> [(cls, cls) -> st]
	 * [['cls', 'st'], 'st']	-> [[cls -> st] -> st]
	 */
	public hasType(name: NestedTypeInput): boolean {
		if (typeof name == 'string') {
			return this.hasOwnType(name)
				|| (!!this.parent && this.parent.hasType(name));
		}

		if (!(name instanceof Array))
			throw this.error('Argument is malformed');

		if (name.length < 2)
			throw this.error('Illegal array length');

		return name.map(e => {
			return this.hasType(e);
		}).every(e => e);
	}

	public addType(type: ObjectType): ObjectType {
		if (!(type instanceof ObjectType))
			throw this.error('Illegal argument type');

		if (!type.name)
			throw this.error('Something\'s wrong');

		if (this.hasOwnType(type.name))
			throw this.error(`Type ${type.name} has already been declared`);

		if (type.isBaseType) {
			if (this.baseType) {
				throw this.error('A base type already exists');
			}

			(function broadcast(scope: Scope) {
				scope.baseType = type;
				if (scope.parent) broadcast(scope.parent);
			})(this);
		}

		this.typedefMap.set(type.name, type);
		return type;
	}

	/*
	 * Possible input values:
	 * 'st'						-> st
	 * ['cls', 'st']			-> [cls -> st]
	 * ['cls', 'cls', 'st']		-> [(cls, cls) -> st]
	 * [['cls', 'st'], 'st']	-> [[cls -> st] -> st]
	 */
	public getType(name: NestedTypeInput): ObjectType {
		if (typeof name == 'string') {
			if (!this.hasType(name))
				throw this.error(`Type ${name} is not defined`);

			return this.typedefMap.has(name)
				? this.typedefMap.get(name)
				: (!!this.parent && this.parent.getType(name))
					|| [...this.importMap.values()].filter(s => {
						return s.hasType(name)
					})[0].getType(name);
		}

		if (!(name instanceof Array))
			throw this.error('Argument is malformed');

		if (name.length < 2)
			throw this.error('Illegal array length');

		var from = name.slice(0, name.length - 1).map(e => {
			return this.getType(e);
		});

		var to = this.getType(name[name.length - 1]);

		return new ObjectType({
			functional: true,
			from,
			to
		});
	}

	public hasOwnVariable(name: string): boolean {
		return this.defMap.has(name)
			|| [...this.importMap.values()].some(s => s.hasOwnVariable(name));
	}

	public hasVariable(name: string): boolean {
		return this.hasOwnVariable(name)
			|| (!!this.parent && this.parent.hasVariable(name));
	}

	public addVariable(variable: Variable | Fun): Variable | Fun {
		if (!(variable instanceof Variable))
			throw this.error('Illegal argument type');

		if (this.hasOwnVariable(variable.name))
			throw this.error(`Definition ${variable.name} has already been declared`);

		this.defMap.set(variable.name, variable);
		return variable;
	}

	public addFun(fun: Fun): Fun {
		if (!(fun instanceof Fun))
			throw this.error('Illegal argument type');

		if (!fun.name)
			throw this.error('Cannot add anonymous fun to scope');

		if (this.hasOwnVariable(fun.name))
			throw this.error(`Definition ${fun.name} has already been declared`);

		this.defMap.set(fun.name, fun);
		return fun;
	}

	public getVariable(name: string): Variable | Fun {
		if (!this.hasVariable(name))
			throw this.error(`Definition ${name} is not defined`);

		return this.defMap.has(name)
			? this.defMap.get(name)
			: (!!this.parent && this.parent.getVariable(name))
				|| [...this.importMap.values()].filter(s => {
					return s.hasVariable(name)
				})[0].getVariable(name);
	}

	public hasOwnSchema(name: string): boolean {
		return this.schemaMap.has(name) || this.defMap.has(name)
			|| [...this.importMap.values()].some(s => s.hasOwnSchema(name));
	}

	public hasSchema(name: string): boolean {
		return this.hasOwnSchema(name)
			|| (!!this.parent && this.parent.hasSchema(name));
	}

	public addSchema(schema: Fun): Fun {
		if (!(schema instanceof Fun))
			throw this.error('Illegal argument type');

		if (this.hasOwnSchema(schema.name))
			throw this.error(`Schema ${schema.name} has already been declared`);

		this.schemaMap.set(schema.name, schema);
		return schema;
	}

	public getSchema(name: string): Variable | Fun {
		if (!this.hasSchema(name))
			throw this.error(`Schema ${name} is not defined`);

		return this.schemaMap.has(name)
			? this.schemaMap.get(name)
			: this.defMap.has(name)
				? this.defMap.get(name)
				: (!!this.parent && this.parent.getSchema(name))
					|| [...this.importMap.values()].filter(s => {
						return s.hasSchema(name)
					})[0].getSchema(name);
	}

	public hasOwn$(name: string): boolean {
		return this.$Map.has(name)
			|| [...this.importMap.values()].some(s => s.hasOwn$(name));
	}

	public has$(name: string): boolean {
		return this.hasOwn$(name)
			|| (!!this.parent && this.parent.has$(name));
	}

	public add$($: $Variable): $Variable {
		if (!($ instanceof $Variable))
			throw this.error('Illegal argument type');

		if (this.hasOwn$($.name))
			throw this.error(`$ variable ${$.name} has already been declared`);

		this.$Map.set($.name, $);
		return $;
	}

	public get$(name: string): $Variable {
		if (!this.has$(name))
			throw this.error(`$ variable ${name} is not defined`);

		return this.$Map.has(name)
			? this.$Map.get(name)
			: (!!this.parent && this.parent.get$(name))
				|| [...this.importMap.values()].filter(s => {
					return s.has$(name)
				})[0].get$(name);
	}
}