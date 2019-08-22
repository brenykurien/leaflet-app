import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-extra-markers';
import { LocationService } from '../location.service';
import { Feature, GeometryObject } from 'geojson';

@Component({
  selector: 'app-map-component',
  templateUrl: './map-component.component.html',
  styleUrls: ['./map-component.component.css']
})
export class MapComponentComponent implements OnInit {

  map: L.Map = null;
  stateNames: string[] = [];
  districtNames: string[] = [];
  stateLayers = {};
  districtLayers = {};
  allStateLayers = L.featureGroup();
  allDistrictLayers = L.featureGroup();
  addedDistrictLayer = L.featureGroup();
  removedStateLayer = L.featureGroup();
  minZoom = 4;
  zoomThresholdForFull = 7.3;
  zoomThresholdForState = 9;
  zoomThresholdForDistrict = 9.6;
  EsriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
  EsriWorldStreetMap =
    L.tileLayer(this.EsriUrl, {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
    });

  constructor(private locationService: LocationService) { }

  async ngOnInit() {
    await this.initialiseMap();
    await this.loadStatesOnMap();
    await this.loadDistrictsOnMap();
  }

  async initialiseMap() {

    const This = this;
    this.map = new L.Map('map', {
      maxZoom: 17,
      zoomDelta: 1,
      zoomSnap: 0.25,
      attributionControl: false,
    });

    this.EsriWorldStreetMap.addTo(this.map);

    this.map.setView([19.856093, 78.5571213], this.minZoom);
    this.map.options.minZoom = this.minZoom;
    const bounds = this.map.getBounds();
    this.map.setMaxBounds(bounds.pad(0.01));

    L.control.scale().addTo(this.map);

    this.map.on('zoomend', async (e) => {
      const currentZoom = This.map.getZoom();
      if (currentZoom <= This.zoomThresholdForFull) {
        // Show only states
        This.showStatesRemoveDistrictFromMap();
      } else if (currentZoom <= This.zoomThresholdForDistrict && currentZoom >= this.zoomThresholdForFull) {
        // Show only districts
      } else if (currentZoom >= This.zoomThresholdForDistrict) {
        // Show only places
      }
    });
  }

  showStatesRemoveDistrictFromMap() {
    if (this.addedDistrictLayer.getLayers().length === 0
      && this.removedStateLayer.getLayers().length === 0) {

    } else {
      this.removeLayerFromMap(this.addedDistrictLayer, this.map);
      this.addedDistrictLayer = L.featureGroup();
      this.addLayerToMap(this.removedStateLayer, this.map);
      this.removedStateLayer = L.featureGroup();
    }
  }

  async loadStatesOnMap() {
    const statesGeoJSON: any = await this.locationService.getStatesGeoJSON();
    statesGeoJSON.features.forEach(feature => {
      const properties = feature.properties;
      const stateName = properties.NAME_1;
      this.districtNames.push(stateName);
    });
    this.districtNames.forEach(stateName => {
      const statesLayer = new L.GeoJSON(statesGeoJSON, {
        filter: (feature: Feature<GeometryObject, any>) => {
          return feature.geometry.type === 'MultiPolygon' && feature.properties.NAME_1 === stateName;
        },
        style: (feature: Feature) => {
          return {
            weight: 1,
            color: '#000',
            dashArray: '3',
            fillColor: 'gray'
          };
        },
        onEachFeature: this.onEachFeature
      });
      this.stateLayers[stateName] = statesLayer;
      this.allStateLayers.addLayer(statesLayer);
    });
    const bounds = this.allStateLayers.getBounds();
    this.allStateLayers.addTo(this.map);
    this.map.fitBounds(bounds);
  }

