


d3.csv('data/Cincinnati_311__Non-Emergency__Service_Requests.csv')
.then(data => {
    console.log(data[0]);
    console.log(data.length);
    data.forEach(d => {
      d.latitude = +d.LATITUDE; //make sure these are not strings
      d.longitude = +d.LONGITUDE; //make sure these are not strings

      d.requestedDate = new Date(d.REQUESTED_DATE)
    });

    // Initialize chart and then show it
    //leafletMap = new LeafletMap({ parentElement: '#my-map'}, data);

    console.log(data)
    let callsPerDay = new CallsPerDay({parentElement: '#calls-per-day'}, data)
    callsPerDay.updateVis()


  })
  .catch(error => console.error(error));
