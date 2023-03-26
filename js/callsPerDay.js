class CallsPerDay {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerHeight: _config.containerHeight || 500,
            containerWidth: _config.containerWidth || 140,
            margin: {top: 10, right: 10, bottom: 10, left: 10},
            toolTipPadding: _config.toolTipPadding || 15,
        }

        this.data = _data
    }

    initVis() {
        let vis = this;
        
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom

        vis.chart = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth )
            .attr('height', vis.config.containerHeight)
            .append('g')
                .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
        
        vis.xScale = d3.scaleLinear()
            .range([0, vis.width])
        vis.yScale = d3.scaleBand()
            .range([0, vis.height])

        vis.xAxis = d3.axisBottom(vis.xScale)
        vis.yAxis = d3.axisLeft(vis.yScale)
        
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
    
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis')        
    }

    updateVis() {
        let vis = this

        console.log(vis.data)

        vis.data.forEach(d => {
            console.log(d.requestedDate.getDay())
        });
        vis.daysOfTheWeek = d3.rollup(vis.data, d=> d.length, d => d.requestedDate.getDay())
        console.log(vis.daysOfTheWeek)
    }
}