import Scope from "../Scope";
import Expr0 from "./Expr0";
import Node from "./Node";
import Type from "./Type";
import Variable from "./Variable";

/**
 * 숫자가 큰 것이 우선순위가 높다.
 */
export enum EqualsPriority {
	/** Variable */
	ZERO,
	/** Fun */
	ONE,
	/** Tee */
	TWO,
	/** Funcall */
	THREE,
	/** $Variable, Reduction */
	FOUR
}

export default abstract class Metaexpr extends Node {
	public readonly type: Type;

	constructor(scope: Scope, doc: string, tex: string, type: Type) {
		super(scope, doc, tex);

		if (!type) throw Node.error('Assertion failed', scope);

		this.type = type;
	}

	public abstract substitute(map: Map<Variable, Expr0>): Metaexpr;

	/**
	 * 
	 * @param andFuncalls 이름 없는 Funcall도 푼다.
	 */
	public abstract expandMeta(andFuncalls: boolean): Metaexpr;

	public equals(obj: Metaexpr): boolean {
		if (this === obj) return true;
		if (!this.type.equals(obj.type)) return false;

		if (obj.getEqualsPriority() > this.getEqualsPriority())
			return obj.equalsInternal(this);
		
		return this.equalsInternal(obj);
	}

	protected abstract getEqualsPriority(): EqualsPriority;

	protected abstract equalsInternal(obj: Metaexpr): boolean;
}