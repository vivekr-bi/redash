import _ from 'lodash';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatSimpleTemplate } from '@/lib/value-format';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';
import ColorPalette from '@/visualizations/ColorPalette';

import {
  AdditionalColors,
  darkenColor,
  createNumberFormatter,
  prepareData,
  getValueForFeature,
  createScale,
  prepareFeatureProperties,
  getColorByValue,
  inferCountryCodeType,
} from './utils';

import template from './choropleth.html';
import editorTemplate from './choropleth-editor.html';

import countriesDataUrl from './countries.geo.json';
import subdivJapanDataUrl from './japan.prefectures.geo.json';
import stateIndiaDataUrl from './india.state.geo.json';

import chandigarhIndiaDataUrl from './india_chandigarh.geojson';
import dadraNagarIndiaDataUrl from './india_dadra_and_nagar_have.geojson';
import delhiIndiaDataUrl from './india_delhi.geojson';
import puducherryIndiaDataUrl from './india_puducherry.geojson';
import goaIndiaDataUrl from './india_goa.geojson';
import damanDiuIndiaDataUrl from './india_daman_and_diu.geojson';
import sikkimIndiaDataUrl from './india_sikkim.geojson';
import tripuraIndiaDataUrl from './india_tripura.geojson';
import meghalayaIndiaDataUrl from './india_meghalaya.geojson';
import lakshadweepIndiaDataUrl from './india_lakshadweep.geojson';
import nagalandIndiaDataUrl from './india_nagaland.geojson';
import manipurIndiaDataUrl from './india_manipur.geojson';
import mizoramIndiaDataUrl from './india_mizoram.geojson';
import himachalPradeshIndiaDataUrl from './india_himachal_pradesh.geojson';
import arunachalPradeshIndiaDataUrl from './india_arunachal_pradesh.geojson';
import telanganaIndiaDataUrl from './india_telangana.geojson';
import haryanaIndiaDataUrl from './india_haryana.geojson';
import keralaIndiaDataUrl from './india_kerala.geojson';
import uttarakhandIndiaDataUrl from './india_uttarakhand.geojson';
import punjabIndiaDataUrl from './india_punjab.geojson';
import jammuKashmirIndiaDataUrl from './india_jammu_and_kashmir.geojson';
import andhraPradeshIndiaDataUrl from './india_andhra_pradesh.geojson';
import jharkhandIndiaDataUrl from './india_jharkhand.geojson';
import chhattisgarhIndiaDataUrl from './india_chhattisgarh.geojson';
import assamIndiaDataUrl from './india_assam.geojson';
import biharIndiaDataUrl from './india_bihar.geojson';
import odishaIndiaDataUrl from './india_odisha.geojson';
import karnatakaIndiaDataUrl from './india_karnataka.geojson';
import tamilNaduIndiaDataUrl from './india_tamil_nadu.geojson';
import rajasthanIndiaDataUrl from './india_rajasthan.geojson';
import maharashtraIndiaDataUrl from './india_maharashtra.geojson';
import uttarPradeshIndiaDataUrl from './india_uttar_pradesh.geojson';
import madhyaPradeshIndiaDataUrl from './india_madhya_pradesh.geojson';
import andamanNicobarIndiaDataUrl from './india_andaman_and_nicobar.geojson';
import westBengalIndiaDataUrl from './india_west_bengal.geojson';
import gujaratIndiaDataUrl from './india_gujarat.geojson';

export const ChoroplethPalette = _.extend({}, AdditionalColors, ColorPalette);

const DEFAULT_OPTIONS = {
  mapType: 'countries',
  countryCodeColumn: '',
  countryCodeType: 'iso_a3',
  valueColumn: '',
  clusteringMode: 'e',
  steps: 5,
  valueFormat: '0,0.00',
  noValuePlaceholder: 'N/A',
  colors: {
    min: ChoroplethPalette['Light Blue'],
    max: ChoroplethPalette['Dark Blue'],
    background: ChoroplethPalette.White,
    borders: ChoroplethPalette.White,
    noValue: ChoroplethPalette['Light Gray'],
  },
  legend: {
    visible: true,
    position: 'bottom-left',
    alignText: 'right',
  },
  tooltip: {
    enabled: true,
    template: '<b>{{ @@name }}</b>: {{ @@value }}',
  },
  popup: {
    enabled: true,
    template: 'Country: <b>{{ @@name_long }} ({{ @@iso_a2 }})</b>\n<br>\nValue: <b>{{ @@value }}</b>',
  },
};

