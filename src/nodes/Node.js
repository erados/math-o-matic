function Node() {
}

Node.prototype.escapeTeX = function (s) {
	return s.replace(/_/g, '\\_');
}

module.exports = Node;