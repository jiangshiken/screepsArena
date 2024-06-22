/**
 Module: priorityQueue
 Author: masterkeze
 CreateDate:   2023.2.2
 UpdateDate:   2023.2.2
 version 0.0.0
 description: 优先级队列，enque插入元素，deque取出优先级最低的元素
*/
export class PriorityQueue<TElement> {
	private _nodes: ({ e: TElement, p: number } | undefined)[]
	private _size: number = 0;
	constructor() {
		this._nodes = [];

	}
	public get Count() {
		return this._size;
	}
	// 按优先级插入队列
	public Enqueue(element: TElement, priority: number) {
		let currentSize = this._size;
		if (this._nodes.length == currentSize) {
			this.Grow(currentSize + 1);
		}
		this._size = currentSize + 1;
		this.MoveUp(element, priority, currentSize);
	}
	// 查看最低优先级的元素
	public Peek(): TElement {
		if (this._size == 0) {
			throw new Error("Peeking Empty QriorityQueue");
		}
		return this._nodes[0]!.e;
	}
	// 取出优先级最低的元素
	public Dequeue() {
		if (this._size == 0) {
			throw new Error("Dequeueing Empty QriorityQueue");
		}
		let element = this._nodes[0]!.e;
		this.RemoveRootNode();
		return element;
	}
	private RemoveRootNode() {
		let lastNodeIndex = --this._size;
		if (lastNodeIndex > 0) {
			let lastNode = this._nodes[lastNodeIndex];
			this.MoveDown(lastNode!.e, lastNode!.p, 0);
		}

		this._nodes[lastNodeIndex] = undefined;
	}
	private Grow(minCapacity: number) {
		const growFactor = 2;
		const minimunGrow = 4;
		let newcapacity = growFactor * this._nodes.length;
		newcapacity = Math.max(newcapacity, this._nodes.length + minimunGrow);
		if (newcapacity < minCapacity) {
			newcapacity = minCapacity;
			let toAdd = Math.max(0, newcapacity - this._nodes.length);
			for (let i = 0; i < toAdd; i++) {
				this._nodes.push(undefined);
			}
		}
	}
	private MoveUp(element: TElement, priority: number, nodeIndex: number) {
		let nodes = this._nodes;
		while (nodeIndex > 0) {
			let parentIndex = this.GetParentIndex(nodeIndex);
			let parent = nodes[parentIndex];
			if (priority < parent!.p) {
				nodes[nodeIndex] = parent;
				nodeIndex = parentIndex;
			} else {
				break;
			}
		}

		nodes[nodeIndex] = { e: element, p: priority };
	}

	private MoveDown(element: TElement, priority: number, nodeIndex: number) {
		let nodes = this._nodes;
		let size = this._size;
		let i = 0;
		while ((i = this.GetFirstChildIndex(nodeIndex)) < size) {
			let minChild = nodes[i];
			let minChildIndex = i;
			let childIndexUpperBound = Math.min(i + 4, size);
			while (++i < childIndexUpperBound) {
				let nextChild = nodes[i];
				if (nextChild!.p < minChild!.p) {
					minChild = nextChild;
					minChildIndex = i;
				}
			}

			if (priority <= minChild!.p) {
				break;
			}
			nodes[nodeIndex] = minChild;
			nodeIndex = minChildIndex;
		}
		nodes[nodeIndex] = { e: element, p: priority };
	}

	private GetParentIndex(index: number) {
		return (index - 1) * 2;
	}
	private GetFirstChildIndex(index: number) {
		return Math.floor(index / 2) + 1;
	}

}
