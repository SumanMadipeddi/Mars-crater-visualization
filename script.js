const width = 1400;
const height = 650;
const margin = {top: 40, right: 30, bottom: 30, left: 60};
document.addEventListener('DOMContentLoaded', function() {
    d3.csv('marsCrater.csv').then(function(data) {
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
        
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        const xScale = d3.scaleLinear().domain([-180, 180]).range([0, innerWidth]);
        const yScale = d3.scaleLinear().domain([90, -90]).range([0, innerHeight]);

        const densityEstimate = d3.contourDensity()
            .x(d => xScale(+d.LONGITUDE_CIRCLE_IMAGE))
            .y(d => yScale(+d.LATITUDE_CIRCLE_IMAGE))
            .size([innerWidth, innerHeight])
            .bandwidth(20) 
            (data);
  
        const colorScale = d3.scaleSequential(d3.interpolateTurbo)
            .domain([0, d3.max(densityEstimate, d => d.value)]); 
 
        g.selectAll("path")
            .data(densityEstimate)
            .enter().append("path")
            .attr("d", d3.geoPath())
            .attr("fill", d => colorScale(d.value))
            .style('opacity', 0) 
            .transition()
            .duration(2000) 
            .style('opacity', 1)
            .on('end', function() {
            drawCraters(g, data, xScale, yScale);
            });

        drawGrid(g, xScale, yScale, innerWidth, innerHeight);

        drawLegend(svg, colorScale, width, height, margin);
    });
});

function drawLollipop(g, d, xScale, yScale, colorScale) {
    const lollipop = g.append('line')
        .attr('class', 'lollipop')
        .attr('x1', xScale(+d.LONGITUDE_CIRCLE_IMAGE))
        .attr('y1', yScale(+d.LATITUDE_CIRCLE_IMAGE))
        .attr('x2', xScale(+d.LONGITUDE_CIRCLE_IMAGE))
        .attr('y2', yScale(+d.LATITUDE_CIRCLE_IMAGE))
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('opacity', 0) 
        .transition()
        .duration(500) 
        .attr('y2', yScale(+d.LATITUDE_CIRCLE_IMAGE) + (+d.DEPTH_RIMFLOOR_TOPOG) * 50) 
        .attr('opacity', 1); 

    drawSymbol(g, d, xScale, yScale, colorScale);
}

function drawSymbol(g, d, xScale, yScale, colorScale) {
    let symbolType;
    switch(d.NUMBER_LAYERS) {
        case "box":
            symbolType = d3.symbolSquare;
            break;
        case "star":
            symbolType = d3.symbolStar;
            break;
        case "diamond":
            symbolType = d3.symbolDiamond;
            break;
        case "triangle":
            symbolType = d3.symbolTriangle;
            break;
        default:
            symbolType = d3.symbolCircle;
    }

    g.append('path')
        .attr('class', 'symbol')
        .attr('d', d3.symbol().type(symbolType)()) 
        .attr('fill', colorScale(d.NUMBER_LAYERS))
        .attr('transform', () => {
            const x = xScale(+d.LONGITUDE_CIRCLE_IMAGE);
            const y = yScale(+d.LATITUDE_CIRCLE_IMAGE) + (+d.DEPTH_RIMFLOOR_TOPOG) * 50;
            return `translate(${x}, ${y})`;
        })
        .attr('opacity', 0)
        .transition()
        .duration(500)
        .attr('opacity', 1);
}

function drawCraters(g, data, xScale, yScale) {
    const cratersGroup = g.append('g').attr('class', 'craters-group');
    const diameterScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.DIAM_CIRCLE_IMAGE)])
        .range([2, 20]);
    const layerColorScale = d3.scaleOrdinal()
        .domain(data.map(d => d.NUMBER_LAYERS))
        .range(['rgb(208, 6, 254)', 'red', '#2ca02c', 'rgb(242, 118, 17)']);
    drawLegendColor(g, layerColorScale, width, height, margin);
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    const lollipopGroup = g.append('g').attr('class', 'lollipop-group'); 

    cratersGroup.selectAll('circle')
        .data(data)
        .enter().append('circle')
        .attr('cx', xScale(0)) 
        .attr('cy', yScale(0))
        .attr('r', 0) 
        .attr('fill', d => layerColorScale(d.NUMBER_LAYERS)) 
        .attr('stroke', 'black') 
        .attr('stroke-width', 0.5)
        .style('filter', 'url(#drop-shadow)')
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", d => diameterScale(+d.DIAM_CIRCLE_IMAGE) + 5) 
                .style("opacity", 1); 
            tooltip.transition()
                .duration(200)
                .style("opacity", .8);
            tooltip.html(`Diameter: ${d.DIAM_CIRCLE_IMAGE} km<br/>Depth: ${d.DEPTH_RIMFLOOR_TOPOG}` +
                ` km<br/>Layers: ${d.NUMBER_LAYERS}`)
                .style("left", (event.pageX +12) + "px")
                .style("top", (event.pageY - 10) + "px");
            drawLollipop(lollipopGroup, d, xScale, yScale, layerColorScale);
        })
        .on("mouseout", function(d) {
            d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d => diameterScale(+d.DIAM_CIRCLE_IMAGE)); 
            tooltip.transition()
            .duration(500)
            .style("opacity", 0);
            lollipopGroup.selectAll('.lollipop').remove();
            lollipopGroup.selectAll('.symbol').remove(); 
        })
        .transition()
        .duration(1500) 
        .attr('cx', d => xScale(+d.LONGITUDE_CIRCLE_IMAGE)) 
        .attr('cy', d => yScale(+d.LATITUDE_CIRCLE_IMAGE))
        .attr('r', d => diameterScale(+d.DIAM_CIRCLE_IMAGE)); 
}

