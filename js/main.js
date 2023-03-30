let data;

// Initialize dispatcher that is used to orchestrate events
const dispatcher = d3.dispatch('filterTime');

d3.tsv('data/Cincy311_2022_final.tsv')
	.then(_data => {
		data = _data;

		// Time parser function to be used by all visualizations
		data.parseTime = d3.timeParse("%Y-%m-%d");

		// Initial time filter bounds for all visualizations
		data.timeBounds = d3.extent(data, d => data.parseTime(d.REQUESTED_DATETIME));

		console.log(data[0]);
		console.log(data.length);
		data.forEach(d => {
			//console.log(d);
			d.latitude = +d.LATITUDE; //make sure these are not strings
			d.longitude = +d.LONGITUDE; //make sure these are not strings
		});

		// Initialize chart and then show it
		leafletMap = new LeafletMap({ parentElement: '#my-map'}, data);

		timeline = new Timeline({
			'parentElement': '#timeline',
			'containerHeight': 100,
			'containerWidth': 1500
		}, dispatcher, data);
		timeline.updateVis();

	})
	.catch(error => console.error(error));


dispatcher.on('filterTime', selectedDomain => {
	if (selectedDomain.length == 0) {
		// Reset  time filter
		leafletMap.data.timeBounds = d3.extent(data, d => data.parseTime(d.REQUESTED_DATETIME));
	} else {
		console.log(selectedDomain);
		leafletMap.data.timeBounds = selectedDomain;
	}
	leafletMap.updateVis();
});