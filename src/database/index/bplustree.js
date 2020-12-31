// straight copied from https://github.com/yangez/btree-js

// constructor
export const BTree = function (order) {
    var tree = Object.create(BTree.prototype);
    tree.root = null;
    tree.order = order;
    tree.current_leaf_offset = 0;
    tree.unattached_nodes = [[]]; // array for unattached nodes based on leaf_offset

    if (tree.order < 3) {
        alert("Order must be 3 or above.");
        return false;
    }

    return tree;
};

// create a node that belongs to this tree
BTree.prototype.createNode = function (keys, children, parent) {
    return BTreeNode(this, keys, children, parent);
};

// Search function that returns the leaf node to insert into
BTree.prototype.search = function (value, strict) {
    if (!this.root) return false;
    else return this.root.traverse(value, strict);
};

// Main insertion function
BTree.prototype.insert = function (value, silent) {
    if (this.search(value, true)) {
        if (!silent) alert("The value " + value + " already exists!");
        return false;
    }

    this.current_leaf_offset = 0;
    this.unattached_nodes = [[]];

    // 1. Find which leaf the inserted value should go
    var target = this.search(value);
    if (!target) {
        // create new root node
        this.root = this.createNode();
        target = this.root;
    }

    // 2. Apply target.insert (recursive)
    target.insert(value);
};

BTree.prototype.addUnattached = function (node, level) {
    this.unattached_nodes[level] = this.unattached_nodes[level] || [];

    // add node to unattached at specific level
    this.unattached_nodes[level].push(node);

    // sort all unattached nodes at this level, ascending
    this.unattached_nodes[level].sort(function (a, b) {
        var first = parseInt(a.keys[0]);
        var second = parseInt(b.keys[0]);
        if (first > second) return 1;
        else if (first < second) return -1;
        else return 0;
    });
};
BTree.prototype.removeUnattached = function (node, level) {
    var index = this.unattached_nodes[level].indexOf(node);
    if (index > -1) {
        this.unattached_nodes[level].splice(index, 1);
    }
};

// Generate tree json for d3.js to consume
BTree.prototype.toJSON = function () {
    var root = this.root;
    return root.toJSON();
};

// seed bTree with "count" unique numbers
BTree.prototype.seed = function (count) {
    var list = [];

    var upper = 100;
    if (count > 50) upper = count * 2;

    for (let i = 1; i < upper; i++) list.push(i);

    for (let i = 0; i < count; i++) {
        list.sort(function (a, b) {
            return Math.floor(Math.random() * 3) - 1;
        });
        var current = list.shift();
        this.insert(current, true);
    }
};

BTree.prototype.isEmpty = function () {
    return !this.root;
};

// constructor
// don't call this directly, call BTree::createNode instead
var BTreeNode = function (tree, keys, children, parent) {
    var newNode = Object.create(BTreeNode.prototype);
    newNode.tree = tree;
    newNode.keys = keys || [];
    newNode.children = children || []; // apparently fixed arrays are bad in JS
    newNode.parent = parent || null;

    return newNode;
};

// Traverse tree until we find correct node to insert this value
// strict=true searches for node containing exact value
BTreeNode.prototype.traverse = function (value, strict) {
    if (this.keys.indexOf(value) > -1) return this;
    else if (this.isLeaf()) {
        if (strict) return false;
        else return this;
    } else {
        // find the correct downward path for this value
        for (var i = 0; i < this.keys.length; i++) {
            if (value < this.keys[i]) {
                return this.children[i].traverse(value, strict);
            }
        }
        return this.children[this.keys.length].traverse(value, strict);
    }
};