function drawGrid(g, xScale, yScale, innerWidth, innerHeight) {
    const latitudes = d3.range(-90, 91, 20);
    const longitudes = d3.range(-180, 181, 20);
    latitudes.forEach(lat => {
        g.append('line')
            .attr('x1', 0)
            .attr('y1', yScale(lat))
            .attr('x2', innerWidth)
            .attr('y2', yScale(lat))
            .attr('stroke', '#ddd')
 
        g.append('text')
            .attr('x', -20)
            .attr('y', yScale(lat))
            .attr('dy', '0.32em')
            .attr('font-size', 10)
            .attr('fill', 'white')
            .text(lat);
    });
    longitudes.forEach(lon => {
        g.append('line')
            .attr('x1', xScale(lon))
            .attr('y1', 0)
            .attr('x2', xScale(lon))
            .attr('y2', innerHeight)
            .attr('stroke', '#ddd')
            .attr('stroke-width', 0.5);

        g.append('text')
            .attr('x', xScale(lon))
            .attr('y', innerHeight+4)
            .attr('dy', '1em')
            .attr('font-size', 10)
            .attr('fill', 'white')
            .text(lon);
    });
}

function drawLegend(svg, colorScale, width, height, margin) {
    const legendHeight = 200;
    const legendWidth = 16;
    const legendMargin = {top: 50, right: 30, bottom: 30, left: 60};
    const legendTitleOffset = 30;

    const legendSvg = d3.select('#visualization')
        .append('svg')
        .attr('width', legendWidth + legendMargin.left + legendMargin.right)
        .attr('height', legendHeight + legendMargin.top + legendMargin.bottom + legendTitleOffset)
        .attr('x', width - margin.right - legendMargin.right - legendWidth)
        .attr('y', margin.top);

    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "gradient-heatmap")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "0%");

    const numStops = 10; 
    const colorRange = colorScale.range();
    const domain = colorScale.domain();
    const increment = (domain[1] - domain[0]) / (numStops - 1);
    let stops = [];
    for (let i = 0; i < numStops; i++) {
        stops.push({
            offset: `${(100 * i) / (numStops - 1)}%`,
            color: colorScale(domain[0] + i * increment)
        });
    }

    linearGradient.selectAll("stop")
        .data(stops)
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#gradient-heatmap)");

    legendSvg.append("text")
        .attr("x", legendMargin.left-30)
        .attr("y", legendTitleOffset+20) 
        .attr("fill", "white") 
        .attr("font-size", "16px")
        .text("Heat Map");

    legendSvg.append("text")
        .attr("x", 20)
        .attr("y", 200)
        .style("text-anchor", "start")
        .attr("fill", "white")
        .text("Low Craters");

    legendSvg.append("text")
        .attr("x", 20)
        .attr("y", 13)
        .style("text-anchor", "start")
        .attr("fill", "white")
        .text("High Craters");
}

function drawLegendColor(svg, layerColorScale, width, height, margin) {
    const legendHeight = 200;
    const legendWidth = 55;
    const legendPadding = 30; 
    const legendSvg = svg
        .append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("x", width - legendWidth - margin.right - legendPadding) 
        .attr("y", margin.top);

    const legendGroup = legendSvg
        .append("g")
        .attr("transform", `translate(${legendPadding}, ${legendPadding})`);

    const layerNames = layerColorScale.domain();
    legendGroup
        .selectAll(".legend-rect")
        .data(layerNames)
        .enter()
        .append("rect")
        .attr("class", "legend-rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25) 
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", layerColorScale);

    legendGroup
        .selectAll(".legend-text")
        .data(layerNames)
        .enter()
        .append("text")
        .attr("class", "legend-text")
        .attr("x", 25) 
        .attr("y", (d, i) => i * 25 + 10)
        .attr("fill", "white")
        .text((d) => `Layer ${d}`);
}