  onEachFeature = (feature: Feature, layer) => {
    const This = this;
    const geometryType = feature.geometry.type;
    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      layer.on({
        mouseover: This.highlightFeature,
        mouseout: This.resetHighlight,
        click: This.zoomToFeature
      });
    }
  }

  highlightFeature = (e: L.LeafletEvent) => {
    const type1 = e.target.feature.properties.TYPE_1;
    const name1 = e.target.feature.properties.NAME_1;
    const type2 = e.target.feature.properties.TYPE_2;
    const name2 = e.target.feature.properties.NAME_2;
    if (type1 === 'State') {
      e.target.bindTooltip(name1, { direction: 'left' }).openTooltip();
    } else if (type2 === 'District') {
      e.target.bindTooltip(name2, { direction: 'left' }).openTooltip();
    }
    const areaSelected = e.target;
    areaSelected.setStyle({
      weight: 2,
      color: '#0000ff',
      dashArray: '',
      fillOpacity: 0.3
    });
  }

  resetHighlight = (e: L.LeafletEvent) => {
    const type1 = e.target.feature.properties.TYPE_1;
    const name1 = e.target.feature.properties.NAME_1;
    const type2 = e.target.feature.properties.TYPE_2;
    const name2 = e.target.feature.properties.NAME_2;
    if (type1 === 'State') {
      this.stateLayers[name1].resetStyle(e.target);
    } else if (type2 === 'District') {
      this.districtLayers[name2].resetStyle(e.target);
    }
  }

  async loadDistrictsOnMap() {
    const districtsGeoJSON: any = await this.locationService.getDistrictGeoJSON();
    districtsGeoJSON.features.forEach(feature => {
      const properties = feature.properties;
      const districtNames = properties.NAME_2;
      this.districtNames.push(districtNames);
    });
    this.districtNames.forEach(districtName => {
      const districtLayer = new L.GeoJSON(districtsGeoJSON, {
        filter: (feature: Feature<GeometryObject, any>) => {
          return feature.geometry.type === 'MultiPolygon' && feature.properties.NAME_1 === districtName;
        },
        style: (feature: Feature) => {
          return {
            weight: 1,
            color: '#000',
            dashArray: '3',
            fillColor: 'gray'
          };
        },
        onEachFeature: this.onEachFeature
      });
      this.districtLayers[districtName] = districtLayer;
      this.allDistrictLayers.addLayer(districtLayer);
    });
  }

  zoomToFeature = async (e: L.LeafletEvent) => {
    const layer = e.target;
    if (layer.feature) {
      const geometry = e.target.feature.geometry.type;
      if (geometry === 'Polygon' || geometry === 'MultiPolygon') {
        const type1 = e.target.feature.properties.TYPE_1;
        const stateName = e.target.feature.properties.NAME_1;
        const type2 = e.target.feature.properties.TYPE_2;
        const districtName = e.target.feature.properties.NAME_2;
        if (type1 === 'State') {
          this.showSelectedStateDistrictsOnMap(stateName, layer);
        } else if (type2 === 'District') {
          // Do nothing
        }
      }
    }
  }

  showSelectedStateDistrictsOnMap(stateName: string, stateLayer) {
    const districtLayers: any = this.allDistrictLayers.getLayers();
    districtLayers.map(districtLayer => {
      const layers = districtLayer._layers;
      for (const key in layers) {
        if (layers.hasOwnProperty(key)) {
          const stateNameFound = layers[key].feature.properties.NAME_1;
          if (stateNameFound === stateName) {
            this.addedDistrictLayer.addLayer(districtLayer);
          }
        }
      }
    });
    this.removeLayerFromMap(stateLayer, this.map);
    this.removedStateLayer.addLayer(stateLayer);
    this.addLayerToMap(this.addedDistrictLayer, this.map);
    const bounds = this.addedDistrictLayer.getBounds();
    this.map.fitBounds(bounds);
  }

  async removeLayerFromMap(layer, map) {
    if (map.hasLayer(layer)) {
      await map.removeLayer(layer);
    }
  }

  addLayerToMap(layer, map) {
    if (!map.hasLayer(layer)) {
      map.addLayer(layer);
    }
  }
}
