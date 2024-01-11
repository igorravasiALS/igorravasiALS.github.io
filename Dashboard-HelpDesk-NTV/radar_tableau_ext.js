'use strict';
//TODO: Replace italian comments

(function () {
	$(document).ready(function () {
	
		tableau.extensions.initializeAsync().then(function () {
			
			const ws_agv_bar_id = 0;
			const ws_evo_bar_id = 1;
			const ds_datamapping_name = "datamapping";
			var wss = tableau.extensions.dashboardContent.dashboard.worksheets;
			var ws_agv_bar = wss[ws_agv_bar_id];
			var ws_evo_bar = wss[ws_evo_bar_id];
			
			//TODO: Replace with id search by sheet name    
			/*var ws_agv_bar = wss.find(function (sheet) {
				return sheet.name === "AGV_NAME_OF_SHEET";
			});*/
			
			var i, row;
			
			/*TODO: Check if it's possible to remove these declarations */
			var legend_options, color_data, row, color, d;

			// funzione per estrarre un array contenente le dimensioni per i poligoni
			function getLegend(data){
				var legend = [];
				
				for(i in data){
					legend[i]=data[i][2].formattedValue;
				}
				
				function onlyUnique(value, index, self) { 
					return self.indexOf(value) === index;
				}
				
				return legend.filter( onlyUnique )
			}
			  
			// funzione per estrarre un array contente lo stato di aggiornamento del dato per ogni treno
			function getColor(data){
				const legend_label_current = "Disp. corrente";
				row = [];
				
				for(i in data){
					if(data[i][2].formattedValue==legend_label_current){
						row.push({
							axis: data[i][3].value,
							value: data[i][0].value
						})
					}
				}
				
				function sortFunc(a, b) {
					if (a.axis > b.axis){
						return -1;
					} else {
						return 1;
					}
				}
				
				color = row.sort(sortFunc);
				return color;
			}
				
			// funzione per trasformare i dati in un array strutturato come serve alla funzione che disegna il radar
			function getBestData(data) {
				var legend_options = getLegend(data);
				var nicedata = [];
				
				function myfilt(row){
					return row[2].formattedValue == dim;
				}

				for(i=0; i< legend_options.length;i++){
					var dim = legend_options[i];
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
			function drawRadar(best_data, legend_labels, colors, html_id){
				/*TODO: Check if necessary to assign new names... or remove */
				var data, legend_options, color_data;
				data = best_data;
				color_data = colors;
				legend_options=legend_labels;	//TODO: Check if it's possible to remove it, it seems to be not used
				
				/* TODO:Remove, unused.
					var colorscale = d3.scale.ordinal().range(["#a8a8a8", "#265f95"]);
				*/
					
				
				var mycfg = {
					w: 240,
					h: 240,
					maxValue: 1,
					levels: 10,
					ExtraWidthX: 150,
					ExtraWidthY: 60,
					radius: 5,
					factor: 1,
					factorLegend: .85,
					radians: 2 * Math.PI,
					ToRight: 0,
					TranslateX: 60,
					TranslateY: 30,
					color: d3.scale.ordinal().range(["#a8a8a8", "#265f95"]),
					colordata: color_data
				}

				RadarChart.draw(html_id, data, mycfg);   
			}

			function drawARadar(ws, html_id){
				ws.getSummaryDataAsync().then(function (sumdata) {
					legend_options = getLegend(sumdata.data);
					color_data = getColor(sumdata.data);
					d = getBestData(sumdata.data);
					drawRadar(d, legend_options, color_data, html_id);
				});
			}
		
			// funzione che disegna tutti i radar
			function drawEveryRadar(){
				drawARadar(ws_agv_bar, "#chart-left");
				drawARadar(ws_evo_bar, "#chart-right");
			}
			
			
			function getWssNames(wss){
				var names = [];
				for(i = 0; i < wss.length; i++){
					names.push("worksheet[" + i + "]: " + wss[i].name);
				}
				return names;
			}

			function debugAppendHeader(where){
				const label_node = document.createElement("h2");
				const label_val = document.createTextNode("Info");
				label_node.appendChild(label_val);
				where.appendChild(label_node);
				
				const text_node = document.createElement("p");
				var text_val = document.createTextNode("Come comportamento di default verranno stampate le proprietà di tutti i capi/colonne di tutti i worksheet. Per limitare a un solo worksheet aggiungere al nodo HTML TABLEAU-API-DEBUG l'attributo 'only-sheet=\"x\"' dove x è l'id del worksheet di cui si vogliono ottenere le info sui campi");
				text_node.appendChild(text_val);
				where.appendChild(text_node);
				
			}	

			function appendList(where, label, items){
				const label_node = document.createElement("h2");
				const label_val = document.createTextNode(label);
				label_node.appendChild(label_val);
				where.appendChild(label_node);
				const name_list = document.createElement("ul");
				for(i = 0; i < items.length; i++) {
					var li = document.createElement("li");
					var val = document.createTextNode(items[i]);
					li.appendChild(val);
					name_list.appendChild(li);
				}
				where.appendChild(name_list);
			}	

			function debugAppendWsFields(where, label, ws){
				ws.getSummaryDataAsync().then(function (sum_data) {
					var columns = sum_data.columns;
					var column_names = [];
					for(i = 0; i < columns.length; i++){
						column_names.push("column[" + i + "] has type {" + columns[i].dataType + "} and name: " + columns[i].fieldName);
					}
					appendList(debug_element, label, column_names);
				});
			}

			function debugAppendWssFields(where, wss, id){
				for(i = 0; i < wss.length; i++){
					if(id < 0 || id == i) {
						debugAppendWsFields(where, "Field names in worksheet " + wss[i].name + ":", wss[i]);	
					}
				}
			}

			var debug_element = document.getElementById("TABLEAU-API-DEBUG");	
			if(debug_element != null){
				debugAppendHeader(debug_element);
				var wss = tableau.extensions.dashboardContent.dashboard.worksheets;
				appendList(debug_element, "worksheet names:", getWssNames(wss));
				var sheet_id = debug_element.getAttribute("only-sheet");
				if(sheet_id == null || sheet_id >= wss.length){
					sheet_id = -1;
				}
				debugAppendWssFields(debug_element, wss, sheet_id);
				
			}

			// lancia un refresh del datasource
			tableau.extensions.dashboardContent.dashboard.worksheets[ws_agv_bar_id].getDataSourcesAsync().then(datasources =>
				{var dataSource = datasources.find(datasource => datasource.name === ds_datamapping_name);
					return dataSource.refreshAsync();
				});
				

			// deselezionano eventuali barre selezionate durante la navigazione
			ws_agv_bar.selectMarksByValueAsync([{fieldName: 'Flotta', value: ''}], 'select-replace');
			ws_evo_bar.selectMarksByValueAsync([{fieldName: 'Flotta', value: ''}], 'select-replace');
			  
			// disegna i radar una prima volta
			drawEveryRadar();
			  
			// aggiungono event listener al parametro per il periodo precedente, ai grafici a barre e al filtro servizio. 
			// Questi event listener disegnano entrambi i radar.
			tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(function (parameters) {
				parameters.forEach(function (p) {
					p.addEventListener(tableau.TableauEventType.ParameterChanged, drawEveryRadar);
				});
			});
			
			ws_evo_bar.addEventListener(tableau.TableauEventType.MarkSelectionChanged, drawEveryRadar);
			ws_agv_bar.addEventListener(tableau.TableauEventType.MarkSelectionChanged, drawEveryRadar);
			
			// schedula il refresh del datasource e l'aggiornamento dei disegni radar ogni 2 minuti
			var timerID = setInterval(function() {
				tableau.extensions.dashboardContent.dashboard.worksheets[ws_agv_bar_id].getDataSourcesAsync().then(datasources =>
					{var dataSource = datasources.find(datasource => datasource.name === ds_datamapping_name);
						return dataSource.refreshAsync();
					});
				drawEveryRadar();
			}, 120 * 1000); 
				
		}, function (err) {
			// Something went wrong in initialization.
			console.log('Error while Initializing: ' + err.toString());
		});
  });

})();