const loadCountriesData = _.bind(function loadCountriesData($http, url) {
  if (!this[url]) {
    this[url] = $http.get(url).then(response => response.data);
  }
  return this[url];
}, {});

const ChoroplethRenderer = {
  template,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope, $element, $sanitize, $http) {
    let countriesData = null;
    let map = null;
    let choropleth = null;
    let mapMoveLock = false;

    const onMapMoveStart = () => {
      mapMoveLock = true;
    };

    const onMapMoveEnd = () => {
      const bounds = map.getBounds();
      this.options.bounds = [
        [bounds._southWest.lat, bounds._southWest.lng],
        [bounds._northEast.lat, bounds._northEast.lng],
      ];
      if (this.onOptionsChange) {
        this.onOptionsChange(this.options);
      }
      $scope.$applyAsync(() => {
        mapMoveLock = false;
      });
    };

    const updateBounds = ({ disableAnimation = false } = {}) => {
      if (mapMoveLock) {
        return;
      }
      if (map && choropleth) {
        const bounds = this.options.bounds || choropleth.getBounds();
        const options = disableAnimation ? {
          animate: false,
          duration: 0,
        } : null;
        map.fitBounds(bounds, options);
      }
    };

    const getDataUrl = (type) => {
      switch (type) {
        case 'countries': return countriesDataUrl;
        case 'subdiv_japan': return subdivJapanDataUrl;
        case 'state_india': return stateIndiaDataUrl;
        case 'chandigarh_india': return chandigarhIndiaDataUrl;
        case 'dadraNagar_india': return dadraNagarIndiaDataUrl;
        case 'delhi_india': return delhiIndiaDataUrl;
        case 'puducherry_india': return puducherryIndiaDataUrl;
        case 'goa_india': return goaIndiaDataUrl;
        case 'damanDiu_india': return damanDiuIndiaDataUrl;
        case 'sikkim_india': return sikkimIndiaDataUrl;
        case 'tripura_india': return tripuraIndiaDataUrl;
        case 'meghalaya_india': return meghalayaIndiaDataUrl;
        case 'lakshadweep_india': return lakshadweepIndiaDataUrl;
        case 'nagaland_india': return nagalandIndiaDataUrl;
        case 'manipur_india': return manipurIndiaDataUrl;
        case 'mizoram_india': return mizoramIndiaDataUrl;
        case 'himachalPradesh_india': return himachalPradeshIndiaDataUrl;
        case 'arunachalPradesh_india': return arunachalPradeshIndiaDataUrl;
        case 'telangana_india': return telanganaIndiaDataUrl;
        case 'haryana_india': return haryanaIndiaDataUrl;
        case 'kerala_india': return keralaIndiaDataUrl;
        case 'uttarakhand_india': return uttarakhandIndiaDataUrl;
        case 'punjab_india': return punjabIndiaDataUrl;
        case 'jammuKashmir_india': return jammuKashmirIndiaDataUrl;
        case 'andhraPradesh_india': return andhraPradeshIndiaDataUrl;
        case 'jharkhand_india': return jharkhandIndiaDataUrl;
        case 'chhattisgarh_india': return chhattisgarhIndiaDataUrl;
        case 'assam_india': return assamIndiaDataUrl;
        case 'bihar_india': return biharIndiaDataUrl;
        case 'odisha_india': return odishaIndiaDataUrl;
        case 'karnataka_india': return karnatakaIndiaDataUrl;
        case 'tamilNadu_india': return tamilNaduIndiaDataUrl;
        case 'rajasthan_india': return rajasthanIndiaDataUrl;
        case 'maharashtra_india': return maharashtraIndiaDataUrl;
        case 'uttarPradesh_india': return uttarPradeshIndiaDataUrl;
        case 'madhyaPradesh_india': return madhyaPradeshIndiaDataUrl;
        case 'andamanNicobar_india': return andamanNicobarIndiaDataUrl;
        case 'westBengal_india': return westBengalIndiaDataUrl;
        case 'gujarat_india': return gujaratIndiaDataUrl;
        default: return '';
      }
    };

    let dataUrl = getDataUrl(this.options.mapType);

    const render = () => {
      if (map) {
        map.remove();
        map = null;
        choropleth = null;
      }
      if (!countriesData) {
        return;
      }

      this.formatValue = createNumberFormatter(
        this.options.valueFormat,
        this.options.noValuePlaceholder,
      );

      const data = prepareData(this.data.rows, this.options.countryCodeColumn, this.options.valueColumn);

      const { limits, colors, legend } = createScale(countriesData.features, data, this.options);

      // Update data for legend block
      this.legendItems = legend;

      choropleth = L.geoJson(countriesData, {
        onEachFeature: (feature, layer) => {
          const value = getValueForFeature(feature, data, this.options.countryCodeType);
          const valueFormatted = this.formatValue(value);
          const featureData = prepareFeatureProperties(
            feature,
            valueFormatted,
            data,
            this.options.countryCodeType,
          );
          const color = getColorByValue(value, limits, colors, this.options.colors.noValue);

          layer.setStyle({
            color: this.options.colors.borders,
            weight: 1,
            fillColor: color,
            fillOpacity: 1,
          });

          if (this.options.tooltip.enabled) {
            layer.bindTooltip($sanitize(formatSimpleTemplate(
              this.options.tooltip.template,
              featureData,
            )), { sticky: true });
          }

          if (this.options.popup.enabled) {
            layer.bindPopup($sanitize(formatSimpleTemplate(
              this.options.popup.template,
              featureData,
            )));
          }

          layer.on('mouseover', () => {
            layer.setStyle({
              weight: 2,
              fillColor: darkenColor(color),
            });
          });
          layer.on('mouseout', () => {
            layer.setStyle({
              weight: 1,
              fillColor: color,
            });
          });
        },
      });

      const choroplethBounds = choropleth.getBounds();

      map = L.map($element[0].children[0].children[0], {
        center: choroplethBounds.getCenter(),
        zoom: 1,
        zoomSnap: 0,
        layers: [choropleth],
        scrollWheelZoom: false,
        maxBounds: choroplethBounds,
        maxBoundsViscosity: 1,
        attributionControl: false,
        fullscreenControl: true,
      });

      map.on('focus', () => {
        map.on('movestart', onMapMoveStart);
        map.on('moveend', onMapMoveEnd);
      });
      map.on('blur', () => {
        map.off('movestart', onMapMoveStart);
        map.off('moveend', onMapMoveEnd);
      });

      updateBounds({ disableAnimation: true });
    };

    const load = () => {
      loadCountriesData($http, dataUrl).then((data) => {
        if (_.isObject(data)) {
          countriesData = data;
          render();
        }
      });
    };

    load();


    $scope.handleResize = _.debounce(() => {
      if (map) {
        map.invalidateSize(false);
        updateBounds({ disableAnimation: true });
      }
    }, 50);

    $scope.$watch('$ctrl.data', render);
    $scope.$watch(() => _.omit(this.options, 'bounds', 'mapType'), render, true);
    $scope.$watch('$ctrl.options.bounds', updateBounds, true);
    $scope.$watch('$ctrl.options.mapType', () => {
      dataUrl = getDataUrl(this.options.mapType);
      load();
    }, true);
  },
};

