class Heatmap {
    constructor(_config, _dispatcher, _data) {
        this.config = {
			parentElement: _config.parentElement,
			containerWidth: _config.containerWidth || 500,
			containerHeight: _config.containerHeight || 140,
			margin: { top: 10, bottom: 30, right: 0, left: 50 }
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
        
        vis.yScale = d3.scaleBand()
            .domain(["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"])
            .range([0, vis.height]);

        vis.colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateYlOrRd);

        vis.dayOfWeek = { 0: "Sun", 1: "Mon", 2: "Tues", 3: "Wed", 4: "Thurs", 5: "Fri", 6: "Sat" };

        // Initialize axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(d3.timeSunday.every(1))
            .tickFormat(d3.timeFormat("%m-%d"));

        vis.yAxis = d3.axisLeft(vis.yScale);

		// Append x-axis group and move it to the bottom of the chart
		vis.xAxisG = vis.chart.append('g')
			.attr('class', 'axis x-axis')
			.attr('transform', `translate(0,${vis.height})`);

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');

	}

	updateVis() {
        let vis = this;

        // Rollup data to get counts of calls per day
        vis.dayCounts = d3.rollup(vis.data.filter(d => {
                return (
                    d.REQUESTED_DATETIME != ""
                    && vis.data.timeBounds[0] <= vis.data.parseTime(d.REQUESTED_DATETIME) 
                    && vis.data.parseTime(d.REQUESTED_DATETIME) <= vis.data.timeBounds[1]
                )
            }), d => d.length, d => d.REQUESTED_DATETIME);

        // Structure data to be easily iteratable/sortable
        vis.dataOverTime = [];
        vis.dayCounts.forEach((value, key, map) => {
            // This filtering is being handled in main but in case that gets removed it doesn't hurt to leave this
            if (vis.parseTime(key) != null && vis.parseTime(key) >= vis.parseTime("2021-01-01") && vis.parseTime(key) <= vis.parseTime("2023-01-01")) {
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
            // console.log(vis.dayOfWeek[d3.timeDay.count(d3.timeSunday.floor(day), day)]);
            i++;
        }

		//reusable functions for x and y 
        vis.xValue = d => d.time; 
        vis.colorValue = d => d.val;

        // Set scale domains
        // x domain is manipulated to include the full week of 
        vis.xDomain = [ d3.min(vis.dataOverTime, d => d3.timeDay.offset(d3.timeSunday.floor(vis.xValue(d)), -4)), 
                        d3.max(vis.dataOverTime, d => d3.timeDay.offset(d3.timeSunday.floor(vis.xValue(d)), 4))]
        vis.xScale.domain(vis.xDomain);
        vis.colorScale.domain(d3.extent(vis.dataOverTime, d => vis.colorValue(d)));

		vis.renderVis();
	}

	renderVis() {
		let vis = this;

        let xWidth = vis.xScale(new Date(2000, 0, 7)) - vis.xScale(new Date(2000, 0, 0)) - 2;

        vis.squares = vis.chart.selectAll('rect')
            .data(vis.dataOverTime)
            .join('rect')
                .attr('fill', d => vis.colorScale(vis.colorValue(d)))
                .attr('height', vis.yScale.bandwidth() - 2)
                .attr('width', xWidth)
                .attr('x', d => vis.xScale(d3.timeSunday.floor(vis.xValue(d))) - xWidth/2)
                .attr('y', d => vis.yScale(vis.dayOfWeek[d3.timeDay.count(d3.timeSunday.floor(vis.xValue(d)), vis.xValue(d))]))
		
        if (d3.timeSunday.count(vis.xDomain[0], vis.xDomain[1]) > 20) vis.xAxis.ticks(d3.timeSunday.every(2));
        else vis.xAxis.ticks(d3.timeSunday.every(1));
            
		// Update axis
		vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);
		
	}

}