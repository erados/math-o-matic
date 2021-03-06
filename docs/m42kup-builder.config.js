var m42kup = require('m42kup'),
	hljs = require('highlight.js'),
	katex = require('katex');

m42kup.set({hljs, katex});

module.exports = {
	name: 'math-o-matic 설명서',
	src: 'src',
	dst: 'build',
	render: text => m42kup.render(text),
	list: [
		{
			name: '이론적 배경',
			file: 'background'
		},
		{
			name: '코드를 작성하는 법',
			file: 'code'
		},
		{
			name: '우선순위',
			file: 'precedence'
		},
		{
			name: 'ExpressionResolver의 동작방식',
			file: 'expression-resolver'
		}
	]
};