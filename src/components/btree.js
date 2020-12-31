import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { BTree } from "../database/index/bplustree";

const d3Visualization = (ref, treeData) => {
    const svg = d3.select(ref);
    const width = 600;
    const height = 400;
    const yMargin = 40;
    const xMargin = 20;

    // declares a tree layout and assigns the size
    var treemap = d3.tree().size([width - xMargin, height - yMargin]);

    //  assigns the data to a hierarchy using parent-child relationships
    var nodes = d3.hierarchy(treeData);

    // maps the node data to the tree layout
    nodes = treemap(nodes);

    svg.attr("preserveAspectRatio", "xMinYMin meet").attr("viewBox", [
        0 - xMargin / 2,
        0 - yMargin / 2,
        width + xMargin,
        height + yMargin,
    ]);

    // append the svg obgect to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    var g = svg
        .append("g")
        .attr(
            "transform",
            "translate(" + xMargin / 2 + "," + yMargin / 2 + ")"
        );

    // adds the links between the nodes
    g.selectAll(".link")
        .data(nodes.descendants().slice(1))
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", function (d) {
            return (
                "M" +
                d.x +
                "," +
                d.y +
                "C" +
                d.x +
                "," +
                (d.y + d.parent.y) / 2 +
                " " +
                d.parent.x +
                "," +
                (d.y + d.parent.y) / 2 +
                " " +
                d.parent.x +
                "," +
                d.parent.y
            );
        });

    // adds each node as a group
    var node = g
        .selectAll(".node")
        .data(nodes.descendants())
        .enter()
        .append("g")
        .attr("class", function (d) {
            return "node" + (d.children ? " node--internal" : " node--leaf");
        })
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    // adds the circle to the node
    node.append("circle").attr("r", 10);

    // adds the text to the node
    node.append("text")
        .attr("dy", ".35em")
        .attr("y", function (d) {
            return d.children ? -20 : 20;
        })
        .style("text-anchor", "middle")
        .text(function (d) {
            return d.data.name;
        });
};

export const BTreeComponent = () => {
    const d3Ref = useRef(null);
    const index = BTree(3);
    index.seed(50);
    const treeJSON = index.toJSON();
    console.log(treeJSON);

    useEffect(() => {
        if (treeJSON && d3Ref.current) {
            d3Visualization(d3Ref.current, treeJSON);
        }
    });

    return (
        <div className="max-w-4xl">
            <svg ref={d3Ref} />
        </div>
    );
};
