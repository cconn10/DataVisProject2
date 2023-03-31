class Timeline {
    constructor(_config, _dispatcher, _data) {
        this.config = {
			parentElement: _config.parentElement,
			containerWidth: _config.containerWidth || 500,
			containerHeight: _config.containerHeight || 140,
			margin: { top: 10, bottom: 30, right: 50, left: 50 }
        }
		
		this.dispatcher = _dispatcher;
        this.data = _data;
    
        // Call a class function
        this.initVis();
	}

	initVis() {
        let vis = this;

        // Time parser - convert strings from data ("xxxx-xx-xx") to date objects
        // See: https://github.com/d3/d3-time-format
        vis.parseTime = d3.timeParse("%Y-%m-%d");

        // Formatter to go from date object to string
        vis.formatTime = d3.timeFormat("%Y-%m-%d");

        // Width and height of just graph area            
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
        
		// Define size of SVG drawing area
		vis.svg = d3.select(vis.config.parentElement)
			.attr('width', vis.config.containerWidth)
			.attr('height', vis.config.containerHeight);

		// Append group element that will contain our actual chart (see margin convention)
		vis.chart = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Initialize line as part of the "marks" group
        vis.linePath = vis.chart.append('path')
            .attr('class', 'chart-line');

        // Initialize scales with only range (domain is dependent on data filtering in updateVis())
        vis.xScale = d3.scaleTime()
            .range([0, vis.width]);
        
        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0]);

        // Initialize axes - NOTE: no yAxis drawn
        vis.xAxis = d3.axisBottom(vis.xScale)
			.tickFormat(d3.timeFormat("%Y-%m-%d"));

        vis.yAxis = d3.axisLeft(vis.yScale);

		// Append x-axis group and move it to the bottom of the chart
		vis.xAxisG = vis.chart.append('g')
			.attr('class', 'axis x-axis')
			.attr('transform', `translate(0,${vis.height})`);

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');

		// Initialize brush component
		vis.brush = d3.brushX()
			.extent([[0, 0], [vis.width, vis.height - 1]])
			.on('brush', function({selection}, event) {
				if (selection) vis.brushed(selection, event);
			})
			.on('end', function({selection}, event) {
				if (!selection) vis.brushed(null, event);
			});	

		vis.brushG = vis.chart.append('g')
			.attr('class', 'brush x-brush');
	}

	updateVis() {
        let vis = this;

        // Rollup data to get counts of calls per day
        vis.dayCounts = d3.rollup(vis.data, d => d.length, d => d.REQUESTED_DATETIME);

        // Structure data to be easily iteratable/sortable
        vis.dataOverTime = [];
        vis.dayCounts.forEach((value, key, map) => {
            // TODO: see if there are still blank entries like I had for project 1
            if (key != "") {
                vis.dataOverTime.push({"time": vis.parseTime(key), "val": value});
            }
        });

        // Sort data by day
        vis.dataOverTime.sort((a, b) => {
            if (a.time < b.time) return -1;
            else return 1;
        });

        // insert 0s for days not in data (between min and max)
        let i = 0;
        for (const day of d3.timeDay.every(1).range(d3.min(vis.dataOverTime, d => d.time), d3.max(vis.dataOverTime, d => d.time))) {
            if (!vis.dayCounts.has(vis.formatTime(day))) {
                vis.dataOverTime.splice(i, 0, {"time": day, "val": 0});
            }
            i++;
        }
        

		//reusable functions for x and y 
        vis.xValue = d => d.time; 
        vis.yValue = d => d.val;

        // Set scale domains with processed data
        vis.xScale.domain(d3.extent(vis.dataOverTime, d => vis.xValue(d)));
        vis.yScale.domain(d3.extent(vis.dataOverTime, d => vis.yValue(d)));

		vis.renderVis();
	}

	renderVis() {
		let vis = this;

        // Initialize line generator helper function
        vis.line = d3.line()
            .x(d => vis.xScale(vis.xValue(d)))
            .y(d => vis.yScale(vis.yValue(d)));
            
        // Add line path 
        vis.linePath
            .data([vis.dataOverTime])
            .attr('stroke',  'steelblue')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('d', vis.line);
		
		// Update axis
		vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);
		
		// Update the brush and define a default position
		// TODO: change default position to something meaningful?
		const defaultBrushSelection = [ vis.xScale(data.parseTime("2022-11-01")), 
                                        vis.xScale(data.parseTime("2022-11-09"))];
		vis.brushG
			.call(vis.brush)
			.call(vis.brush.move, defaultBrushSelection);
	}

	brushed(selection, event) {
		let vis = this;
	
		// Check if the brush is still active or if it has been removed
		if (selection) {
			// Convert given pixel coordinates (range: [x0,x1]) into a time period (domain: [Date, Date])
			const selectedDomain = selection.map(vis.xScale.invert, vis.xScale);
			
			// Call dispatcher to filter all affected charts to show only timestamps within selectedDomain
			vis.dispatcher.call('filterTime', event, selectedDomain);
		}
		else {
			// Reset x-scale of all affected charts
			vis.dispatcher.call('filterTime', event, vis.xScale.domain());
		}
	}
}