'use strict';

(function () {
  $(document).ready(function () {
	
    tableau.extensions.initializeAsync().then(function () {
		  
		   // prendo i workbook che servono, nell'ordine: grafico a barre AGV, grafico a barre EVO, filtro servizio
		  var worksheet = tableau.extensions.dashboardContent.dashboard.worksheets[0];
		  var worksheet1 = tableau.extensions.dashboardContent.dashboard.worksheets[1];
		  var worksheet2 = tableau.extensions.dashboardContent.dashboard.worksheets[2];
		  var i, LegendOptions, colordata, row, color, d;
		  
		  // funzione per estrarre un array contenente le dimensioni per i poligoni
		  function getLegend(data){
			var legend = [];
			for(i in data) legend[i]=data[i][2].formattedValue;
	
					function onlyUnique(value, index, self) { 
						return self.indexOf(value) === index;
					}

			return legend.filter( onlyUnique )
			}

		  // funzione per estrarre un array contente lo stato di aggiornamento del dato per ogni treno			
		  function getColor(data){
			row = [];
			for(i in data){
				if(data[i][2].formattedValue=="Disp. corrente"){
					row.push({
					axis: data[i][3].value,
					value: data[i][0].value
					})
				}
			}
			function sortFunc(a, b) {
				if (a.axis > b.axis)  return -1;
				else return 1;
				}
	
			color = row.sort(sortFunc);
			return color;
			}
			
		  // funzione per trasformare i dati in un JSON strutturato come serve alla funzione che disegna il radar
		  function getBestData(data){
			var LegendOptions = getLegend(data);
			var nicedata = [];

			function myfilt(row){
				return row[2].formattedValue == dim;
				}

			for(i=0; i< LegendOptions.length;i++){
				var dim = LegendOptions[i];
				nicedata[i]=data.filter( myfilt );
				}
			
			var bestdata = [];
			var test,c;

			for (i in nicedata) {
				row = [];
				for(c in nicedata[i]){
        
					if(nicedata[i][c][6].value == '%null%') {
			
						test = parseFloat(nicedata[i][c][5].value)
					
					} else {
						test = parseFloat(nicedata[i][c][6].value)
						}
				row.push({
					axis: nicedata[i][c][3].value,
					value: test
				})
        
				bestdata[i]=row;		
				}
			}

			function sortFunc(a, b) {
				if (a.axis > b.axis)  return -1;
				else return 1;
			}
	
			for(i in bestdata){
				bestdata[i]=bestdata[i].sort(sortFunc);
			}
			
			return bestdata;
			}

		  // funzione che disegna il radar, qui si possono cambiare alcuni parametri come larghezza e altezza
		  function drawRadar(a, b, c, tag){
			  
			  var d, LegendOptions, colordata;
			  d=a;
			  colordata = c;
			  LegendOptions=b;
			  var w = 350,h = 350;
			  var colorscale = d3.scale.ordinal().range(["#a8a8a8", "#265f95"]);
			  
			  var mycfg = {
				  w: w,
				  h: h,
				  maxValue: 1,
				  levels: 10,
				  ExtraWidthX: 150,
				  ExtraWidthY: 100,
				  radius: 5,
				  factor: 1,
			      factorLegend: .90,
				  radians: 2 * Math.PI,
				  ToRight: 0,
				  TranslateX: 80,
				  TranslateY: 30,
				  color: d3.scale.ordinal().range(["#a8a8a8", "#265f95"]),
				  colordata: colordata
				  }
				  
			   RadarChart.draw(tag, d, mycfg);   
			}
		  
		  // funzione che estrae i dati dal grafico a barre AGV e disegna il radar corrispondente
		  function output(){
			  
			    worksheet.getSummaryDataAsync().then(function (sumdata) {
				LegendOptions = getLegend(sumdata.data);
				colordata = getColor(sumdata.data);
				d = getBestData(sumdata.data);
				drawRadar(d, LegendOptions, colordata, "#chart");
				});
			  
		  }

		  // funzione che estrae i dati dal grafico a barre EVO e disegna il radar corrispondente
		  function output1(){
			  
			    worksheet1.getSummaryDataAsync().then(function (sumdata) {
				LegendOptions = getLegend(sumdata.data);
				colordata = getColor(sumdata.data);
				d = getBestData(sumdata.data);
				drawRadar(d, LegendOptions, colordata, "#chart1");
				});
			  
		  }		
		  
		  // funzione che disegna entrambi i radar
		  function output_all(){
			output();
		    output1();
		  }

		  // lancia un refresh del datasource
		  tableau.extensions.dashboardContent.dashboard.worksheets[0].getDataSourcesAsync().then(datasources =>
				{var dataSource = datasources.find(datasource => datasource.name === "datamapping");
					return dataSource.refreshAsync();
				});
				

		  // deselezionano eventuali barre selezionate durante la navigazione
		  worksheet.selectMarksByValueAsync([{fieldName: 'Flotta', value: ''}], 'select-replace');
		  worksheet1.selectMarksByValueAsync([{fieldName: 'Flotta', value: ''}], 'select-replace');
		  
		  // disegna entrambi i radar
		  output_all();
		  
		  // aggiungono event listener al parametro per il periodo precedente, ai grafici a barre e al filtro servizio. 
		  // Questi event listener disegnano entrambi i radar.
		  tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(function (parameters) {
			parameters.forEach(function (p) {
			  p.addEventListener(tableau.TableauEventType.ParameterChanged, output_all);
			});
		  });
		  worksheet2.addEventListener(tableau.TableauEventType.MarkSelectionChanged, output_all);
		  worksheet1.addEventListener(tableau.TableauEventType.MarkSelectionChanged, output_all);
		  worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, output_all);

		  // schedula il refresh del datasource e l'aggiornamento dei radar ogni 2 minuti
		  var timerID = setInterval(function() {
				  tableau.extensions.dashboardContent.dashboard.worksheets[0].getDataSourcesAsync().then(datasources =>
							{var dataSource = datasources.find(datasource => datasource.name === "datamapping");
								return dataSource.refreshAsync();
							});
				  output_all();
				}, 120 * 1000);
				
	  
    }, function (err) {
      // Something went wrong in initialization.
      console.log('Error while Initializing: ' + err.toString());
    });
  });

})();

