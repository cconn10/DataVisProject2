let data;

// Initialize dispatcher that is used to orchestrate events
const dispatcher = d3.dispatch('filterTime', 'filterZipcode', 'filterCallsPerDay', 'filterTimeSpan', 'filterServiceName');
	
d3.tsv('data/Cincy311_2022_final.tsv')
	.then(_data => {
		data = _data;

		let parseTime = d3.timeParse("%Y-%m-%d");

		data.forEach(d => {
			//console.log(d);
			d.latitude = +d.LATITUDE; //make sure these are not strings
			d.longitude = +d.LONGITUDE; //make sure these are not strings

			d.requestedDate = new Date(d.REQUESTED_DATE)
			d.updatedDate = new Date(d.UPDATED_DATE)

			d.serviceName = d.SERVICE_NAME
			d.zipcode = d.ZIPCODE
		});

		// Initial filtering to remove bad data - missing or improperly formatted datetime, broken lat/long
		data = data.filter(d => {
			return (
				d.REQUESTED_DATETIME != ""
				&& parseTime(d.REQUESTED_DATETIME) != null 
				&& parseTime(d.REQUESTED_DATETIME) >= parseTime("2022-01-01")
				&& parseTime(d.REQUESTED_DATETIME) <= parseTime("2023-01-01")
				&& parseTime(d.REQUESTED_DATETIME) <= parseTime(d.UPDATED_DATETIME)
				&& !isNaN(d.latitude)
				&& !isNaN(d.longitude)
			)
		})

		fullData = data;
		data.filtered = fullData

		data.filteredVisualizations = []

		console.log(data);
		// Time parser function to be used by all visualizations
		data.parseTime = d3.timeParse("%Y-%m-%d");

		// Initial time filter bounds for all visualizations
		data.timeBounds = d3.extent(data, d => data.parseTime(d.REQUESTED_DATETIME));

		// console.log(data[0]);

		// Initialize chart and then show it
		leafletMap = new LeafletMap({ parentElement: '#my-map'}, data);
		
		callsPerDay = new CallsPerDay({
			parentElement: '#calls-per-day',
			'containerHeight': 300,
			'containerWidth': 300
		}, dispatcher, data)
		callsPerDay.updateVis()

		serviceName = new ServiceName({
			parentElement: '#service-name',
			'containerHeight': 300,
			'containerWidth': 500
		}, dispatcher, data)
		serviceName.updateVis()

		requestedTimeSpan = new RequestTimeSpan({
			parentElement: '#request-time-span',
			'containerHeight': 300,
			'containerWidth': 500
		}, dispatcher, data)
		requestedTimeSpan.updateVis()

		zipcode = new Zipcode({
			parentElement: '#zipcode',
			'containerHeight': 300,
			'containerWidth': 500
		}, dispatcher, data)
		zipcode.updateVis()

		heatmap = new Heatmap({
			'parentElement': '#heatmap',
			'containerHeight': 300,
			'containerWidth': 650
		}, dispatcher, data);
		heatmap.updateVis();

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
		leafletMap.data.filtered = fullData;
		data.timeBounds = d3.extent(data, d => parseTime(d.REQUESTED_DATETIME));
	} else {
		leafletMap.data.filtered = data.filter( d => (selectedDomain[0] <= data.parseTime(d.REQUESTED_DATETIME) 
		&& data.parseTime(d.REQUESTED_DATETIME) <= selectedDomain[1]))

		leafletMap.data.timeBounds = selectedDomain;

		data.filteredVisualizations = []

		callsPerDay.selection = []
		zipcode.selection = []
		requestedTimeSpan.selection = []
		serviceName.selection = []
	}
	updateVisualizations()
});

dispatcher.on('filterZipcode', selectedDomain => {
	console.log(selectedDomain)
	if(selectedDomain.length == 0){
		leafletMap.data.filtered = fullData;
		leafletMap.data.filteredVisualizations.splice(leafletMap.data.filteredVisualizations.indexOf('zipcode'), 1)
	}
	else {
		leafletMap.data.filtered = leafletMap.data.filtered.filter(d => selectedDomain.includes(d.zipcode))
		leafletMap.data.filteredVisualizations.push('zipcode')
	}
	updateVisualizations()

});

dispatcher.on('filterCallsPerDay', selectedDomain => {
	if(selectedDomain.length == 0){
		leafletMap.data.filtered = fullData;
		leafletMap.data.filteredVisualizations.splice(leafletMap.data.filteredVisualizations.indexOf('callsPerDay'), 1)
	}
	else {
		console.log(selectedDomain)
		leafletMap.data.filtered = leafletMap.data.filtered.filter(d => selectedDomain.includes(d.requestedDate.getDay()))
		leafletMap.data.filteredVisualizations.push('callsPerDay')
		console.log(leafletMap.data.filtered)
	}
	updateVisualizations()

});


dispatcher.on('filterTimeSpan', selectedDomain => {
	if(selectedDomain.length == 0){
		leafletMap.data.filtered = fullData;
		leafletMap.data.filteredVisualizations.splice(leafletMap.data.filteredVisualizations.indexOf('timeSpan'), 1)
	}
	else {
		let filteredDomain = d3.extent(selectedDomain.map(d => d.x0).concat(selectedDomain.map(d => d.x1)))

		leafletMap.data.filtered = leafletMap.data.filtered.filter(d => (filteredDomain[0] <= (d.updatedDate - d.requestedDate) / (1000 * 60 * 60 * 24)
			&& (filteredDomain[1] > (d.updatedDate - d.requestedDate) / (1000 * 60 * 60 * 24))))
		leafletMap.data.filteredVisualizations.push('timeSpan')

	}
	updateVisualizations()
});


dispatcher.on('filterServiceName', selectedDomain => {
	if(selectedDomain.length == 0){
		leafletMap.data.filtered = fullData;
		leafletMap.data.filteredVisualizations.splice(leafletMap.data.filteredVisualizations.indexOf('serviceName'), 1)
	}
	else {
		leafletMap.data.filtered = leafletMap.data.filtered.filter(d => selectedDomain.includes(d.serviceName))
		leafletMap.data.filteredVisualizations.push('serviceName')
	}
	updateVisualizations()
});

function updateVisualizations() {
	leafletMap.updateVis();
	heatmap.updateVis();
	if(!data.filteredVisualizations.includes('callsPerDay'))
		callsPerDay.updateVis();
	if(!data.filteredVisualizations.includes('zipcode'))
		zipcode.updateVis();
	if(!data.filteredVisualizations.includes('serviceName'))
		serviceName.updateVis();
	if(!data.filteredVisualizations.includes('timeSpan'))
		requestedTimeSpan.updateVis();
}
