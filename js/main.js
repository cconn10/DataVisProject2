


d3.tsv('data/sampleData.tsv')
.then(data => {
    console.log(data[0]);
    console.log(data.length);
    data.forEach(d => {
      //console.log(d);
      if(d.LATITUDE && d.LONGITUDE){
        d.latitude = +d.LATITUDE; //make sure these are not strings
        d.longitude = +d.LONGITUDE;

      }

    });

    // Initialize chart and then show it
    leafletMap = new LeafletMap({ parentElement: '#my-map'}, data);


  })
  .catch(error => console.error(error));
