import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import { BTree } from "../database/index/bplustree";

const ORDER = 3;
const margin = { top: 10, right: 120, bottom: 10, left: 40 };
const width = 500;
const dy = 20;
const dx = 40 + ORDER * 5;
const tree = d3.tree().nodeSize([dx, dy]);
const diagonal = d3
    .linkVertical()
    .x((d) => d.x)
    .y((d) => d.y);

function update(ctx, treeData) {
    const { gNode, gLink, svg } = ctx;
    const root = d3.hierarchy(treeData);
    root.d3dirty = true;
    root.x0 = 0;
    root.y0 = dy / 2;
    root.descendants().forEach((d, i) => {
        d.id = i;
    });
    const source = root;

    const duration = 400;
    const nodes = root.descendants().reverse();
    const links = root.links();

    // Compute the new tree layout.
    tree(root);

    let left = root;
    let right = root;
    root.eachBefore((node) => {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
    });

    // const height = right.y - left.y + margin.top + margin.bottom;
    const viewWidth = right.x - left.x + margin.left + margin.right;

    const transition = svg
        .transition()
        .duration(duration)
        .attr("viewBox", [left.x - margin.left, -margin.top, viewWidth, 900]);

    // Update the nodes…
    const node = gNode.selectAll("g").data(nodes, (d) => d.id);

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", (_event, d) => {
            ctx.onClick(d);
        });

    nodeEnter
        .append("rect")
        .attr("width", 5 * ORDER)
        .attr("height", 5)
        .attr("transform", (d) => `translate(${(5 * ORDER) / -2},-2.5)`)
        .attr("fill", "white")
        .attr("stroke", "#555")
        .attr("stroke-width", 0.5);

    nodeEnter
        .append("text")
        .attr("dy", "0.31em")
        .attr("text-anchor", "middle")
        .attr("style", "font-size: 3px")
        .attr("fill", "#555")
        .text((d) => d.data.name);

    node.selectAll("text").text((d) => d.data.name);

    // Transition nodes to their new position.
    const nodeUpdate = node
        .merge(nodeEnter)
        .transition(transition)
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    nodeUpdate.select("text").text((d) => d.data.name);

    // Transition exiting nodes to the parent's new position.
    node.exit()
        .transition(transition)
        .remove()
        .attr("transform", (d) => `translate(${source.x},${source.y})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

    // Update the links…
    const link = gLink.selectAll("path").data(links, (d) => d.target.id);

    // Enter any new links at the parent's previous position.
    const linkEnter = link
        .enter()
        .append("path")
        .attr("d", (d) => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
        });

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition).attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit()
        .transition(transition)
        .remove()
        .attr("d", (d) => {
            const o = { x: source.x, y: source.y };
            return diagonal({ source: o, target: o });
        });

    // Stash the old positions for transition.
    root.eachBefore((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

const setUpD3Visualization = (ref, treeData, handlers) => {
    const root = d3.hierarchy(treeData);

    root.x0 = 0; // dy / 2;
    root.y0 = dy / 2; //0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
    });

    const svg = d3
        .select(ref)
        .attr("viewBox", [-margin.left, -margin.top, width, dx])
        .style("font", "10px sans-serif")
        .style("user-select", "none");

    const gLink = svg
        .append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.9)
        .attr("stroke-width", 0.5);

    const gNode = svg
        .append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");

    d3Context = { gNode, gLink, svg, ...handlers };
    update(d3Context, treeData);
    return d3Context;
};

const treeIndex = BTree(4);
treeIndex.seed(5);
let d3Context;
export const BTreeComponent = () => {
    const d3Ref = useRef(null);
    const [insertVal, setVal] = useState(4);
    const [selectedNode, setSelectedNode] = useState(null);

    const onClick = (d) => {
        setSelectedNode(d.data);
        update(d3Context, treeIndex.toJSON());
    };

    useEffect(() => {
        if (treeIndex && d3Ref.current && !d3Context) {
            d3Context = setUpD3Visualization(
                d3Ref.current,
                treeIndex.toJSON(),
                { onClick }
            );
        }
    });

    return (
        <div>
            <input value={insertVal} onChange={(e) => setVal(e.target.value)} />
            <button
                onClick={() => {
                    treeIndex.insert(Number(insertVal), true);
                    update(d3Context, treeIndex.toJSON());
                }}
            >
                Add
            </button>
            <div>
                {selectedNode && (
                    <code>{JSON.stringify(selectedNode, null, 2)}</code>
                )}
            </div>
            <div className="max-w-4xl">
                <svg ref={d3Ref} />
            </div>
        </div>
    );
};
