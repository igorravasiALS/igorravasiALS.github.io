'use strict';

/**
 * UINamespace Sample Extension
 *
 * This is the popup extension portion of the UINamespace sample, please see
 * uiNamespace.js in addition to this for context.  This extension is
 * responsible for collecting configuration settings from the user and communicating
 * that info back to the parent extension.
 *
 * This sample demonstrates two ways to do that:
 *   1) The suggested and most common method is to store the information
 *      via the settings namespace.  The parent can subscribe to notifications when
 *      the settings are updated, and collect the new info accordingly.
 *   2) The popup extension can receive and send a string payload via the open
 *      and close payloads of initializeDialogAsync and closeDialog methods.  This is useful
 *      for information that does not need to be persisted into settings.
 */

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
  /**
   * This extension collects the IDs of each datasource the user is interested in
   * and stores this information in settings when the popup is closed.
   */
  const datasourcesSettingsKey = 'selectedDatasources';
  const parametersSettingsKey = 'selectedParameter';
  const intervalSettingsKey = 'requestedInterval';
  const startupSettingsKey = 'doRefreshAtStartup';
  const authoringSettingsKey = 'doRefreshInAuthMode';
  let selectedDatasources = [];
  let selectedParameter = '';
  
  $(document).ready(function () {
    // The only difference between an extension in a dashboard and an extension
    // running in a popup is that the popup extension must use the method
    // initializeDialogAsync instead of initializeAsync for initialization.
    // This has no affect on the development of the extension but is used internally.
    tableau.extensions.initializeDialogAsync().then(function (openPayload) {
      // The openPayload sent from the parent extension in this sample is the
      // default time interval for the refreshes.  This could alternatively be stored
      // in settings, but is used in this sample to demonstrate open and close payloads.
      $('#interval').val(openPayload);
	  
	  const settings = tableau.extensions.settings.getAll();
	  if (!(undefined === settings.requestedInterval)) {
		$('#interval').val(settings.requestedInterval);
      }
	  
	  let bool_startupval = false;
	  if (!(undefined === settings.doRefreshAtStartup)) {
		if(settings.doRefreshAtStartup.toLowerCase() === "true"){
			bool_startupval = true;
		}
      }

	  $('#startup').prop('checked', bool_startupval);
	  
	  let bool_authval = false;
	  if (!(undefined === settings.doRefreshInAuthMode)) {
		if(settings.doRefreshInAuthMode.toLowerCase() === "true"){
			bool_authval = true;
		}
      }
	  
	  $('#authoring').prop('checked', bool_authval);
	  
	  if (!(undefined === settings.selectedParameter)) {
		selectedParameter = settings.selectedParameter;
      }
	  
      $('#closeButton').click(closeDialog);

      const dashboard = tableau.extensions.dashboardContent.dashboard;
      const visibleDatasources = [];
      selectedDatasources = parseSettingsForActiveDataSources();
	  
	  
      // Loop through datasources in this sheet and create a checkbox UI
      // element for each one.  The existing settings are used to
      // determine whether a datasource is checked by default or not.
      dashboard.worksheets.forEach(function (worksheet) {
        worksheet.getDataSourcesAsync().then(function (datasources) {
          datasources.forEach(function (datasource) {
            const isActive = selectedDatasources.indexOf(datasource.name) >= 0;

            if (visibleDatasources.indexOf(datasource.name) < 0) {
              addDataSourceItemToUI(datasource, isActive);
              visibleDatasources.push(datasource.name);
            }
          });
        });
      });
	  
	  
	  tableau.extensions.dashboardContent.dashboard.getParametersAsync().then(function (parameters) {
	    parameters.forEach(function (p) {
			  addParameterItemToUI(p, p.name === selectedParameter);
	    });
	  });
	  
    });
  });

  /**
   * Helper that parses the settings from the settings namesapce and
   * returns a list of IDs of the datasources that were previously
   * selected by the user.
   */
  function parseSettingsForActiveDataSources () {
    let activeDatasourceIdList = [];
    const settings = tableau.extensions.settings.getAll();
    if (settings.selectedDatasources) {
      activeDatasourceIdList = JSON.parse(settings.selectedDatasources);
    }

    return activeDatasourceIdList;
  }

  /**
   * Helper that updates the internal storage of datasource IDs
   * any time a datasource checkbox item is toggled.
   */
  function updateDatasourceList (id) {
    const idIndex = selectedDatasources.indexOf(id);
    if (idIndex < 0) {
      selectedDatasources.push(id);
    } else {
      selectedDatasources.splice(idIndex, 1);
    }
  }

  /**
   * UI helper that adds a checkbox item to the UI for a datasource.
   */
  function addDataSourceItemToUI (datasource, isActive) {
    const containerDiv = $('<div />');

    $('<input />', {
      type: 'checkbox',
      id: datasource.name,
      value: datasource.name,
      checked: isActive,
      click: function () {
        updateDatasourceList(datasource.name);
      }
    }).appendTo(containerDiv);

    $('<label />', {
      for: datasource.name,
      text: datasource.name
    }).appendTo(containerDiv);

    $('#datasources').append(containerDiv);
  }

  /**
   * UI helper that adds a checkbox item to the UI for a parameter.
   */
  function addParameterItemToUI (param, isActive) {
    const containerDiv = $('<div />');

    $('<input />', {
      type: 'radio',
      id: param.name,
      value: param.name,
	  name: parametersSettingsKey,
      checked: isActive
    }).appendTo(containerDiv);

    $('<label />', {
      for: param.name,
      text: param.name
    }).appendTo(containerDiv);

    $('#parameters').append(containerDiv);
  }
  
  /**
   * Stores the selected datasource IDs in the extension settings,
   * closes the dialog, and sends a payload back to the parent.
   */
  function closeDialog () {
    tableau.extensions.settings.set(datasourcesSettingsKey, JSON.stringify(selectedDatasources));
	tableau.extensions.settings.set(parametersSettingsKey, $("input[name='"+parametersSettingsKey+"']:checked").val());
	
	tableau.extensions.settings.set(intervalSettingsKey, $('#interval').val());
	tableau.extensions.settings.set(startupSettingsKey, $('#startup').prop('checked'));
	tableau.extensions.settings.set(authoringSettingsKey, $('#authoring').prop('checked'));
    tableau.extensions.settings.saveAsync().then((newSavedSettings) => {
      tableau.extensions.ui.closeDialog($('#interval').val());
    });
  }
})();