BTreeNode.prototype.insert = function (value) {
    var int = parseInt(value) || 0;
    if (int <= 0 || int > 1000000000000) {
        alert("Please enter a valid integer.");
        return false;
    }

    // insert element
    this.keys.push(value);
    this.keys.sort(function (a, b) {
        // sort numbers ascending
        if (a > b) return 1;
        else if (a < b) return -1;
        else return 0;
    });

    // if overflow, handle overflow (go up)
    if (this.keys.length === this.tree.order) {
        this.handleOverflow();
    } else {
        // if not filled, start attaching children
        this.attachChildren();
    }
};

BTreeNode.prototype.handleOverflow = function () {
    var tree = this.tree;

    // find this node's median and split into 2 new nodes
    var median = this.splitMedian();

    // if no parent, create an empty one and set to root
    if (this.isRoot()) {
        tree.root = tree.createNode();
        this.setParent(tree.root);
    }

    // if node is internal, unattach children and add to unattached_nodes
    if (this.isInternal()) this.unattachAllChildren();

    // remove self from parent
    var target = this.parent;
    this.unsetParent();

    // Push median up to target, increment offset
    tree.current_leaf_offset += 1;
    target.insert(median);
};

// function to go down and reattach nodes
BTreeNode.prototype.attachChildren = function () {
    var target = this;
    var tree = this.tree;
    var offset = target.tree.current_leaf_offset - 1;

    // get all nodes below the current node
    var target_nodes = target.tree.unattached_nodes[offset];

    if (target_nodes && target_nodes.length > 0) {
        // first, put all existing nodes into target_nodes so they're ordered correctly
        target.unattachAllChildren();

        // then, attach keys.length+1 children to this node
        for (var i = 0; i <= target.keys.length; i++) {
            target.setChild(target_nodes[0]);
            target.tree.removeUnattached(target_nodes[0], offset);
        }

        // lower offset, and repeat for each one of the children
        tree.current_leaf_offset -= 1;
        target.children.forEach(function (child) {
            child.attachChildren();
        });

        // come back up so upper levels can process appropriately
        tree.current_leaf_offset += 1;
    }
};

// helper function to split node into 2 and return the median
BTreeNode.prototype.splitMedian = function () {
    var tree = this.tree;
    var median_index = parseInt(tree.order / 2);
    var median = this.keys[median_index];

    var leftKeys = this.keys.slice(0, median_index);
    var leftNode = tree.createNode(leftKeys); // no children or parent
    tree.addUnattached(leftNode, tree.current_leaf_offset);

    var rightKeys = this.keys.slice(median_index + 1, this.keys.length);
    var rightNode = tree.createNode(rightKeys);
    tree.addUnattached(rightNode, tree.current_leaf_offset);
    return median;
};

BTreeNode.prototype.setChild = function (node) {
    if (node) {
        this.children.push(node);
        node.parent = this;
    }
};
BTreeNode.prototype.unattachAllChildren = function () {
    var length = this.children.length;
    var tree = this.tree;
    for (var i = 0; i < length; i++) {
        var child = this.children[0];
        child.unsetParent();
        tree.addUnattached(child, tree.current_leaf_offset - 1);
    }
};

BTreeNode.prototype.setParent = function (node) {
    node.setChild(this);
};

BTreeNode.prototype.unsetParent = function () {
    var node = this;
    if (node.parent) {
        node.parent.children.forEach(function (child, index) {
            if (child === node) node.parent.children.splice(index, 1);
        });
        node.parent = null;
    }
};

BTreeNode.prototype.isRoot = function () {
    return this.parent === null;
};
BTreeNode.prototype.isLeaf = function () {
    return !this.children || this.children.length === 0;
};
BTreeNode.prototype.isInternal = function () {
    return !this.isLeaf() && !this.isRoot();
};

// generate node json, used in BTree::toJSON
BTreeNode.prototype.toJSON = function () {
    var json = {};
    json.name = this.keys.toString();
    if (!this.isRoot()) json.parent = this.parent.keys.toString();
    if (!this.isLeaf()) {
        json.children = [];
        this.children.forEach(function (child, index) {
            json.children.push(child.toJSON());
        });
    }
    return json;
};
