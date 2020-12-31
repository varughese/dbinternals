import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import { BTree } from "../database/index/bplustree";

const d3Visualization = (ref, data) => {
    const svg = d3.select(ref);
    const update = svg.append("g").selectAll("text").data(data);
    update
        .enter()
        .append("text")
        .attr("x", (d, i) => i * 25)
        .attr("y", 40)
        .style("font-size", 24)
        .text((d) => d);

    update.attr("x", (d, i) => i * 40).text((d) => d);
    update.exit().remove();
};

export const BTreeComponent = () => {
    const d3Ref = useRef(null);
    const data = [1, 2, 3, 4];
    const index = BTree(3);
    index.seed(5);
    const treeJSON = index.toJSON();
    console.log(treeJSON);

    useEffect(() => {
        if (data && d3Ref.current) {
            d3Visualization(d3Ref.current, data);
        }
    });

    return <svg width={400} height={200} ref={d3Ref} />;
};
