import Scope from '../Scope';
import $Variable from './$Variable';
import Expr0 from './Expr0';
import Fun from './Fun';
import Metaexpr, { EqualsPriority } from './Metaexpr';
import MetaType from './MetaType';
import { isNameable } from './Nameable';
import Node, { Precedence } from './Node';
import ObjectFun from './ObjectFun';
import ObjectType from './ObjectType';
import Schema from './Schema';
import Variable from './Variable';

interface FuncallArgumentType {
	fun: Metaexpr;
	unseal: boolean;
	args: Expr0[];
}

export default class Funcall extends Expr0 {
	
	public readonly fun: Metaexpr;
	public readonly unseal: boolean;
	public readonly args: Expr0[];

	constructor ({fun, unseal, args}: FuncallArgumentType, scope?: Scope) {
		if (fun.type.isSimple) {
			var name = isNameable(fun) ? fun.name : '<anonymous>';
			throw Node.error(`${name} is not callable`, scope);
		}

		if (!(args instanceof Array) || args.map(e => e instanceof Node).some(e => !e))
			throw Node.error('Assertion failed', scope);
			 
		var resolvedType = fun.type.resolve() as ObjectType | MetaType,
			paramTypes = resolvedType.from,
			argTypes = args.map(e => e.type);

		if (paramTypes.length != argTypes.length)
			throw Node.error(`Invalid number of arguments (expected ${paramTypes.length}): ${argTypes.length}`, scope);

		for (var i = 0; i < paramTypes.length; i++) {
			if (!paramTypes[i].equals(argTypes[i])) {
				throw Node.error(`Argument #${i + 1} has illegal argument type (expected ${paramTypes[i]}): ${argTypes[i]}`, scope);
			}
		}

		super(scope, null, null, resolvedType.to);
		
		this.fun = fun;
		this.unseal = unseal;
		this.args = args;
	}

	public isProved(hyps?) {
		hyps = hyps || [];
	
		return super.isProved(hyps) || this.fun.isProved(hyps);
	}

	public substitute(map: Map<Variable, Expr0>): Metaexpr {
		return new Funcall({
			fun: this.fun.substitute(map),
			unseal: this.unseal,
			args: this.args.map(arg => arg.substitute(map))
		});
	}

	public expandMeta(andFuncalls: boolean): Metaexpr {
		var fun = this.fun.expandMeta(andFuncalls),
			unseal = this.unseal,
			args = this.args.map(arg => arg.expandMeta(andFuncalls));
		
		if (!(fun instanceof Fun) || !fun.expr || fun.name && !(fun instanceof Schema))
			return new Funcall({fun, unseal, args});

		return fun.call(args).expandMeta(andFuncalls);
	}

	public isExpandable(): boolean {
		var callee: Metaexpr = this.fun;

		while (callee instanceof $Variable) {
			callee = callee.expr;
		}

		if (callee instanceof Funcall) {
			return callee.isExpandable();
		}

		if (!(callee instanceof Fun)) return false;

		return callee.expr && !(callee.sealed && !this.unseal);
	}
	
	public expandOnce(): Metaexpr {
		if (!this.isExpandable()) {
			throw Error('Cannot expand');
		}

		var callee: Metaexpr = this.fun;

		while (callee instanceof $Variable) {
			callee = callee.expr;
		}

		if (callee instanceof Funcall) {
			return new Funcall({
				fun: callee.expandOnce(),
				unseal: this.unseal,
				args: this.args
			});
		}

		if (!(callee instanceof Fun)) {
			throw Error('Something\'s wrong');
		}

		return callee.call(this.args);
	}

	protected getEqualsPriority(): EqualsPriority {
		return EqualsPriority.THREE;
	}

	protected equalsInternal(obj: Metaexpr): boolean {
		if (!(obj instanceof Funcall)) {
			if (!this.isExpandable()) return false;

			return this.expandOnce().equals(obj);
		}

		if (this.fun instanceof Funcall && this.fun.isExpandable()) {
			return this.expandOnce().equals(obj);
		}

		if (obj.fun instanceof Funcall && obj.fun.isExpandable()) {
			return this.equals(obj.expandOnce());
		}

		var thisIsExpandable = this.isExpandable(),
			objIsExpandable = obj.isExpandable();
		
		if (this.fun == obj.fun || !thisIsExpandable && !objIsExpandable) {
			if (this.fun != obj.fun) return false;

			if (!thisIsExpandable && !objIsExpandable) {
				for (var i = 0; i < this.args.length; i++) {
					if (!this.args[i].equals(obj.args[i])) return false;
				}

				return true;
			}

			if (this.args.every((_, i) => {
				return this.args[i].equals(obj.args[i]);
			})) {
				return true;
			}
		}

		if (thisIsExpandable) {
			return this.expandOnce().equals(obj);
		}

		return this.equals(obj.expandOnce());
	}

	public toIndentedString(indent: number, root?: boolean): string {
		var args: any = this.args.map(arg => {
			if (arg instanceof Variable) return `${arg.name}<${arg._id}>`;
			return arg.toIndentedString(indent + 1);
		});
	
		if (args.join('').length <= 50) {
			args = this.args.map(arg => {
				if (arg instanceof Variable) return `${arg.name}<${arg._id}>`;
				return arg.toIndentedString(indent);
			});
	
			args = args.join(', ');
			
			if (this.fun instanceof Schema) {
				return `${this.fun.name || `(${this.fun})`}(${args})`;
			} else {
				return [
					!(this.fun instanceof Fun) || !this.fun.name
						? '(' + this.fun.toIndentedString(indent) + ')'
						: this.fun.name,
					`(${args})`
				].join('');
			}
		} else {
			args = args.join(',\n' + '\t'.repeat(indent + 1));
			
			if (this.fun instanceof Schema) {
				return [
					this.fun.name || `(${this.fun.toIndentedString(indent)})`,
					'(',
					'\t' + args,
					')'
				].join('\n' + '\t'.repeat(indent));
			} else {
				return [
					(
						!(this.fun instanceof Fun) || !('name' in this.fun && this.fun.name)
							? '(' + this.fun.toIndentedString(indent) + ')'
							: this.fun.name
					) + '(',
					'\t' + args,
					')'
				].join('\n' + '\t'.repeat(indent));
			}
		}
	}

	public toTeXString(prec?: Precedence, root?: boolean): string {
		if (this.fun instanceof Schema) {
			return (
				this.fun.name
					? `\\href{#schema-${this.fun.isProved() ? 'p' : 'np'}-${this.fun.name}}{\\textsf{${Node.escapeTeX(this.fun.name)}}}`
					: this.fun.toTeXString(false)
			) + `\\mathord{\\left(${this.args.map(arg => {
				return arg.toTeXString(Node.PREC_COMMA);
			}).join(', ')}\\right)}`;
		}

		if (this.fun instanceof ObjectFun)
			return this.fun.funcallToTeXString(this.args, prec);
		
		var args = this.args.map(arg => {
			return arg.toTeXString(Node.PREC_COMMA);
		});

		return (
			!(isNameable(this.fun) && this.fun.name) || this.fun instanceof Variable
				? this.fun.toTeXString(false)
				: this.fun.name.length == 1
					? Node.escapeTeX(this.fun.name)
					: `\\mathrm{${Node.escapeTeX(this.fun.name)}}`
		) + `\\mathord{\\left(${args.join(', ')}\\right)}`;
	}
}