'use strict';

(function () {
  $(document).ready(function () {
	
    tableau.extensions.initializeAsync().then(function () {

				  tableau.extensions.dashboardContent.dashboard.worksheets[0].getDataSourcesAsync().then(datasources =>
							{var dataSource = datasources.find(datasource => datasource.name === "datamapping");
								return dataSource.refreshAsync();
							});

		  var timerID = setInterval(function() {
				  tableau.extensions.dashboardContent.dashboard.worksheets[0].getDataSourcesAsync().then(datasources =>
							{var dataSource = datasources.find(datasource => datasource.name === "datamapping");
								return dataSource.refreshAsync();
							});
				}, 120 * 1000); 
				
	  
    }, function (err) {
      // Something went wrong in initialization.
      console.log('Error while Initializing: ' + err.toString());
    });
  });

})();