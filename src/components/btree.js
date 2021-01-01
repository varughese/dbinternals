import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import { BTree } from "../database/index/bplustree";

const setUpD3Visualization = (ref, treeData) => {
    const margin = { top: 10, right: 120, bottom: 10, left: 40 };
    const width = 500;
    const dy = 30;
    const dx = 40;
    const tree = d3.tree().nodeSize([dx, dy]);
    const diagonal = d3
        .linkVertical()
        .x((d) => d.x)
        .y((d) => d.y);

    const root = d3.hierarchy(treeData);

    root.x0 = 0; // dy / 2;
    root.y0 = dy / 2; //0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.depth && d.data.name.length !== 7) d.children = null;
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
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);

    const gNode = svg
        .append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");

    function update(source) {
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
            .attr("viewBox", [
                left.x - margin.left,
                -margin.top,
                viewWidth,
                900,
            ])
            .tween(
                "resize",
                window.ResizeObserver
                    ? null
                    : () => () => svg.dispatch("toggle")
            );

        // Update the nodes…
        const node = gNode.selectAll("g").data(nodes, (d) => d.id);

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node
            .enter()
            .append("g")
            .attr("transform", (d) => `translate(${source.x0},${source.y0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("click", (event, d) => {
                d.children = d.children ? null : d._children;
                update(d);
            });

        nodeEnter
            .append("rect")
            .attr("width", 5)
            .attr("height", 5)
            .attr("transform", (d) => `translate(-2.5,-2.5)`)
            .attr("fill", (d) => (d._children ? "#555" : "#999"))
            .attr("stroke-width", 10);

        nodeEnter
            .append("text")
            .attr("dy", "0.31em")
            .attr("x", (d) => (d._children ? -6 : 6))
            .attr("text-anchor", (d) => (d._children ? "end" : "start"))
            .text((d) => d.data.name)
            .clone(true)
            .lower()
            .attr("stroke-linejoin", "round")
            .attr("stroke-width", 3)
            .attr("stroke", "white");

        // Transition nodes to their new position.
        const nodeUpdate = node
            .merge(nodeEnter)
            .transition(transition)
            .attr("transform", (d) => `translate(${d.x},${d.y})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        const nodeExit = node
            .exit()
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
                const dag = diagonal({ source: o, target: o });
                console.log(d, dag);
                return dag;
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

    update(root);

    return svg.node();
};

let svg;
let treemap;
const treeIndex = BTree(4);
treeIndex.seed(50);
export const BTreeComponent = () => {
    const d3Ref = useRef(null);
    const [treeJSON, setTreeJSON] = useState(treeIndex.toJSON());
    // const treeJSON = index.toJSON();

    useEffect(() => {
        if (treeJSON && d3Ref.current) {
            const setup = setUpD3Visualization(d3Ref.current, treeJSON);
            // svg = setup.svg;
            // treemap = setup.treemap;
        }
    });

    return (
        <div>
            {/* <button
                onClick={() => {
                    treeIndex.insert(4, true);
                    updateTree(svg, treeIndex.toJSON(), treemap);
                    // setTreeJSON(index.toJSON());
                }}
            >
                Add
            </button> */}
            <div className="max-w-4xl">
                <svg ref={d3Ref} />
            </div>
        </div>
    );
};
