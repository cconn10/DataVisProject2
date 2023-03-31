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

    this.color = "timeBtwn"
    this.colorScale = this.setColorScale();
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
    vis.base_layer = L.tileLayer(vis.stUrl, {
      id: 'esri-image',
      attribution: vis.stAttr,
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
    vis.theMap.on("zoomend", function(){
      vis.updateVis();
    });

    document.getElementById("service").addEventListener("click", function() {vis.setColorType("service")});
    document.getElementById("timeBtwn").addEventListener("click", function() {vis.setColorType("timeBtwn")});
    document.getElementById("timeYear").addEventListener("click", function() {vis.setColorType("timeYear")});
    document.getElementById("agency").addEventListener("click", function() {vis.setColorType("agency")});

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
   
   //these are the city locations, displayed as a set of dots 
   vis.Dots = vis.svg.selectAll('circle')
   .data(vis.data.filtered.filter( d => {
	   return (!isNaN(d.longitude) && !isNaN(d.latitude))
   })) 
   .join('circle')
	   .attr("fill", function(d){return vis.colorScale(vis.getColorInput(d))}) 
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
			 .attr("fill", function(d){return vis.colorScale(vis.getColorInput(d))}) //change the fill
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

  getAllTimeBetween(){
    let vis = this;

    let times = [];

    vis.data.forEach(d => {
      let t = vis.getTimeBetween(d.REQUESTED_DATETIME, d.UPDATED_DATETIME);
      times.push(t);
    });

    return times;

  }

  getTimeBetween(r, u){
    let req = new Date(r);
    let up = new Date(u);

    return up-req;


  }

  getTimeofYear(d){
    //Returns the season the request was made

    let dat = new Date(d);
   
//Winter is December through Febuary
    if(dat.getMonth() < 2 || dat.getMonth() == 11){
      return 1;
    }
    //Spring is March through May

    else if(dat.getMonth() >= 2 && dat.getMonth() < 5){
      return 2;
    }
    //Summer is May through August
    else if(dat.getMonth() >= 5 && dat.getMonth() < 8){
      return 3;
    }
    //Fall is September through November
    else{
      return 4;
    }

  }

  setColorScale() {
    let vis = this;
    if(vis.color == "service"){

      //map each service code to a color

      let serviceData = d3.rollup(vis.data, v => v.length, d => d.SERVICE_CODE);
      //console.log(planetData);

      const serviceArr = Array.from(serviceData, function(d){return{key: d[0], value: d[1]};});
      //console.log(planetArr);

      let sorteService = serviceArr.slice().sort((a, b) => d3.descending(a.value, b.value));
      //console.log(sortePlanet);

      return d3.scaleOrdinal().domain(sorteService.map(d => d.key)).range(["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]);
    

    }
    else if(vis.color == "timeBtwn"){

        var times = vis.getAllTimeBetween();

      return d3.scaleOrdinal().domain([d3.min(times), d3.max(times)]).range(d3.interpolateHslLong("red", "green")(0.5));

    }
    else if(vis.color == "timeYear"){

      return d3.scaleOrdinal().domain([1,2,3,4]).range(["blue", "green", "yellow", "orange"]);

    }
    else{

      let agencies = d3.rollup(vis.data, v => v.length, d => d.AGENCY_RESPONSIBLE);
      //console.log(planetData);

      const agenciesArr = Array.from(agencies, function(d){return{key: d[0], value: d[1]};});
      //console.log(planetArr);

      let sortedAgencies = agenciesArr.slice().sort((a, b) => d3.ascending(a.key, b.key));
      //console.log(sortedPlanet);

      return d3.scaleOrdinal().domain(sortedAgencies.map(d => d.key)).range(["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]);
    

    }
    
  }

  setColorType(type){
    let vis = this;

    vis.color = type;

    vis.colorScale = vis.setColorScale();

    vis.updateVis();

  }

  getColorInput(d){
    let vis = this;

    if(vis.color == "service"){
      return d.SERVICE_CODE;
    }
    else if(vis.color == "timeBtwn"){
      return vis.getTimeBetween(d.REQUESTED_DATETIME, d.UPDATED_DATETIME);
    }
    else if(vis.color == "timeYear"){
      return vis.getTimeofYear(d.REQUESTED_DATETIME);
    }
    else{
      return d.AGENCY_RESPONSIBLE;
    }
  }

  renderVis() {
    let vis = this;

    //not using right now... 
 
  }
}