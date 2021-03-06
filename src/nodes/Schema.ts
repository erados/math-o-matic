import Fun from "./Fun";

export type SchemaType = 'axiom' | 'theorem' | 'schema';

export default class Schema extends Fun {

	public readonly schemaType: SchemaType;
	public readonly using: ObjectFun[];
	public readonly def$s: $Variable[];
	public readonly context: ExecutionContext;
	private isProvedCache: boolean;

	constructor ({doc, tex, annotations, schemaType, name, params, context, def$s, expr}: SchemaArgumentType, trace: StackTrace) {
		if (!expr) {
			throw Node.error('wut', trace);
		}

		if (schemaType != 'schema' && !name) {
			throw Node.error(`wut`, trace);
		}

		super({doc, tex, annotations, sealed: false, rettype: null, name, params, expr}, trace);
		
		this.schemaType = schemaType;
		this.def$s = def$s || [];
		this.context = context;

		if (schemaType == 'theorem') {
			if (!this.isProved()) {
				throw Node.error(`Schema ${name} is marked as a theorem but it is not proved`, trace);
			}
		}
	}
	
	public isProved(hyps?) {
		if (this.isProvedCache) return true;

		if (!hyps && typeof this.isProvedCache == 'boolean') {
			return this.isProvedCache;
		}

		var cache = !hyps || !hyps.length;
		hyps = hyps || [];
		
		var ret = this.schemaType == 'axiom' || super.isProved(hyps);
		if (cache) this.isProvedCache = ret;
		return ret;
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		if (!this.expr) return this;

		// 이름이 있는 것은 스코프 밖에서 보이지 않으므로 치환될 것을
		// 갖지 않는다는 생각이 들어 있다.
		if (this.name) return this;

		// 위의 this.name 조건을 지우면 특수한 경우에 이게 발생할지도 모른다.
		if (this.params.some(e => map.has(e)))
			throw Error('Parameter collision');

		return new Schema({
			doc: null,
			tex: null,
			annotations: this.annotations,
			schemaType: 'schema',
			name: null,
			params: this.params,
			context: this.context,
			def$s: this.def$s,
			expr: this.expr.substitute(map)
		}, this.trace);
	}

	protected expandMetaInternal(andFuncalls: boolean): Metaexpr {
		if (!this.expr) return this;
		if (this.type instanceof ObjectType && this.name) return this;

		return new Schema({
			doc: null,
			tex: null,
			annotations: this.annotations,
			schemaType: 'schema',
			name: null,
			params: this.params,
			context: this.context,
			def$s: this.def$s,
			expr: this.expr.expandMeta(andFuncalls)
		}, this.trace);
	}

	public isCallable(_context: ExecutionContext): boolean {
		return true;
	}

	public toIndentedString(indent: number, root?: boolean): string {
		return [
			`∫ ${this.name || ''}(${this.params.map(p => p.toIndentedString(indent)).join(', ')}) => {`,
			'\t' + this.expr.expandMeta(true).toIndentedString(indent + 1),
			'}'
		].join('\n' + '\t'.repeat(indent));
	}
	
	public toTeXString(prec?: Precedence, root?: boolean): string {
		if (!this.name) {
			this.precedence = Node.PREC_FUNEXPR;
			return [
				(this.shouldConsolidate(prec) ? '\\left(' : ''),

				(
					this.params.length == 1
					? this.params[0].toTeXString(false)
					: `\\left(${this.params.map(e => e.toTeXString(Node.PREC_COMMA)).join(', ')}\\right)`
				),
				'\\mapsto ',
				this.expr.expandMeta(true).toTeXString(false),

				(this.shouldConsolidate(prec) ? '\\right)' : '')
			].join('');
		}
		
		var id = `schema-${this.isProved() ? 'p' : 'np'}-${this.name}`;
	
		if (!root)
			return `\\href{#${id}}\\mathsf{${Node.escapeTeX(this.name)}}`;
	
		return `\\href{#${id}}{\\mathsf{${Node.escapeTeX(this.name)}}}\\mathord{\\left(${this.params.map(e => e.toTeXStringWithId(Node.PREC_COMMA) + (e.selector ? `: \\texttt{@${e.selector}}` : '')).join(', ')}\\right)}:\\\\\\quad`
				+ this.expr.expandMeta(true).toTeXString(true);
	}
}

import $Variable from "./$Variable";
import Expr0 from "./Expr0";
import Metaexpr from "./Metaexpr";
import Node, { Precedence } from "./Node";
import ObjectType from "./ObjectType";
import Variable from "./Variable";
import ObjectFun from "./ObjectFun";
import StackTrace from "../StackTrace";
import ExecutionContext from "../ExecutionContext";
import Parameter from "./Parameter";

interface SchemaArgumentType {
	doc: string;
	tex: string;
	annotations: string[];
	schemaType: SchemaType;
	name: string;
	params: Parameter[];
	context: ExecutionContext;
	def$s: $Variable[];
	expr: Metaexpr;
}