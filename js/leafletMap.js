class LeafletMap {

  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
    }
    this.data = _data;
    this.initVis();
  }
  
  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;

    //ESRI
    vis.esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    vis.esriAttr = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

    //TOPO
    vis.topoUrl ='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    vis.topoAttr = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'

    //Thunderforest Outdoors- requires key... so meh... 
    vis.thOutUrl = 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}';
    vis.thOutAttr = '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    //Stamen Terrain
    vis.stUrl = 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}';
    vis.stAttr = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  
    //this is the base map layer, where we are showing the map background
    vis.base_layer = L.tileLayer(vis.topoUrl, {
      id: 'esri-image',
      attribution: vis.topoAttr,
      ext: 'png'
    });

//     vis.base_layer = L.tileLayer('https://{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png?apikey={apikey}', {
// 	attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
// 	apikey: '<your apikey>',
// 	maxZoom: 22
// });

    vis.theMap = L.map('my-map', {
      center: [39.4, -84],
      zoom: 10,
      layers: [vis.base_layer]
    });

    //if you stopped here, you would just have a map

    //initialize svg for d3 to add to map
    L.svg({clickable:true}).addTo(vis.theMap)// we have to make the svg layer clickable
    vis.overlay = d3.select(vis.theMap.getPanes().overlayPane)
    vis.svg = vis.overlay.select('svg').attr("pointer-events", "auto")
    
    //handler here for updating the map, as you zoom in and out           
    vis.theMap
      .on("zoomend", function(){
        vis.updateVis();
      })
      .on("moveend", function(){
        vis.updateVis();
      });

	vis.updateVis();
  }

  updateVis() {
    let vis = this;

    //want to see how zoomed in you are? 
    // console.log(vis.map.getZoom()); //how zoomed am I
    
    //want to control the size of the radius to be a certain number of meters? 
    vis.radiusSize = 3; 

    // if( vis.theMap.getZoom > 15 ){
    //   metresPerPixel = 40075016.686 * Math.abs(Math.cos(map.getCenter().lat * Math.PI/180)) / Math.pow(2, map.getZoom()+8);
    //   desiredMetersForPoint = 100; //or the uncertainty measure... =) 
    //   radiusSize = desiredMetersForPoint / metresPerPixel;
    // }

    // Array of 0s to hold the data counts for each day
    vis.data.dayTally = new Array(d3.timeDay.count(vis.data.timeBounds[0], vis.data.timeBounds[1]) + 1).fill(0);

    // Max # of calls shown for each day
    vis.data.dayMax = 250 / d3.timeDay.count(vis.data.timeBounds[0], vis.data.timeBounds[1]);

    // Filter the data for errors, time bounds from timeline brush, and whether the current map view includes the lat/long
    vis.filteredData = vis.data.filter( d => {
      return (
          !isNaN(d.latitude) 
          && !isNaN(d.longitude) 
          && vis.data.timeBounds[0] <= vis.data.parseTime(d.REQUESTED_DATETIME) 
          && vis.data.parseTime(d.REQUESTED_DATETIME) <= vis.data.timeBounds[1]
          && vis.theMap.getBounds().contains([d.latitude,d.longitude])
        );
      })

    // Then filter the remaining data by counting up the calls for each day and filtering out the excess
    vis.filteredData = vis.filteredData.filter( d => {
      let index = d3.timeDay.count(vis.data.timeBounds[0], vis.data.parseTime(d.REQUESTED_DATETIME));
      vis.data.dayTally[index]++;
      if (vis.data.dayTally[index] > vis.data.dayMax) {
        return false;
      }
      else return true;
    })

    // console.log(vis.filteredData);
   
   //these are the city locations, displayed as a set of dots 
   vis.Dots = vis.svg.selectAll('circle')
   .data(vis.filteredData) 
   .join('circle')
	   .attr("fill", "steelblue") 
	   .attr("stroke", "black")
	   //Leaflet has to take control of projecting points. Here we are feeding the latitude and longitude coordinates to
	   //leaflet so that it can project them on the coordinates of the view. Notice, we have to reverse lat and lon.
	   //Finally, the returned conversion produces an x and y point. We have to select the the desired one using .x or .y
	   .attr("cx", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).x)
	   .attr("cy", d => vis.theMap.latLngToLayerPoint([d.latitude,d.longitude]).y) 
	   .attr("r", 3)
	   .on('mouseover', function(event,d) { //function to add mouseover event
		   d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
			 .duration('150') //how long we are transitioning between the two states (works like keyframes)
			 .attr("fill", "red") //change the fill
			 .attr('r', 4); //change radius

		   //create a tool tip
		   d3.select('#tooltip')
			   .style('opacity', 1)
			   .style('z-index', 1000000)
				 // Format number with million and thousand separator
			   .html(`<div class="tooltip-label">Service: ${d.SERVICE_NAME}, \n Description: ${(d.DESCRIPTION)} ,\n Request Time:: ${(d.REQUESTED_DATETIME)}, \n Agency: ${d.AGENCY_RESPONSIBLE}</div>`);

		 })
	   .on('mousemove', (event) => {
		   //position the tooltip
		   d3.select('#tooltip')
			.style('left', (event.pageX + 10) + 'px')   
			 .style('top', (event.pageY + 10) + 'px');
		})              
	   .on('mouseleave', function() { //function to add mouseover event
		   d3.select(this).transition() //D3 selects the object we have moused over in order to perform operations on it
			 .duration('150') //how long we are transitioning between the two states (works like keyframes)
			 .attr("fill", "steelblue") //change the fill
			 .attr('r', 3) //change radius

		   d3.select('#tooltip').style('opacity', 0);//turn off the tooltip

		 })
	   .on('click', (event, d) => { //experimental feature I was trying- click on point and then fly to it
		  // vis.newZoom = vis.theMap.getZoom()+2;
		  // if( vis.newZoom > 18)
		  //  vis.newZoom = 18; 
		  // vis.theMap.flyTo([d.latitude, d.longitude], vis.newZoom);
		 });

  }


  renderVis() {
    let vis = this;

    //not using right now... 
 
  }
}