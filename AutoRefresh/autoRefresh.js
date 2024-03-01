'use strict';

/**
 * UINamespace Sample Extension
 *
 * This sample extension demonstrates how to use the UI namespace
 * to create a popup dialog with additional UI that the user can interact with.
 * The content in this dialog is actually an extension as well (see the
 * uiNamespaceDialog.js for details).
 *
 * This sample is an extension that auto refreshes datasources in the background of
 * a dashboard.  The extension has little need to take up much dashboard space, except
 * when the user needs to adjust settings, so the UI namespace is used for that.
 */

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
  const defaultIntervalInMin = '2';
  const checkIntervalSecs = 10;
  var intervalInMin = defaultIntervalInMin;
  let activeDatasourceIdList = [];
  let activeParameterName = '';
  var timer_refresh = undefined;
  let refresh_enabled = false;
  let last_refresh = new Date();
  
  $(document).ready(function () {
    // When initializing an extension, an optional object is passed that maps a special ID (which
    // must be 'configure') to a function.  This, in conjuction with adding the correct context menu
    // item to the manifest, will add a new "Configure..." context menu item to the zone of extension
    // inside a dashboard.  When that context menu item is clicked by the user, the function passed
    // here will be executed.
    tableau.extensions.initializeAsync({ configure: configure }).then(function () {
      // This event allows for the parent extension and popup extension to keep their
      // settings in sync.  This event will be triggered any time a setting is
      // changed for this extension, in the parent or popup (i.e. when settings.saveAsync is called).
	  const settings = tableau.extensions.settings.getAll();
	  updateExtensionBasedOnSettings(settings);
	  
	  setupRefreshInterval();
	  if (!(undefined === settings.doRefreshAtStartup)) {
		  if(settings.doRefreshAtStartup.toLowerCase()==="true"){
			  console.log("Startup Refresh @ " + new Date().toISOString());
			  doRefresh();
		  }
	  }	  
	  
      tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, (settingsEvent) => {
        updateExtensionBasedOnSettings(settingsEvent.newSettings);
      });
    });
  });

  function configure () {
    // This uses the window.location.origin property to retrieve the scheme, hostname, and
    // port where the parent extension is currently running, so this string doesn't have
    // to be updated if the extension is deployed to a new location.
	const parentUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
	const popupUrl = `${parentUrl}/autoRefreshDialog.html`;

    // This checks for the selected dialog style in the radio form.
    const dialogStyle = tableau.DialogStyle.Modal;
    

    /**
     * This is the API call that actually displays the popup extension to the user.  The
     * popup is always a modal dialog.  The only required parameter is the URL of the popup,
     * which must be the same domain, port, and scheme as the parent extension.
     *
     * The developer can optionally control the initial size of the extension by passing in
     * an object with height and width properties.  The developer can also pass a string as the
     * 'initial' payload to the popup extension.  This payload is made available immediately to
     * the popup extension.  In this example, the value '5' is passed, which will serve as the
     * default interval of refresh.
     */
    tableau.extensions.ui
      .displayDialogAsync(popupUrl, defaultIntervalInMin, { height: 500, width: 500, dialogStyle })
      .then((closePayload) => {
        // The promise is resolved when the dialog has been expectedly closed, meaning that
        // the popup extension has called tableau.extensions.ui.closeDialog.

        // The close payload is returned from the popup extension via the closeDialog method.
        intervalInMin = closePayload;
      })
      .catch((error) => {
        // One expected error condition is when the popup is closed by the user (meaning the user
        // clicks the 'X' in the top right of the dialog).  This can be checked for like so:
        switch (error.errorCode) {
          case tableau.ErrorCodes.DialogClosedByUser:
            console.log("Dialog was closed by user");
            break;
          default:
            console.error(error.message);
        }
      });
  }

	function warnOtherExtensions() {
		const dashboard = tableau.extensions.dashboardContent.dashboard;
		dashboard.getParametersAsync().then(function (parameters) {
			parameters.forEach(function (p) {
				if(p.name === activeParameterName) {
					console.log("Triggering value change of parameter " + p.name + " @ " + new Date().toISOString());
					p.changeValueAsync(last_refresh.toISOString());
				}
			});
		});
	}

	function doRefresh() {
      if(!refresh_enabled){
		  return;
	  }
	  console.log("Doing refresh @ " + new Date().toISOString());
      const dashboard = tableau.extensions.dashboardContent.dashboard;
	  let ds_to_refresh = [];
	  let ds_name_to_refresh = [];
	  		

      dashboard.worksheets.forEach(function (worksheet) {
        worksheet.getDataSourcesAsync().then(function (datasources) {
		  
          datasources.forEach(function (datasource) {
            if (activeDatasourceIdList.indexOf(datasource.name) >= 0 && ds_name_to_refresh.indexOf(datasource.name) < 0) {
				ds_to_refresh.push(datasource);
				ds_name_to_refresh.push(datasource.name);
				datasource.refreshAsync().then(function (){
					last_refresh = new Date();
					console.log("Refreshed " + datasource.name + " @ " + last_refresh.toISOString());
					warnOtherExtensions();
				});
            }
          });

		  
        });
      });
	  	  

    }

	function checkManualRefreshed(){
		return false;
	}

	function checkRefresh() {
		if(!refresh_enabled){
			return;
		}
		
		let t_now = new Date();
		if( (t_now - last_refresh)  > (intervalInMin * 1000 * 60 - checkIntervalSecs * 1000) ){
			last_refresh = new Date();	//Avoid to trigger again the refresh at next checks, at least for one interval
			doRefresh();
		} else if (checkManualRefreshed()) {
			last_refresh = new Date();
			doRefresh();
		}

    }

  /**
   * This function sets up a JavaScript interval based on the time interval selected
   * by the user.  This interval will refresh all selected datasources.
   */
  function setupRefreshInterval () {
	  //TODO: Remove log
	console.log("Setting refresh rate (min) = " + intervalInMin);
    if(timer_refresh){
		clearInterval(timer_refresh);
	}
	timer_refresh = setInterval(checkRefresh, checkIntervalSecs * 1000);
  }

  /**
   * Helper that is called to set state anytime the settings are changed.
   */
  function updateExtensionBasedOnSettings (settings) {
	if (settings.selectedDatasources) {
		activeDatasourceIdList = JSON.parse(settings.selectedDatasources);
	}
	if(settings.requestedInterval){
		intervalInMin = settings.requestedInterval;
	}
	if (settings.selectedParameter) {
		activeParameterName = settings.selectedParameter;
	}
	  
	if(tableau.extensions.environment.mode.toLowerCase() === "authoring"){
		if (!(undefined === settings.doRefreshInAuthMode)) {
			if(settings.doRefreshInAuthMode.toLowerCase()==="true"){
				console.log("Auth mode enabled");
				refresh_enabled = true;
			} else {
				refresh_enabled = false;
			}
		}	  
	} else {
		refresh_enabled = true;
	}
  }
})();