const ChoroplethEditor = {
  template: editorTemplate,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    this.currentTab = 'general';
    this.setCurrentTab = (tab) => {
      this.currentTab = tab;
    };

    this.colors = ChoroplethPalette;

    this.mapTypes = {
      countries: 'Countries',
      subdiv_japan: 'Japan/Prefectures',
      state_india: 'India/States',
      chandigarh_india: 'India/chandigarh',
      dadraNagar_india: 'India/dadraNagar',
      delhi_india: 'India/delhi',
      puducherry_india: 'India/puducherry',
      goa_india: 'India/goa',
      damanDiu_india: 'India/damanDiu',
      sikkim_india: 'India/sikkim',
      tripura_india: 'India/tripura',
      meghalaya_india: 'India/meghalaya',
      lakshadweep_india: 'India/lakshadweep',
      nagaland_india: 'India/nagaland',
      manipur_india: 'India/manipur',
      mizoram_india: 'India/mizoram',
      himachalPradesh_india: 'India/himachalPradesh',
      arunachalPradesh_india: 'India/arunachalPradesh',
      telangana_india: 'India/telangana',
      haryana_india: 'India/haryana',
      kerala_india: 'India/kerala',
      uttarakhand_india: 'India/uttarakhand',
      punjab_india: 'India/punjab',
      jammuKashmir_india: 'India/jammuKashmir',
      andhraPradesh_india: 'India/andhraPradesh',
      jharkhand_india: 'India/jharkhand',
      chhattisgarh_india: 'India/chhattisgarh',
      assam_india: 'India/assam',
      bihar_india: 'India/bihar',
      odisha_india: 'India/odisha',
      karnataka_india: 'India/karnataka',
      tamilNadu_india: 'India/tamilNadu',
      rajasthan_india: 'India/rajasthan',
      maharashtra_india: 'India/maharashtra',
      uttarPradesh_india: 'India/uttarPradesh',
      madhyaPradesh_india: 'India/madhyaPradesh',
      andamanNicobar_india: 'India/andamanNicobar',
      westBengal_india: 'India/westBengal',
      gujarat_india: 'India/gujarat',
    };

    this.clusteringModes = {
      q: 'quantile',
      e: 'equidistant',
      k: 'k-means',
    };

    this.legendPositions = {
      'top-left': 'top / left',
      'top-right': 'top / right',
      'bottom-left': 'bottom / left',
      'bottom-right': 'bottom / right',
    };

    this.countryCodeTypes = {};

    this.templateHintFormatter = propDescription => `
      <div class="p-b-5">All query result columns can be referenced using <code>{{ column_name }}</code> syntax.</div>
      <div class="p-b-5">Use special names to access additional properties:</div>
      <div><code>{{ @@value }}</code> formatted value;</div>
      ${propDescription}
      <div class="p-t-5">This syntax is applicable to tooltip and popup templates.</div>
    `;

    const updateCountryCodeType = () => {
      this.options.countryCodeType = inferCountryCodeType(
        this.options.mapType,
        this.data ? this.data.rows : [],
        this.options.countryCodeColumn,
      ) || this.options.countryCodeType;
    };

    const populateCountryCodeTypes = () => {
      let propDescription = '';
      switch (this.options.mapType) {
        case 'subdiv_japan':
          propDescription = `
            <div><code>{{ @@name }}</code> Prefecture name in English;</div>
            <div><code>{{ @@name_local }}</code> Prefecture name in Kanji;</div>
            <div><code>{{ @@iso_3166_2 }}</code> five-letter ISO subdivision code (JP-xx);</div>
          `;
          this.countryCodeTypes = {
            name: 'Name',
            name_local: 'Name (local)',
            iso_3166_2: 'ISO-3166-2',
          };
          break;
        case 'state_india':
          propDescription = `
            <div><code>{{ @@name }}</code> State name in English;</div>
            <div><code>{{ @@id }}</code> Id (1-37);</div>
          `;
          this.countryCodeTypes = {
            name: 'Name',
            district_india: 'Id (1-37)',
          };
          break;
        case ((/^[a-zA-Z]+_india$/).test(this.options.mapType)):
          propDescription = `
            <div><code>{{ @@name }}</code> District name in English;</div>
            <div><code>{{ @@id }}</code> Id (1-732);</div>
          `;
          this.countryCodeTypes = {
            name: 'Name',
            id: 'Id (1-732)',
          };
          break;
        case 'countries':
          propDescription = `
           <div><code>{{ @@name }}</code> short country name;</div>
             <div><code>{{ @@name_long }}</code> full country name;</div>
             <div><code>{{ @@abbrev }}</code> abbreviated country name;</div>
             <div><code>{{ @@iso_a2 }}</code> two-letter ISO country code;</div>
             <div><code>{{ @@iso_a3 }}</code> three-letter ISO country code;</div>
             <div><code>{{ @@iso_n3 }}</code> three-digit ISO country code.</div>
          `;
          this.countryCodeTypes = {
            name: 'Short name',
            name_long: 'Full name',
            abbrev: 'Abbreviated name',
            iso_a2: 'ISO code (2 letters)',
            iso_a3: 'ISO code (3 letters)',
            iso_n3: 'ISO code (3 digits)',
          };
          break;
        default:
          this.countryCodeTypes = {};
      }
      this.templateHint = this.templateHintFormatter(propDescription);
    };

    $scope.$watch('$ctrl.options.mapType', populateCountryCodeTypes);
    $scope.$watch('$ctrl.options.countryCodeColumn', updateCountryCodeType);
    $scope.$watch('$ctrl.data', updateCountryCodeType);

    $scope.$watch('$ctrl.options', (options) => {
      this.onOptionsChange(options);
    }, true);
  },
};

export default function init(ngModule) {
  ngModule.component('choroplethRenderer', ChoroplethRenderer);
  ngModule.component('choroplethEditor', ChoroplethEditor);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'CHOROPLETH',
      name: 'Map (Choropleth)',
      getOptions: options => _.merge({}, DEFAULT_OPTIONS, options),
      Renderer: angular2react('choroplethRenderer', ChoroplethRenderer, $injector),
      Editor: angular2react('choroplethEditor', ChoroplethEditor, $injector),

      defaultColumns: 3,
      defaultRows: 8,
      minColumns: 2,
    });
  });
}

init.init = true;
