class RequestTimeSpan {
    constructor(_config,_dispatcher, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerHeight: _config.containerHeight || 500,
            containerWidth: _config.containerWidth || 140,
            margin: {top: 10, right: 20, bottom: 30, left: 170},
            toolTipPadding: _config.toolTipPadding || 15,
        }
        this.dispatcher = _dispatcher
        this.data = _data

        this.initVis();
    }

    initVis() {
        let vis = this;
        
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom

        vis.selection = []

        vis.chart = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth )
            .attr('height', vis.config.containerHeight)
            .append('g')
                .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
        
        vis.xScale = d3.scaleLinear()
            .range([0, vis.width])
        vis.yScale = d3.scaleLinear()
            .range([0, vis.height])

        vis.xAxis = d3.axisBottom(vis.xScale)
        vis.yAxis = d3.axisLeft(vis.yScale)
        
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0, ${vis.height})`)
    
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis')        
    }

    updateVis() {
        let vis = this

        vis.xValue = d => d.length
        vis.yValue = d => d.x0

        let binCount = vis.data.filtered.length < 100 ? 5
            : (vis.data.filtered.length < 1000 ? 10 : 20)

        vis.bins = d3.bin()
        .thresholds(binCount)
        .value(d => (d.updatedDate - d.requestedDate) / (1000 * 60 * 60 * 24))


        vis.timeSpan = vis.bins(vis.data.filtered)

        vis.xScale.domain([0, d3.max(vis.timeSpan, d => vis.xValue(d))])
        vis.yScale.domain([0, d3.max(vis.timeSpan, d => d.x1)])

        vis.chart.selectAll(".label")        
            .data(vis.timeSpan)
            .join("text")
                .attr("class","label")
                .attr("y", d => ((vis.yScale(d.x1) + vis.yScale(d.x0)) / 2))
                .transition()
                .attr("x", d => vis.xScale(vis.xValue(d)))
                .attr("dy", ".75em")
                .text(d => vis.xValue(d) > 0 ? vis.xValue(d) : "");

        vis.renderVis()
    }

    renderVis() {
        let vis = this
        //"translate(" + vis.yScale(d.x0) + "," + vis.xScale(d.length) + ")"

        console.log(vis.timeSpan)

        vis.bars = vis.chart.selectAll('.bar')
            .data(vis.timeSpan)
            .join('rect')
                .attr('class', 'bar')
                .attr('fill', '#cb6543')
                .attr('height', d => vis.yScale(d.x1) - vis.yScale(d.x0) - 1)
                .attr('y', d => vis.yScale(vis.yValue(d)))
            .on('click', (event, d) => {
                let index = vis.selection.indexOf(d)
                if(index == -1){
                    vis.selection.push(d)
                    console.log(vis.selection)
                    vis.dispatcher.call('filterTimeSpan', event, vis.selection);

                    vis.bars
                        .transition()
                        .attr('fill', d=> vis.selection.includes(d) ? '#9e3715' : '#cb6543')
                }
                else{
                    vis.selection.splice(index, 1)
                    vis.dispatcher.call('filterTimeSpan', event, vis.selection);
                    
                    vis.bars
                        .transition()
                        .attr('fill', d=> vis.selection.includes(d) ? '#9e3715' : '#cb6543')
                }
            })

            vis.bars.transition()
            .attr('width', d => vis.xScale(vis.xValue(d)))
            .attr('x', 0)
                
        vis.xAxisG.call(vis.xAxis)
        vis.yAxisG.call(vis.yAxis)
    }
}